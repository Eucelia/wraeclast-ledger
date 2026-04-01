// Dashboard page script

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

let recipes: Recipe[] = [];
let currencyCache: PriceCache = { prices: {} as Record<Currency, number>, lastUpdated: Date.now() };
let recipeColumns = 3;
let editingRecipeIndex: number | null = null;

const referenceCurrencySelect = document.getElementById('referenceCurrency') as HTMLSelectElement;
const leagueSelect = document.getElementById('league') as HTMLSelectElement;
const poeSessIdInput = document.getElementById('poeSessId') as HTMLInputElement;
const addRecipeButton = document.getElementById('addRecipe') as HTMLButtonElement;
const refreshButton = document.getElementById('refreshPrices') as HTMLButtonElement;
const refreshCurrencyDisplayButton = document.getElementById('refreshCurrencyDisplay') as HTMLButtonElement;
const gridColumns = document.getElementById('gridColumns') as HTMLInputElement;
const gridColumnsLabel = document.getElementById('gridColumnsLabel') as HTMLElement;
const recipesGrid = document.getElementById('recipesGrid') as HTMLElement;
const noRecipesIndicator = document.getElementById('noRecipes') as HTMLElement;
const currencyButtonsContainer = document.getElementById('currencyButtons') as HTMLElement;

const recipeModal = document.getElementById('recipeModal') as HTMLElement;
const modalTitle = document.getElementById('recipeModalTitle') as HTMLElement;
const modalRecipeName = document.getElementById('modalRecipeName') as HTMLInputElement;
const modalThreshold = document.getElementById('modalThreshold') as HTMLInputElement;
const modalInputs = document.getElementById('modalInputs') as HTMLElement;
const modalOutputs = document.getElementById('modalOutputs') as HTMLElement;
const addModalInputBtn = document.getElementById('addModalInput') as HTMLButtonElement;
const addModalOutputBtn = document.getElementById('addModalOutput') as HTMLButtonElement;
const cancelModalBtn = document.getElementById('cancelModal') as HTMLButtonElement;
const saveModalBtn = document.getElementById('saveModal') as HTMLButtonElement;
const closeModalBtn = document.getElementById('closeModal') as HTMLButtonElement;

const refreshStatus = document.getElementById('refreshStatus') as HTMLElement;
const currencyStatus = document.getElementById('currencyStatus') as HTMLElement;

function init(): void {
  loadSettings();
  loadRecipes();
  loadCurrencyPrices();

  addRecipeButton.addEventListener('click', () => openRecipeModal());
  referenceCurrencySelect.addEventListener('change', saveSettings);
  leagueSelect.addEventListener('change', saveSettings);
  poeSessIdInput.addEventListener('input', saveSettings);
  refreshButton.addEventListener('click', refreshCurrencyPrices);
  refreshCurrencyDisplayButton.addEventListener('click', loadCurrencyPrices);

  gridColumns.addEventListener('input', () => {
    recipeColumns = parseInt(gridColumns.value, 10);
    gridColumnsLabel.textContent = `${recipeColumns}`;
    renderRecipes();
  });

  addModalInputBtn.addEventListener('click', () => appendModalEntry('input'));
  addModalOutputBtn.addEventListener('click', () => appendModalEntry('output'));
  cancelModalBtn.addEventListener('click', closeRecipeModal);
  closeModalBtn.addEventListener('click', closeRecipeModal);
  saveModalBtn.addEventListener('click', saveRecipeFromModal);

  recipeColumns = parseInt(gridColumns.value || '3', 10);
  gridColumnsLabel.textContent = `${recipeColumns}`;
}

document.addEventListener('DOMContentLoaded', init);

function loadSettings(): void {
  chrome.storage.sync.get(['referenceCurrency', 'league'], (data: { referenceCurrency?: string; league?: string }) => {
    if (referenceCurrencySelect) referenceCurrencySelect.value = data.referenceCurrency || 'exalted';
    if (leagueSelect) leagueSelect.value = data.league || 'Standard';
  });

  chrome.storage.local.get('poeSessId', (data: { poeSessId?: string }) => {
    if (poeSessIdInput) poeSessIdInput.value = data.poeSessId || '';
  });
}

