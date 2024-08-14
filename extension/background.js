// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  if (message.action === 'login') {
    chrome.storage.local.set({ user: message.user }, () => {
      console.log('User logged in:', message.user);
    });
  } else if (message.action === 'logout') {
    chrome.storage.local.remove('user', () => {
      console.log('User logged out');
    });
  } else if (message.action === 'updateTask') {
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.storage.local.get(['user', 'currentTask'], (result) => {
      if (result.user && result.currentTask) {
        checkSite(result.currentTask, tab);
      }
    });
  }
});

function checkSite(currentTask, tab) {
  // Replace with your actual API endpoint
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