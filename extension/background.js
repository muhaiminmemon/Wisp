// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'login') {
    chrome.storage.local.set({ user: message.user }, () => {
      console.log('User logged in:', message.user);
    });
  } else if (message.action === 'logout') {
    chrome.storage.local.remove('user', () => {
      console.log('User logged out');
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