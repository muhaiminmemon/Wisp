// background.js

// Screen time tracking variables
let activeTab = null;
let startTime = null;
let screenTimeData = {};
let lastActiveTimes = {}; // Track individual tab activity times

function updateScreenTime() {
  if (activeTab && startTime) {
    const now = Date.now();
    const duration = Math.floor((now - startTime) / 1000); // duration in seconds
    
    // Only count time if it's reasonable (less than 5 minutes of inactivity)
    if (duration > 0 && duration < 300) {
      const key = `${activeTab.url}|${activeTab.title}`;
      screenTimeData[key] = (screenTimeData[key] || 0) + duration;
      console.log('Updated screen time:', key, screenTimeData[key]);
      
      // Update last active time for this tab
      lastActiveTimes[activeTab.id] = now;
    } else if (duration >= 300) {
      console.log('Ignoring large time gap:', duration);
    }
    
    // Reset the timer
    startTime = now;
  }
}

// Function to sync screen time with backend server
async function syncScreenTime() {
  try {
    updateScreenTime(); // Ensure the latest data is captured
    const { user } = await chrome.storage.local.get('user');
    if (!user) {
      console.log('No authenticated user found. Skipping sync.');
      return;
    }

    // Filter out any entries with zero duration and prepare data for sync
    const dataToSync = Object.entries(screenTimeData)
      .filter(([_, duration]) => duration > 0) // Only sync non-zero durations
      .map(([key, duration]) => {
        const [url, title] = key.split('|');
        return { 
          user_id: user.id, 
          url, 
          title, 
          duration,
          created_at: new Date().toISOString() // Add timestamp
        };
      });
    
    if (dataToSync.length === 0) {
      console.log('No screen time data to sync.');
      return;
    }

    console.log('Attempting to sync data:', JSON.stringify(dataToSync, null, 2));

    const response = await fetch('http://localhost:4500/api/sync-screen-time', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ screenTimeData: dataToSync }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log('Screen time sync result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      screenTimeData = {}; // Clear local data after successful sync
      console.log('Local screen time data cleared after successful sync');
    } else {
      console.error('Sync was not successful:', result.message);
    }
  } catch (error) {
    console.error('Error syncing screen time:', error);
  }
}

// Existing message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  if (message.action === 'login') {
    chrome.storage.local.set({ user: message.user }, () => {
      console.log('User logged in:', message.user);
      sendResponse({ success: true });
    });
    return true; // Indicates that the response is asynchronous
  } else if (message.action === 'logout') {
    chrome.storage.local.remove('user', () => {
      console.log('User logged out');
      sendResponse({ success: true });
    });
    return true;
  } else if (message.action === 'updateTask') {
    console.log('Updating task:', message.task);
    chrome.storage.local.set({ currentTask: message.task }, () => {
      console.log('Task updated:', message.task);
      sendResponse({ success: true });
    });
    return true;
  } else if (message.action === 'openDashboard') {
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'manualSync') {
    console.log('Manual sync triggered');
    syncScreenTime();
    sendResponse({ message: 'Manual sync initiated' });
    return true;
  } else if (message.action === 'getScreenTimeData') {
    // Allow dashboard to request current screentime data
    sendResponse({ 
      screenTimeData: screenTimeData,
      success: true 
    });
    return true;
  }
});

// Track streak data
function updateStreak() {
  const today = new Date().toLocaleDateString();
  
  chrome.storage.local.get(['lastActiveDay', 'streakDays'], function(result) {
    const lastActiveDay = result.lastActiveDay;
    let streakDays = result.streakDays || 0;
    
    // If this is the first time or a new day
    if (!lastActiveDay || lastActiveDay !== today) {
      // Check if the last active day was yesterday
      if (lastActiveDay) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toLocaleDateString();
        
        if (lastActiveDay === yesterdayString) {
          // Increment streak if last active was yesterday
          streakDays++;
        } else {
          // Reset streak if there was a gap
          streakDays = 1;
        }
      } else {
        // First time using the app
        streakDays = 1;
      }
      
      // Update the storage with new streak info
      chrome.storage.local.set({
        lastActiveDay: today,
        streakDays: streakDays
      });
      
      console.log('Updated streak days:', streakDays);
    }
  });
}

// Improved tab tracking with focus detection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.storage.local.get(['user', 'currentTask'], (result) => {
      if (result.user && result.currentTask) {
        checkSite(result.currentTask, tab);
      }
    });
    
    console.log('Tab updated:', tab.url, tab.title);
    
    // Only update if this is the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length > 0 && tabs[0].id === tabId) {
        updateScreenTime(); // Update time for previous active tab
        activeTab = tab;
        startTime = Date.now();
        lastActiveTimes[tabId] = Date.now();
      }
    });
  }
});

// Improved active tab detection
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    updateScreenTime(); // Update time for previous active tab
    
    const tab = await chrome.tabs.get(activeInfo.tabId);
    console.log('Tab activated:', tab.url, tab.title);
    
    activeTab = tab;
    startTime = Date.now();
    lastActiveTimes[activeInfo.tabId] = Date.now();
  } catch (error) {
    console.error('Error in onActivated:', error);
  }
});

// Track when a tab is closed to update its time
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (activeTab && activeTab.id === tabId) {
    updateScreenTime(); // Capture final time before tab closes
    activeTab = null;
    startTime = null;
  }
  
  // Clean up lastActiveTimes
  if (lastActiveTimes[tabId]) {
    delete lastActiveTimes[tabId];
  }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus, update current tab's time
    updateScreenTime();
    // Don't reset activeTab or startTime here to prevent losing tracking context
  } else {
    // Window gained focus, get the active tab in this window
    chrome.tabs.query({active: true, windowId: windowId}, function(tabs) {
      if (tabs.length > 0) {
        updateScreenTime(); // Update previous active tab
        activeTab = tabs[0];
        startTime = Date.now();
        lastActiveTimes[tabs[0].id] = Date.now();
      }
    });
  }
});

// Existing checkSite function
function checkSite(currentTask, tab) {
  fetch('http://localhost:4500/api/check-sites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      task: currentTask, 
      url: tab.url, 
      title: tab.title,
      userId: currentTask.userId // Add this line
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.isDistraction) {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'blockSite',
        reason: data.reason
      });
    }
  })
  .catch(error => console.error('Error checking site:', error));
}

// Periodic data capture (every 30 seconds)
chrome.alarms.create('captureData', { periodInMinutes: 0.5 });

// Set up alarm for periodic screen time syncing (every 5 minutes)
chrome.alarms.create('syncScreenTime', { periodInMinutes: 5 });

// Set up alarm for streak tracking
chrome.alarms.create('checkStreak', { periodInMinutes: 60 }); // Check streak every hour

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'captureData') {
    // Just capture data without syncing
    if (activeTab && startTime) {
      updateScreenTime();
      // Reset timer to now
      startTime = Date.now();
    }
  } else if (alarm.name === 'syncScreenTime') {
    console.log('Alarm triggered: syncing screen time');
    syncScreenTime();
  } else if (alarm.name === 'checkStreak') {
    console.log('Alarm triggered: checking streak');
    updateStreak();
  }
});

// Run streak update when browser starts
chrome.runtime.onStartup.addListener(() => {
  updateStreak();
  
  // Clear old screentime data on startup
  screenTimeData = {};
  lastActiveTimes = {};
});

// Sync screen time when the browser is about to close
chrome.runtime.onSuspend.addListener(() => {
  console.log('Browser is about to close: syncing screen time');
  syncScreenTime();
});