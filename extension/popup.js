// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  chrome.storage.local.get(['user'], (result) => {
    if (result.user) {
      statusDiv.textContent = `Logged in as: ${result.user.email}`;
    } else {
      statusDiv.textContent = 'Not logged in';
    }
  });
});