// Background service worker for POE2 Profit Watch
/// <reference types="chrome"/>
import { updateCurrencyPrices, getPriceCache } from './price-cache.js';
console.log('Service worker initialized');
// On install, set up alarms
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed, setting up alarms and fetching initial prices');
    // Alarm for checking profits every 5 minutes
    chrome.alarms.create('checkProfits', { delayInMinutes: 1, periodInMinutes: 5 });
    // Alarm for updating prices every hour
    chrome.alarms.create('updatePrices', { delayInMinutes: 1, periodInMinutes: 60 });
    // Fetch prices immediately on install
    updateCurrencyPrices().catch(console.error);
});
// When the extension's toolbar icon is clicked, open the dashboard/options page.
chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});
// // On alarm, perform checks or updates
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkProfits') {
        checkProfits();
    }
    else if (alarm.name === 'updatePrices') {
        updateCurrencyPrices();
    }
});
// Handle messages from options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updatePrices') {
        updateCurrencyPrices().then(() => {
            sendResponse({ success: true });
        }).catch((error) => {
            console.error('Error in message handler:', error);
            sendResponse({ success: false });
        });
        return true; // Keep the message channel open for async response
    }
    else if (request.action === 'getPriceCache') {
        sendResponse(getPriceCache());
        return true;
    }
});
async function checkProfits() {
}