function saveSettings(): void {
  const referenceCurrency = referenceCurrencySelect.value;
  const league = leagueSelect.value;
  const poeSessId = poeSessIdInput.value;

  chrome.storage.sync.set({ referenceCurrency, league }, () => {
    console.log('Settings saved:', { referenceCurrency, league });
  });

  chrome.storage.local.set({ poeSessId }, () => {
    console.log('POESESSID saved');
  });

  renderRecipes();
}

function refreshCurrencyPrices(): void {
  refreshButton.disabled = true;
  refreshStatus.textContent = 'Refreshing prices...';
  refreshStatus.style.color = '#38bdf8';

  chrome.runtime.sendMessage({ action: 'updatePrices' }, (response) => {
    if (response && response.success) {
      refreshStatus.textContent = `✓ Prices updated at ${new Date().toLocaleTimeString()}`;
      refreshStatus.style.color = '#22c55e';
      setTimeout(() => {
        refreshStatus.textContent = '';
        refreshButton.disabled = false;
        loadCurrencyPrices();
      }, 1800);
    } else {
      refreshStatus.textContent = '✗ Failed to update prices';
      refreshStatus.style.color = '#f43f5e';
      refreshButton.disabled = false;
    }
  });
}

function loadCurrencyPrices(): void {
  currencyStatus.textContent = 'Loading prices...';
  currencyStatus.style.color = '#38bdf8';

  chrome.runtime.sendMessage({ action: 'getPriceCache' }, (cache: PriceCache) => {
    if (!cache || Object.keys(cache.prices).length === 0) {
      currencyStatus.textContent = 'No currency prices loaded yet. Refresh prices first.';
      currencyStatus.style.color = '#f97316';
      currencyButtonsContainer.innerHTML = '';
      return;
    }

    currencyCache = cache;
    currencyStatus.textContent = `Last update: ${new Date(currencyCache.lastUpdated).toLocaleTimeString()}`;
    currencyStatus.style.color = '#a3e635';

    renderCurrencyButtons();
    renderRecipes();
  });
}

function renderCurrencyButtons(): void {
  if (!currencyButtonsContainer) return;
  currencyButtonsContainer.innerHTML = '';

  const currencyEntries = Object.entries(currencyInfo)
    .map(([cur, info]) => ({ currency: cur as Currency, info, price: currencyCache.prices[cur as Currency] ?? 0 }))
    .sort((a, b) => b.price - a.price)
    .slice(0, 10);

  if (!currencyEntries.length) {
    currencyButtonsContainer.innerHTML = '<div class="text-slate-500">No currency data</div>';
    return;
  }

  currencyEntries.forEach(({ currency, info, price }) => {
    const btn = document.createElement('button');
    btn.className = 'rounded-lg bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700';
    btn.textContent = `${info.displayName}: ${price.toFixed(4)}`;
    btn.addEventListener('click', () => {
      referenceCurrencySelect.value = currency;
      saveSettings();
    });
    currencyButtonsContainer.appendChild(btn);
  });
}

function loadRecipes(): void {
  chrome.storage.sync.get('recipes', (data: { recipes?: Recipe[] }) => {
    recipes = data.recipes || [];
    renderRecipes();
  });
}

