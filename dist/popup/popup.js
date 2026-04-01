"use strict";
// Popup script
const openOptionsButton = document.getElementById('openOptions');
openOptionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});
