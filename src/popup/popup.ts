// Popup script

const openOptionsButton = document.getElementById('openOptions') as HTMLButtonElement;
openOptionsButton.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
