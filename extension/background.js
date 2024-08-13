// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);  // Add this line
  if (message.action === 'login') {
    chrome.storage.local.set({ user: message.user }, () => {
      console.log('User logged in:', message.user);
    });
  } else if (message.action === 'logout') {
    chrome.storage.local.remove('user', () => {
      console.log('User logged out');
    });
  } else if (message.action === 'updateTask') {  // Add this block
    console.log('Updating task:', message.task);
    chrome.storage.local.set({ currentTask: message.task }, () => {
      console.log('Task updated:', message.task);
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['user'], (result) => {
    if (result.user) {
      console.log('User already logged in:', result.user);
    }
  });
});

// New code for smart blocking
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.storage.local.get(['currentTask'], (result) => {
      if (result.currentTask) {
        checkSite(result.currentTask, tab.url, tab.title, tabId);
      }
    });
  }
});

function checkSite(tab) {
  chrome.storage.local.get(['currentTask'], (result) => {
      if (result.currentTask) {
          // Replace with your actual API endpoint
          fetch('http://localhost:4500/api/check-sites', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ task: result.currentTask, url: tab.url, title: tab.title }),
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
  });
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
      checkSite(tab);
  }
});