function renderRecipes(): void {
  if (!recipesGrid) return;
  recipesGrid.style.gridTemplateColumns = `repeat(${recipeColumns}, minmax(240px, 1fr))`;

  if (!recipes.length) {
    noRecipesIndicator?.classList.remove('hidden');
    recipesGrid.innerHTML = '';
    return;
  }

  noRecipesIndicator?.classList.add('hidden');

  recipesGrid.innerHTML = '';
  const refCurrency = referenceCurrencySelect.value as Currency;

  recipes.forEach((recipe, index) => {
    const profit = calculateRecipeProfit(recipe, refCurrency);
    const profitLabel = `${profit.toFixed(2)} ${refCurrency}`;

    const card = document.createElement('article');
    card.className = 'rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-black/20 transition hover:scale-[1.01]';

    const inputsSummary = renderItemsSummary(recipe.inputs);
    const outputsSummary = renderItemsSummary(recipe.outputs);

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-lg font-bold text-white">${recipe.name || 'Untitled Recipe'}</h3>
        <span class="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-200">${recipe.showNotification ? 'Notifications On' : 'No Notify'}</span>
      </div>
      <p class="mt-2 text-slate-300 text-sm">Threshold: ${recipe.threshold.toFixed(2)}</p>
      <div class="mt-3 rounded-lg bg-slate-800 p-2 text-slate-100">
        <div class="text-xs uppercase text-slate-400">Profit</div>
        <div class="text-2xl font-extrabold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${profitLabel}</div>
      </div>
      <div class="mt-3">
        <div class="text-xs text-slate-400">Inputs:</div>
        ${inputsSummary}
      </div>
      <div class="mt-2">
        <div class="text-xs text-slate-400">Outputs:</div>
        ${outputsSummary}
      </div>
      <div class="mt-4 flex gap-2">
        <button data-action="edit" class="flex-1 rounded-lg bg-indigo-600 px-2 py-1 text-sm font-semibold text-white hover:bg-indigo-500">Edit</button>
        <button data-action="delete" class="flex-1 rounded-lg bg-rose-600 px-2 py-1 text-sm font-semibold text-white hover:bg-rose-500">Delete</button>
      </div>
    `;

    card.querySelector('[data-action="edit"]')?.addEventListener('click', () => openRecipeModal(recipe, index));
    card.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteRecipe(index));

    recipesGrid.appendChild(card);
  });
}

function renderItemsSummary(items: Array<InputItem | OutputItem>): string {
  if (!items?.length) {
    return '<div class="text-sm text-slate-500">No items</div>';
  }
  return `
    <ul class="space-y-1 text-sm text-slate-300">
      ${items
        .map((item) => {
          if (item.type === 'currency') {
            const curName = item.currency ? currencyInfo[item.currency]?.displayName ?? item.currency : 'Unknown';
            return `<li>${(item.amount || 0).toFixed(2)} × ${curName}</li>`;
          }
          return `<li>Trade API: ${item.tradeApiUrl || 'N/A'}</li>`;
        })
        .join('')}
    </ul>
  `;
}

function calculateRecipeProfit(recipe: Recipe, referenceCurrency: Currency): number {
  const inputValue = recipe.inputs.reduce((sum, item) => sum + valueForItem(item), 0);
  const outputValue = recipe.outputs.reduce((sum, item) => sum + valueForItem(item), 0);
  const chaosProfit = outputValue - inputValue;

  const referenceRate = currencyCache.prices[referenceCurrency] || 1;
  if (referenceRate <= 0) return chaosProfit;

  return chaosProfit / referenceRate;
}

function valueForItem(item: InputItem | OutputItem): number {
  if (item.type === 'currency' && item.currency && item.amount && currencyCache.prices[item.currency]) {
    return (item.amount || 0) * (currencyCache.prices[item.currency] || 0);
  }
  return 0;
}

type ModalArea = 'input' | 'output';

function openRecipeModal(recipe?: Recipe, index?: number): void {
  editingRecipeIndex = index ?? null;
  modalTitle.textContent = index !== undefined ? 'Edit Recipe' : 'Add Recipe';

  modalRecipeName.value = recipe?.name || '';
  modalThreshold.value = `${recipe?.threshold ?? 0}`;

  modalInputs.innerHTML = '';
  modalOutputs.innerHTML = '';

  (recipe?.inputs || []).forEach((input) => appendModalEntry('input', input));
  (recipe?.outputs || []).forEach((output) => appendModalEntry('output', output));

  if (!recipe?.inputs?.length) appendModalEntry('input');
  if (!recipe?.outputs?.length) appendModalEntry('output');

  recipeModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeRecipeModal(): void {
  recipeModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  editingRecipeIndex = null;
}

function appendModalEntry(area: ModalArea, entry?: InputItem | OutputItem): void {
  const isInput = area === 'input';
  const container = isInput ? modalInputs : modalOutputs;
  const item = entry || { type: 'currency', currency: undefined, amount: 0 };

  const row = document.createElement('div');
  row.className = 'flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2 sm:flex-row sm:items-center';

  const typeSelect = document.createElement('select');
  typeSelect.className = 'rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100';
  typeSelect.innerHTML = `
    <option value="currency" ${item.type === 'currency' ? 'selected' : ''}>Currency</option>
    <option value="trade_api" ${item.type === 'trade_api' ? 'selected' : ''}>Trade API</option>
  `;

  const fieldsContainer = document.createElement('div');
  fieldsContainer.className = 'flex flex-1 flex-col gap-2 sm:flex-row sm:items-center';

  const currencySelect = document.createElement('select');
  currencySelect.className = 'rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100';
  currencySelect.innerHTML = `<option value="">Select currency</option>` + Object.entries(currencyInfo)
    .map(([key, info]) => `<option value="${key}" ${item.currency === key ? 'selected' : ''}>${info.displayName}</option>`)
    .join('');

  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.step = '0.01';
  amountInput.min = '0';
  amountInput.value = `${item.amount ?? 0}`;
  amountInput.placeholder = 'Amount';
  amountInput.className = 'rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100';

  const apiInput = document.createElement('input');
  apiInput.type = 'url';
  apiInput.value = item.type === 'trade_api' ? (item.tradeApiUrl ?? '') : '';
  apiInput.placeholder = 'Trade API URL';
  apiInput.className = 'rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'min-w-[76px] rounded-md bg-rose-500 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-400';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => row.remove());

  const updateFields = () => {
    fieldsContainer.innerHTML = '';
    if (typeSelect.value === 'currency') {
      fieldsContainer.appendChild(currencySelect);
      fieldsContainer.appendChild(amountInput);
    } else {
      fieldsContainer.appendChild(apiInput);
    }
  };

  typeSelect.addEventListener('change', updateFields);
  updateFields();

  row.appendChild(typeSelect);
  row.appendChild(fieldsContainer);
  row.appendChild(removeBtn);

  container.appendChild(row);
}

function collectModalEntries(area: ModalArea): Array<InputItem | OutputItem> {
  const container = area === 'input' ? modalInputs : modalOutputs;
  const items: Array<InputItem | OutputItem> = [];

  container.querySelectorAll('div').forEach((row) => {
    const typeSelect = row.querySelector('select') as HTMLSelectElement;
    if (!typeSelect) return;

    const type = typeSelect.value as 'currency' | 'trade_api';
    if (type === 'currency') {
      const selects = row.querySelectorAll('select');
      const currencySelect = selects[1] as HTMLSelectElement;
      const amountInput = row.querySelector('input[type="number"]') as HTMLInputElement;
      if (!currencySelect) return;

      items.push({
        type,
        currency: currencySelect.value as Currency,
        amount: parseFloat(amountInput?.value || '0') || 0,
      });
    } else {
      const apiInput = row.querySelector('input[type="url"]') as HTMLInputElement;
      items.push({ type, tradeApiUrl: apiInput?.value || '' });
    }
  });

  return items;
}

function saveRecipeFromModal(): void {
  const name = modalRecipeName.value.trim() || 'Untitled Recipe';
  const threshold = parseFloat(modalThreshold.value || '0') || 0;

  const newRecipe: Recipe = {
    name,
    threshold,
    showNotification: true,
    inputs: collectModalEntries('input') as InputItem[],
    outputs: collectModalEntries('output') as OutputItem[],
  };

  if (editingRecipeIndex !== null && recipes[editingRecipeIndex]) {
    recipes[editingRecipeIndex] = newRecipe;
  } else {
    recipes.push(newRecipe);
  }

  chrome.storage.sync.set({ recipes }, () => {
    loadRecipes();
    closeRecipeModal();
  });
}

function deleteRecipe(index: number): void {
  recipes.splice(index, 1);
  chrome.storage.sync.set({ recipes }, () => renderRecipes());
}
