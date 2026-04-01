// Options page script

import { Currency, currencyInfo } from '../types/currencies.js';

interface PriceCache {
  prices: Record<Currency, number>;
  lastUpdated: number;
}

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

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadRecipes();
  loadCurrencyPrices();
});

const addRecipeButton = document.getElementById('addRecipe') as HTMLButtonElement;
addRecipeButton.addEventListener('click', addRecipe);

const referenceCurrencySelect = document.getElementById('referenceCurrency') as HTMLSelectElement;
referenceCurrencySelect.addEventListener('change', saveSettings);

const leagueSelect = document.getElementById('league') as HTMLSelectElement;
leagueSelect.addEventListener('change', saveSettings);

const poeSessIdInput = document.getElementById('poeSessId') as HTMLInputElement;
poeSessIdInput.addEventListener('input', saveSettings);

const refreshButton = document.getElementById('refreshPrices') as HTMLButtonElement;
refreshButton.addEventListener('click', refreshCurrencyPrices);

const refreshCurrencyDisplayButton = document.getElementById('refreshCurrencyDisplay') as HTMLButtonElement;
refreshCurrencyDisplayButton.addEventListener('click', loadCurrencyPrices);

function loadSettings(): void {
  chrome.storage.sync.get(['referenceCurrency', 'league'], (data: { referenceCurrency?: string; league?: string }) => {
    const referenceCurrency = data.referenceCurrency || 'exalted';
    const league = data.league || 'Standard';

    (document.getElementById('referenceCurrency') as HTMLSelectElement).value = referenceCurrency;
    (document.getElementById('league') as HTMLSelectElement).value = league;
  });

  // Load POESESSID from local storage (sensitive data)
  chrome.storage.local.get('poeSessId', (data: { poeSessId?: string }) => {
    const poeSessId = data.poeSessId || '';
    (document.getElementById('poeSessId') as HTMLInputElement).value = poeSessId;
  });
}

function saveSettings(): void {
  const referenceCurrency = (document.getElementById('referenceCurrency') as HTMLSelectElement).value;
  const league = (document.getElementById('league') as HTMLSelectElement).value;
  const poeSessId = (document.getElementById('poeSessId') as HTMLInputElement).value;

  chrome.storage.sync.set({ referenceCurrency, league }, () => {
    console.log('Settings saved:', { referenceCurrency, league });
  });

  // Save POESESSID to local storage (sensitive data)
  chrome.storage.local.set({ poeSessId }, () => {
    console.log('POESESSID saved');
  });
}

function refreshCurrencyPrices(): void {
  const statusDiv = document.getElementById('refreshStatus') as HTMLElement;
  const button = document.getElementById('refreshPrices') as HTMLButtonElement;

  button.disabled = true;
  statusDiv.textContent = 'Refreshing prices...';
  statusDiv.style.color = '#0066cc';

  // Send message to background service worker to update prices
  chrome.runtime.sendMessage({ action: 'updatePrices' }, (response) => {
    if (response && response.success) {
      statusDiv.textContent = `✓ Prices updated at ${new Date().toLocaleTimeString()}`;
      statusDiv.style.color = '#00aa00';
      setTimeout(() => {
        statusDiv.textContent = '';
        button.disabled = false;
        loadCurrencyPrices(); // Load display after update
      }, 3000);
    } else {
      statusDiv.textContent = '✗ Failed to update prices';
      statusDiv.style.color = '#cc0000';
      button.disabled = false;
    }
  });
}

