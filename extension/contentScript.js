// contentScript.js

console.log('Content script loaded');

let startTime = Date.now();
let isActive = true;
let lastActiveTime = Date.now();
let totalActiveTime = 0;

// Track if the page is actually visible/active
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is not visible (user switched tabs or minimized)
    if (isActive) {
      const now = Date.now();
      const duration = now - lastActiveTime;
      totalActiveTime += duration;
      isActive = false;
      
      // Report this time chunk to background script
      reportScreenTime();
    }
  } else {
    // Page became visible again
    lastActiveTime = Date.now();
    isActive = true;
  }
});

window.addEventListener('focus', () => {
  if (!isActive) {
    lastActiveTime = Date.now();
    isActive = true;
  }
});

window.addEventListener('blur', () => {
  if (isActive) {
    const now = Date.now();
    const duration = now - lastActiveTime;
    totalActiveTime += duration;
    isActive = false;
    
    // Report this time chunk to background script
    reportScreenTime();
  }
});

// Report accumulated active time to background script
function reportScreenTime() {
  if (totalActiveTime > 0) {
    chrome.runtime.sendMessage({ 
      action: 'reportScreenTime',
      screenTime: Math.floor(totalActiveTime / 1000) // Convert to seconds
    });
    totalActiveTime = 0; // Reset after reporting
  }
}

// Periodically report time even if the page stays active
setInterval(() => {
  if (isActive) {
    const now = Date.now();
    const duration = now - lastActiveTime;
    
    // Only update if it's been active for a reasonable amount of time (avoid idle detection)
    if (duration > 0 && duration < 300000) { // Less than 5 minutes
      totalActiveTime += duration;
      lastActiveTime = now;
      
      // Report active time periodically
      reportScreenTime();
    } else if (duration >= 300000) {
      // Reset if inactive for too long
      lastActiveTime = now;
    }
  }
}, 30000); // Report every 30 seconds

window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data.type && event.data.type === 'FROM_WEBAPP') {
        console.log('Content script received message:', event.data);
        
        try {
            chrome.runtime.sendMessage(event.data.payload, response => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message:', chrome.runtime.lastError);
                    // Handle error (e.g., attempt to reconnect or notify user)
                } else {
                    console.log('Message sent successfully, response:', response);
                }
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            // Handle error (e.g., attempt to reconnect or notify user)
        }
    }
});

// Function to check if the extension context is still valid
function isExtensionContextValid() {
    try {
        chrome.runtime.getURL('');
        return true;
    } catch (e) {
        return false;
    }
}

// Periodically check if the extension context is still valid
setInterval(() => {
    if (!isExtensionContextValid()) {
        console.log('Extension context invalidated. Reloading content script...');
        // You might want to reload the script or take other appropriate action here
        // For now, we'll just log the message
    }
}, 5000); // Check every 5 seconds

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'blockSite') {
    console.log('Received blockSite message:', message);
    chrome.storage.local.get(['user', 'currentTask'], (result) => {
      if (result.user) {
        createBlockingOverlay(message.reason, result.currentTask);
      }
    });
  } else if (message.action === 'getScreenTime') {
    // Calculate current active time
    let currentScreenTime = totalActiveTime;
    if (isActive) {
      currentScreenTime += (Date.now() - lastActiveTime);
    }
    
    const screenTime = Math.floor(currentScreenTime / 1000); // Convert to seconds
    sendResponse({ screenTime: screenTime });
    
    // Reset counters after reporting
    if (isActive) {
      lastActiveTime = Date.now();
    }
    totalActiveTime = 0;
  }
  return true; // Indicates that the response is sent asynchronously
});

