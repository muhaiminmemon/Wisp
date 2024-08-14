// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const taskDiv = document.getElementById('task');
  const buttonContainer = document.getElementById('buttonContainer');
  
  chrome.storage.local.get(['user', 'currentTask'], (result) => {
    console.log('Retrieved from storage:', result);
    
    if (result.user) {
      statusDiv.textContent = `Logged in as: ${result.user.email}`;
      taskDiv.textContent = result.currentTask ? `Current Task: ${result.currentTask}` : 'No current task set';
      
      const dashboardButton = createButton('Go to Dashboard', 'bg-blue-500 hover:bg-blue-700', () => {
        chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
      });
      buttonContainer.appendChild(dashboardButton);
    } else {
      statusDiv.textContent = 'Not logged in';
      taskDiv.textContent = 'Please log in to use Productivity Buddy';
      
      const loginButton = createButton('Log In', 'bg-green-500 hover:bg-green-700', () => {
        chrome.tabs.create({ url: 'http://localhost:3000/login' });
      });
      buttonContainer.appendChild(loginButton);
    }
  });
});

function createButton(text, classes, onClick) {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = `${classes} text-white font-bold py-2 px-4 rounded`;
  button.addEventListener('click', onClick);
  return button;
}