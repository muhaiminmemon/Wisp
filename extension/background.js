// background.js

// Screen time tracking variables
let activeTab = null;
let startTime = null;
let screenTimeData = {};

function updateScreenTime() {
  if (activeTab && startTime) {
    const duration = Math.floor((Date.now() - startTime) / 1000); // duration in seconds
    const key = `${activeTab.url}|${activeTab.title}`;
    screenTimeData[key] = (screenTimeData[key] || 0) + duration;
    console.log('Updated screen time:', key, screenTimeData[key]);
  }
}

// Function to sync screen time with backend server
async function syncScreenTime() {
  try {
    updateScreenTime();
    const { user } = await chrome.storage.local.get('user');
    if (!user) {
      console.log('No authenticated user found. Skipping sync.');
      return;
    }

    const dataToSync = Object.entries(screenTimeData).map(([key, duration]) => {
      const [url, title] = key.split('|');
      return { user_id: user.id, url, title, duration };
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
  }
});

// Modified tabs.onUpdated listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.storage.local.get(['user', 'currentTask'], (result) => {
      if (result.user && result.currentTask) {
        checkSite(result.currentTask, tab);
      }
    });
    
    console.log('Tab updated:', tab.url, tab.title);
    updateScreenTime();
    activeTab = tab;
    startTime = Date.now();
  }
});

// Modified tabs.onActivated listener for screen time tracking
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  updateScreenTime();
  const tab = await chrome.tabs.get(activeInfo.tabId);
  console.log('Tab activated:', tab.url, tab.title);
  activeTab = tab;
  startTime = Date.now();
});

// Existing checkSite function
function checkSite(currentTask, tab) {
  fetch('http://localhost:4500/api/check-sites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task: currentTask, url: tab.url, title: tab.title }),
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

// Set up alarm for periodic screen time syncing
chrome.alarms.create('syncScreenTime', { periodInMinutes: 1 }); // Changed to 1 minute for more frequent syncing during testing
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncScreenTime') {
    console.log('Alarm triggered: syncing screen time');
    syncScreenTime();
  }
});

// Sync screen time when the browser is about to close
chrome.runtime.onSuspend.addListener(() => {
  console.log('Browser is about to close: syncing screen time');
  syncScreenTime();
});

// Manually trigger sync for testing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'manualSync') {
    console.log('Manual sync triggered');
    syncScreenTime();
    sendResponse({ message: 'Manual sync initiated' });
  }
});