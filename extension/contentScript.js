// contentScript.js

console.log('Content script loaded');

let startTime = Date.now();
let isActive = true;

window.addEventListener('focus', () => {
  if (!isActive) {
    startTime = Date.now();
    isActive = true;
  }
});

window.addEventListener('blur', () => {
  isActive = false;
});

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
    chrome.storage.local.get(['user'], (result) => {
      if (result.user) {
        createBlockingOverlay(message.reason);
      }
    });
  } else if (message.action === 'getScreenTime') {
    const currentTime = Date.now();
    const screenTime = isActive ? Math.floor((currentTime - startTime) / 1000) : 0;
    sendResponse({ screenTime: screenTime });
    startTime = currentTime; // Reset the start time
  }
  return true; // Indicates that the response is sent asynchronously
});

function createBlockingOverlay(reason) {
  const overlay = document.createElement('div');
  overlay.id = 'productivity-buddy-overlay';
  overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      z-index: 9999999;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      font-family: Arial, sans-serif;
  `;

  const message = document.createElement('h1');
  message.textContent = 'This site has been deemed as a distraction.';
  message.style.cssText = `
      font-size: 24px;
      margin-bottom: 20px;
  `;

  const reasonText = document.createElement('p');
  reasonText.textContent = reason || 'No specific reason provided.';
  reasonText.style.cssText = `
      font-size: 18px;
      margin-bottom: 30px;
  `;

  const removeButton = document.createElement('button');
  removeButton.textContent = 'Remove Filter (For Testing)';
  removeButton.style.cssText = `
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
  `;
  removeButton.addEventListener('click', () => {
      document.body.removeChild(overlay);
  });

  overlay.appendChild(message);
  overlay.appendChild(reasonText);
  overlay.appendChild(removeButton);

  document.body.appendChild(overlay);
}