function loadCurrencyPrices(): void {
  const container = document.getElementById('currencyPrices') as HTMLElement;
  const statusDiv = document.getElementById('currencyStatus') as HTMLElement;
  statusDiv.textContent = 'Loading prices...';
  statusDiv.style.color = '#0066cc';

  chrome.runtime.sendMessage({ action: 'getPriceCache' }, (cache: PriceCache) => {
    statusDiv.textContent = '';
    if (!cache || Object.keys(cache.prices).length === 0) {
      container.innerHTML = '<p>No currency prices loaded yet. Refresh prices first.</p>';
      return;
    }

    // Combine with currencyInfo and sort by price desc
    const currencyList = Object.entries(currencyInfo)
      .map(([key, info]) => ({
        currency: key as Currency,
        info,
        price: cache.prices[key as Currency] || 0
      }))
      .sort((a, b) => b.price - a.price);

    const lastUpdated = new Date(cache.lastUpdated).toLocaleString();

    let html = `
      <div style="margin-bottom: 10px; font-style: italic; color: #aaa;">
        Last updated: ${lastUpdated} (${Object.keys(cache.prices).length} currencies)
      </div>
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Currency</th>
            <th>Price</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
    `;

    currencyList.forEach(({ info, price, currency }) => {
      const imageSrc = info.imagePath ? `../../public/${info.imagePath}` : '';
      html += `
        <tr>
          <td>${imageSrc ? `<img src="${imageSrc}" alt="${info.displayName}" onerror="this.style.display='none'">` : ''}</td>
          <td>${info.displayName}</td>
          <td>${price.toFixed(4)}</td>
          <td>${info.category}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  });
}

function loadRecipes(): void {
  chrome.storage.sync.get('recipes', (data: { recipes?: Recipe[] }) => {
    const recipes = data.recipes || [];
    const container = document.getElementById('recipes') as HTMLElement;
    container.innerHTML = '';
    recipes.forEach((recipe, index) => {
      const div = document.createElement('div');
      div.className = 'recipe';
      div.innerHTML = `
        <input type="text" placeholder="Recipe Name" value="${recipe.name || ''}" data-index="${index}" data-field="name">
        <div class="inputs">
          <h4>Inputs:</h4>
          <div class="input-items" data-recipe-index="${index}"></div>
          <button onclick="addInput(${index})">Add Input</button>
        </div>
        <div class="outputs">
          <h4>Outputs:</h4>
          <div class="output-items" data-recipe-index="${index}"></div>
          <button onclick="addOutput(${index})">Add Output</button>
        </div>
        <input type="number" placeholder="Profit Threshold" value="${recipe.threshold || 0}" data-index="${index}" data-field="threshold">
        <label>
          <input type="checkbox" ${recipe.showNotification ? 'checked' : ''} data-index="${index}" data-field="showNotification">
          Show Notification
        </label>
        <button onclick="saveRecipe(${index})">Save</button>
        <button onclick="deleteRecipe(${index})">Delete</button>
      `;
      container.appendChild(div);

      // Load inputs and outputs
      loadInputs(index, recipe.inputs || []);
      loadOutputs(index, recipe.outputs || []);
    });
  });
}

function loadInputs(recipeIndex: number, inputs: InputItem[]): void {
  const container = document.querySelector(`.input-items[data-recipe-index="${recipeIndex}"]`) as HTMLElement;
  container.innerHTML = '';
  inputs.forEach((input, inputIndex) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item';
    itemDiv.innerHTML = `
      <select data-recipe-index="${recipeIndex}" data-input-index="${inputIndex}" data-field="type">
        <option value="trade_api" ${input.type === 'trade_api' ? 'selected' : ''}>Trade API</option>
        <option value="currency" ${input.type === 'currency' ? 'selected' : ''}>Currency</option>
      </select>
      ${input.type === 'trade_api' ?
        `<input type="url" placeholder="Trade API URL" value="${input.tradeApiUrl || ''}" data-recipe-index="${recipeIndex}" data-input-index="${inputIndex}" data-field="tradeApiUrl">` :
        `<select data-recipe-index="${recipeIndex}" data-input-index="${inputIndex}" data-field="currency">
           <option value="">Select a currency...</option>
           ${Object.entries(currencyInfo).map(([key, info]) =>
             `<option value="${key}" ${input.currency === key ? 'selected' : ''}>${info.displayName}</option>`
           ).join('')}
         </select>
         <input type="number" placeholder="Amount" value="${input.amount || 0}" data-recipe-index="${recipeIndex}" data-input-index="${inputIndex}" data-field="amount">`
      }
      <button onclick="removeInput(${recipeIndex}, ${inputIndex})">Remove</button>
    `;
    container.appendChild(itemDiv);

    // Add event listener for type changes
    const typeSelect = itemDiv.querySelector(`[data-field="type"]`) as HTMLSelectElement;
    typeSelect.addEventListener('change', () => {
      loadInputs(recipeIndex, getInputsFromForm(recipeIndex));
    });
  });
}

function loadOutputs(recipeIndex: number, outputs: OutputItem[]): void {
  const container = document.querySelector(`.output-items[data-recipe-index="${recipeIndex}"]`) as HTMLElement;
  container.innerHTML = '';
  outputs.forEach((output, outputIndex) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item';
    itemDiv.innerHTML = `
      <select data-recipe-index="${recipeIndex}" data-output-index="${outputIndex}" data-field="type">
        <option value="trade_api" ${output.type === 'trade_api' ? 'selected' : ''}>Trade API</option>
        <option value="currency" ${output.type === 'currency' ? 'selected' : ''}>Currency</option>
      </select>
      ${output.type === 'trade_api' ?
        `<input type="url" placeholder="Trade API URL" value="${output.tradeApiUrl || ''}" data-recipe-index="${recipeIndex}" data-output-index="${outputIndex}" data-field="tradeApiUrl">` :
        `<select data-recipe-index="${recipeIndex}" data-output-index="${outputIndex}" data-field="currency">
           <option value="">Select a currency...</option>
           ${Object.entries(currencyInfo).map(([key, info]) =>
             `<option value="${key}" ${output.currency === key ? 'selected' : ''}>${info.displayName}</option>`
           ).join('')}
         </select>
         <input type="number" placeholder="Amount" value="${output.amount || 0}" data-recipe-index="${recipeIndex}" data-output-index="${outputIndex}" data-field="amount">`
      }
      <button onclick="removeOutput(${recipeIndex}, ${outputIndex})">Remove</button>
    `;
    container.appendChild(itemDiv);

    // Add event listener for type changes
    const typeSelect = itemDiv.querySelector(`[data-field="type"]`) as HTMLSelectElement;
    typeSelect.addEventListener('change', () => {
      loadOutputs(recipeIndex, getOutputsFromForm(recipeIndex));
    });
  });
}

function getInputsFromForm(recipeIndex: number): InputItem[] {
  const inputs: InputItem[] = [];
  const inputTypeElements = document.querySelectorAll(`[data-recipe-index="${recipeIndex}"][data-input-index][data-field="type"]`) as NodeListOf<HTMLSelectElement>;
  inputTypeElements.forEach((select) => {
    const inputIndex = parseInt(select.dataset.inputIndex!);
    const type = select.value as 'trade_api' | 'currency';
    if (type === 'trade_api') {
      const urlElement = document.querySelector(`[data-recipe-index="${recipeIndex}"][data-input-index="${inputIndex}"][data-field="tradeApiUrl"]`) as HTMLInputElement;
      inputs[inputIndex] = { type, tradeApiUrl: urlElement?.value || '' };
    } else {
      const currencyElement = document.querySelector(`[data-recipe-index="${recipeIndex}"][data-input-index="${inputIndex}"][data-field="currency"]`) as HTMLInputElement;
      const amountElement = document.querySelector(`[data-recipe-index="${recipeIndex}"][data-input-index="${inputIndex}"][data-field="amount"]`) as HTMLInputElement;
      inputs[inputIndex] = { type, currency: currencyElement?.value as Currency, amount: parseFloat(amountElement?.value || '0') || 0 };
    }
  });
  return inputs;
}

function getOutputsFromForm(recipeIndex: number): OutputItem[] {
  const outputs: OutputItem[] = [];
  const outputTypeElements = document.querySelectorAll(`[data-recipe-index="${recipeIndex}"][data-output-index][data-field="type"]`) as NodeListOf<HTMLSelectElement>;
  outputTypeElements.forEach((select) => {
    const outputIndex = parseInt(select.dataset.outputIndex!);
    const type = select.value as 'trade_api' | 'currency';
    if (type === 'trade_api') {
      const urlElement = document.querySelector(`[data-recipe-index="${recipeIndex}"][data-output-index="${outputIndex}"][data-field="tradeApiUrl"]`) as HTMLInputElement;
      outputs[outputIndex] = { type, tradeApiUrl: urlElement?.value || '' };
    } else {
      const currencyElement = document.querySelector(`[data-recipe-index="${recipeIndex}"][data-output-index="${outputIndex}"][data-field="currency"]`) as HTMLInputElement;
      const amountElement = document.querySelector(`[data-recipe-index="${recipeIndex}"][data-output-index="${outputIndex}"][data-field="amount"]`) as HTMLInputElement;
      outputs[outputIndex] = { type, currency: currencyElement?.value as Currency, amount: parseFloat(amountElement?.value || '0') || 0 };
    }
  });
  return outputs;
}

function addRecipe(): void {
  chrome.storage.sync.get('recipes', (data: { recipes?: Recipe[] }) => {
    const recipes = data.recipes || [];
    recipes.push({ name: '', inputs: [], outputs: [], threshold: 0, showNotification: true });
    chrome.storage.sync.set({ recipes }, loadRecipes);
  });
}

function addInput(recipeIndex: number): void {
  chrome.storage.sync.get('recipes', (data: { recipes?: Recipe[] }) => {
    const recipes = data.recipes || [];
    recipes[recipeIndex].inputs.push({ type: 'currency', currency: undefined, amount: 0 });
    chrome.storage.sync.set({ recipes }, loadRecipes);
  });
}

function addOutput(recipeIndex: number): void {
  chrome.storage.sync.get('recipes', (data: { recipes?: Recipe[] }) => {
    const recipes = data.recipes || [];
    recipes[recipeIndex].outputs.push({ type: 'currency', currency: undefined, amount: 0 });
    chrome.storage.sync.set({ recipes }, loadRecipes);
  });
}

function removeInput(recipeIndex: number, inputIndex: number): void {
  chrome.storage.sync.get('recipes', (data: { recipes?: Recipe[] }) => {
    const recipes = data.recipes || [];
    recipes[recipeIndex].inputs.splice(inputIndex, 1);
    chrome.storage.sync.set({ recipes }, loadRecipes);
  });
}

function removeOutput(recipeIndex: number, outputIndex: number): void {
  chrome.storage.sync.get('recipes', (data: { recipes?: Recipe[] }) => {
    const recipes = data.recipes || [];
    recipes[recipeIndex].outputs.splice(outputIndex, 1);
    chrome.storage.sync.set({ recipes }, loadRecipes);
  });
}

function saveRecipe(index: number): void {
  chrome.storage.sync.get('recipes', (data: { recipes?: Recipe[] }) => {
    const recipes = data.recipes || [];
    const recipeElement = document.querySelector(`[data-index="${index}"][data-field="name"]`) as HTMLInputElement;
    recipes[index].name = recipeElement.value;

    const thresholdElement = document.querySelector(`[data-index="${index}"][data-field="threshold"]`) as HTMLInputElement;
    recipes[index].threshold = parseFloat(thresholdElement.value) || 0;

    const notificationCheckbox = document.querySelector(`[data-index="${index}"][data-field="showNotification"]`) as HTMLInputElement;
    recipes[index].showNotification = notificationCheckbox.checked;

    // Save inputs and outputs using helper functions
    recipes[index].inputs = getInputsFromForm(index);
    recipes[index].outputs = getOutputsFromForm(index);

    chrome.storage.sync.set({ recipes });
  });
}

function deleteRecipe(index: number): void {
  chrome.storage.sync.get('recipes', (data: { recipes?: Recipe[] }) => {
    const recipes = data.recipes || [];
    recipes.splice(index, 1);
    chrome.storage.sync.set({ recipes }, loadRecipes);
  });
}

// Make functions global for onclick handlers
(window as any).addInput = addInput;
(window as any).addOutput = addOutput;
(window as any).removeInput = removeInput;
(window as any).removeOutput = removeOutput;
(window as any).saveRecipe = saveRecipe;
(window as any).deleteRecipe = deleteRecipe;
(window as any).getInputsFromForm = getInputsFromForm;
(window as any).getOutputsFromForm = getOutputsFromForm;
(window as any).refreshCurrencyPrices = refreshCurrencyPrices;
(window as any).loadCurrencyPrices = loadCurrencyPrices;