function createBlockingOverlay(reason, currentTask = '') {
  // Remove any existing overlay
  const existingOverlay = document.getElementById('productivity-buddy-overlay');
  if (existingOverlay) {
    document.body.removeChild(existingOverlay);
  }

  // Create the overlay container
  const overlay = document.createElement('div');
  overlay.id = 'productivity-buddy-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(16, 24, 39, 0.95);
    backdrop-filter: blur(8px);
    z-index: 9999999;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: fade-in 0.4s ease-out;
  `;

  // Fetch task information from storage
  chrome.storage.local.get(['currentTask', 'user', 'streakDays'], function(result) {
    const task = result.currentTask || currentTask || 'your scheduled task';
    const streak = result.streakDays || 1;
    
    const quotes = [
      "Discipline is choosing between what you want now and what you want most.",
      "Success isn't always about greatness. It's about consistency.",
      "The difference between who you are and who you want to be is what you do.",
      "Small disciplines repeated with consistency lead to great achievements.",
      "Discipline equals freedom.",
      "The hard days are what make you stronger.",
      "Motivation gets you started. Discipline keeps you going.",
      "Focus on progress, not perfection.",
      "Every time you resist distraction, you get mentally stronger."
    ];
    
    // Randomly select a quote
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    
    // Create the main content container
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      max-width: 500px;
      padding: 2rem;
      text-align: center;
      background-color: rgba(30, 41, 59, 0.8);
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      animation: pulse 4s infinite ease-in-out;
    `;
    
    // Create the header with icon
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1.5rem;
    `;
    
    // Add focus icon
    const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    iconSvg.setAttribute("width", "48");
    iconSvg.setAttribute("height", "48");
    iconSvg.setAttribute("viewBox", "0 0 24 24");
    iconSvg.setAttribute("fill", "none");
    iconSvg.setAttribute("stroke", "#60A5FA");
    iconSvg.setAttribute("stroke-width", "2");
    iconSvg.setAttribute("stroke-linecap", "round");
    iconSvg.setAttribute("stroke-linejoin", "round");
    iconSvg.innerHTML = `
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"></path>
      <path d="M12 7v5l3 3"></path>
    `;
    
    // Main title
    const message = document.createElement('h1');
    message.textContent = 'This site has been deemed as a distraction.';
    message.style.cssText = `
      font-size: 24px;
      font-weight: 700;
      margin: 16px 0;
      color: white;
    `;
    
    // Current task reminder
    const taskReminder = document.createElement('p');
    taskReminder.innerHTML = `You planned to work on <span style="color: #60A5FA; font-weight: 600;">'${task}'</span> right now. Stay locked in.`;
    taskReminder.style.cssText = `
      font-size: 16px;
      margin-bottom: 20px;
      line-height: 1.5;
    `;
    
    // Streak information
    const streakInfo = document.createElement('div');
    streakInfo.style.cssText = `
      background-color: rgba(20, 30, 45, 0.7);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 20px;
      border: 1px solid rgba(96, 165, 250, 0.2);
    `;
    
    const streakText = document.createElement('p');
    streakText.innerHTML = `<span style="color: #60A5FA; font-weight: 600;">${streak}</span> day streak! Keep it going! 🔥`;
    streakText.style.cssText = `
      font-size: 14px;
      margin: 0;
    `;
    
    streakInfo.appendChild(streakText);
    
    // Quote section
    const quoteContainer = document.createElement('div');
    quoteContainer.style.cssText = `
      margin-bottom: 24px;
      font-style: italic;
      color: rgba(255, 255, 255, 0.8);
      font-size: 15px;
      line-height: 1.6;
    `;
    
    quoteContainer.textContent = `"${quote}"`;
    
    // Return to task button
    const returnButton = document.createElement('button');
    returnButton.textContent = '⬅ Return to Task';
    returnButton.style.cssText = `
      padding: 14px 24px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      background-color: #2563EB;
      color: white;
      border: none;
      border-radius: 8px;
      transition: all 0.2s ease;
      margin-bottom: 16px;
      width: 100%;
    `;
    
    returnButton.addEventListener('mouseover', () => {
      returnButton.style.backgroundColor = '#1D4ED8';
    });
    
    returnButton.addEventListener('mouseout', () => {
      returnButton.style.backgroundColor = '#2563EB';
    });
    
    returnButton.addEventListener('click', () => {
      // Open dashboard in a new tab
      chrome.runtime.sendMessage({ action: 'openDashboard' });
    });
    
    // Remove Filter button (for testing)
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove Filter (For Testing)';
    removeButton.style.cssText = `
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      background-color: transparent;
      color: rgba(255, 255, 255, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      transition: all 0.2s ease;
      margin-top: 8px;
    `;
    
    removeButton.addEventListener('mouseover', () => {
      removeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    
    removeButton.addEventListener('mouseout', () => {
      removeButton.style.backgroundColor = 'transparent';
    });
    
    removeButton.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    // Assemble the components
    header.appendChild(iconSvg);
    header.appendChild(message);
    
    contentContainer.appendChild(header);
    contentContainer.appendChild(taskReminder);
    contentContainer.appendChild(streakInfo);
    contentContainer.appendChild(quoteContainer);
    contentContainer.appendChild(returnButton);
    contentContainer.appendChild(removeButton);
    
    overlay.appendChild(contentContainer);
    
    // Add CSS animations
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(96, 165, 250, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(96, 165, 250, 0); }
        100% { box-shadow: 0 0 0 0 rgba(96, 165, 250, 0); }
      }
      
      @keyframes breathe {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
      }
    `;
    
    document.head.appendChild(styleElement);
    document.body.appendChild(overlay);
  });

  // Apply greyscale to the background (everything except our overlay)
  const pageStyle = document.createElement('style');
  pageStyle.id = 'productivity-buddy-page-style';
  pageStyle.textContent = `
    body > *:not(#productivity-buddy-overlay) {
      filter: grayscale(100%) blur(3px);
      transition: filter 0.5s ease;
    }
  `;
  document.head.appendChild(pageStyle);
}