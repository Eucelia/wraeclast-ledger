// Background service worker for POE2 Profit Watch

import { Currency } from '../types/currencies';
import { updateCurrencyPrices, getCurrencyPrice, getPriceCache } from './price-cache';

interface Recipe {
  name: string;
  inputs: InputItem[];
  outputs: OutputItem[];
  threshold: number;
  showNotification: boolean;
}

interface InputItem {
  type: 'trade_api' | 'currency';
  tradeApiUrl?: string;
  currency?: Currency;
  amount?: number;
}

interface OutputItem {
  type: 'trade_api' | 'currency';
  tradeApiUrl?: string;
  currency?: Currency;
  amount?: number;
}

// On install, set up alarms
chrome.runtime.onInstalled.addListener(() => {
  // Alarm for checking profits every 5 minutes
  chrome.alarms.create('checkProfits', { delayInMinutes: 1, periodInMinutes: 5 });
  // Alarm for updating prices every hour
  chrome.alarms.create('updatePrices', { delayInMinutes: 1, periodInMinutes: 60 });
  // Fetch prices immediately on install
  updateCurrencyPrices();
});

// On alarm, perform checks or updates
chrome.alarms.onAlarm.addListener((alarm: any) => {
  if (alarm.name === 'checkProfits') {
    checkProfits();
  } else if (alarm.name === 'updatePrices') {
    updateCurrencyPrices();
  }
});

// Handle messages from options page
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
  if (request.action === 'updatePrices') {
    updateCurrencyPrices().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Error in message handler:', error);
      sendResponse({ success: false });
    });
    return true; // Keep the message channel open for async response
  } else if (request.action === 'getPriceCache') {
    sendResponse(getPriceCache());
    return true;
  }
});

async function checkProfits(): Promise<void> {
  // Get recipes from storage
  const { recipes }: { recipes?: Recipe[] } = await chrome.storage.sync.get('recipes');
  if (!recipes) return;

  for (const recipe of recipes) {
    try {
      // Calculate total input cost using cached prices
      let totalInputCost = 0;
      for (const input of recipe.inputs) {
        if (input.type === 'trade_api' && input.tradeApiUrl) {
          const response = await fetch(input.tradeApiUrl);
          const data = await response.json();
          totalInputCost += data.price || 0; // Assuming API returns price
        } else if (input.type === 'currency' && input.currency && input.amount) {
          // Use cached currency price
          const price = getCurrencyPrice(input.currency);
          totalInputCost += price * input.amount;
        }
      }

      // Calculate total output value using cached prices
      let totalOutputValue = 0;
      for (const output of recipe.outputs) {
        if (output.type === 'trade_api' && output.tradeApiUrl) {
          const response = await fetch(output.tradeApiUrl);
          const data = await response.json();
          totalOutputValue += data.price || 0;
        } else if (output.type === 'currency' && output.currency && output.amount) {
          // Use cached currency price
          const price = getCurrencyPrice(output.currency);
          totalOutputValue += price * output.amount;
        }
      }

      // Calculate profit
      const profit = totalOutputValue - totalInputCost;

      // Check conditions
      if (profit > recipe.threshold && recipe.showNotification) {
        // Notify user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Profit Alert!',
          message: `Profit for ${recipe.name}: ${profit.toFixed(2)}`,
        });
      }
    } catch (error) {
      console.error('Error checking profits:', error);
    }
  }
}
