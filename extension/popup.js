// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const taskDiv = document.getElementById('task');
  
  chrome.storage.local.get(['user', 'currentTask'], (result) => {
    console.log('Retrieved from storage:', result);  // Add this line
    if (result.user) {
      statusDiv.textContent = `Logged in as: ${result.user.email}`;
    } else {
      statusDiv.textContent = 'Not logged in';
    }
    
    if (result.currentTask) {
      taskDiv.textContent = `Current Task: ${result.currentTask}`;
    } else {
      taskDiv.textContent = 'No current task set';
    }
  });
});