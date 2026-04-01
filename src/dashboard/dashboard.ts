// Dashboard page script

import { Currency, currencyInfo } from '../types/currencies.js';
import { getCurrencyImagePath, mapStringToCurrency } from '../utils.js';


interface PriceCache {
  prices: Record<Currency, number>;
  lastUpdated: number;
}

interface Recipe {
  id: string;
  isEnabled: boolean;
  name: string;
  inputs: InputItem[];
  outputs: OutputItem[];
  threshold: number;
  showNotification: boolean;
}

interface RecipePriceRecord {
  recipeId: string;
  profit: number;
  currency: Currency;
  timestamp: number;
}

interface InputItem {
  type: 'trade_api' | 'currency' | 'multiplier';
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
let recipeColumns = 4;
let editingRecipeIndex: number | null = null;

let REF_CURRENCY = Currency.EXALTED_ORB;

const referenceCurrencySelect = document.getElementById('referenceCurrency') as HTMLSelectElement;
const leagueSelect = document.getElementById('league') as HTMLSelectElement;
const poeSessIdInput = document.getElementById('poeSessId') as HTMLInputElement;
const addRecipeButton = document.getElementById('addRecipe') as HTMLButtonElement;
const refreshButton = document.getElementById('refreshPrices') as HTMLButtonElement;
const recipesGrid = document.getElementById('recipesGrid') as HTMLElement;
const noRecipesIndicator = document.getElementById('noRecipes') as HTMLElement;

const openSettingsButton = document.getElementById('openSettings') as HTMLButtonElement | null;
const settingsModal = document.getElementById('settingsModal') as HTMLElement | null;
const closeSettingsButton = document.getElementById('closeSettings') as HTMLButtonElement | null;
const saveSettingsButton = document.getElementById('saveSettings') as HTMLButtonElement | null;

const recipeModal = document.getElementById('recipeModal') as HTMLElement;
const modalTitle = document.getElementById('recipeModalTitle') as HTMLElement;
const modalRecipeName = document.getElementById('modalRecipeName') as HTMLInputElement;
const modalThreshold = document.getElementById('modalThreshold') as HTMLInputElement;
const modalIsEnabled = document.getElementById('modalIsEnabled') as HTMLButtonElement;
const modalShowNotification = document.getElementById('modalShowNotification') as HTMLButtonElement;
const modalInputs = document.getElementById('modalInputs') as HTMLElement;
const modalOutputs = document.getElementById('modalOutputs') as HTMLElement;
const addModalInputBtn = document.getElementById('addModalInput') as HTMLButtonElement;
const addModalOutputBtn = document.getElementById('addModalOutput') as HTMLButtonElement;
const cancelModalBtn = document.getElementById('cancelModal') as HTMLButtonElement;
const saveModalBtn = document.getElementById('saveModal') as HTMLButtonElement;
const closeModalBtn = document.getElementById('closeModal') as HTMLButtonElement;

const refreshStatus = document.getElementById('refreshStatus') as HTMLElement;

function setToggleState(button: HTMLButtonElement, enabled: boolean): void {
  button.setAttribute('aria-pressed', enabled.toString());
  button.classList.toggle('bg-violet-600', enabled);
  button.classList.toggle('bg-slate-700', !enabled);
  const knob = button.querySelector('span');
  if (knob) {
    knob.classList.toggle('translate-x-5', enabled);
    knob.classList.toggle('translate-x-0', !enabled);
  }
}

function getToggleState(button: HTMLButtonElement): boolean {
  return button.getAttribute('aria-pressed') === 'true';
}

function init(): void {
  loadSettings();
  loadRecipes();
  loadCurrencyPrices();

  addRecipeButton.addEventListener('click', () => openRecipeModal());
  // referenceCurrencySelect.addEventListener('change', () => {
  //   saveSettings();
  //   renderRecipes();
  // });
  leagueSelect.addEventListener('change', saveSettings);
  poeSessIdInput.addEventListener('input', saveSettings);
  refreshButton.addEventListener('click', refreshCurrencyPrices);

  modalIsEnabled.addEventListener('click', () => setToggleState(modalIsEnabled, !getToggleState(modalIsEnabled)));
  modalShowNotification.addEventListener('click', () => setToggleState(modalShowNotification, !getToggleState(modalShowNotification)));


  addModalInputBtn.addEventListener('click', () => appendModalEntry('input'));
  addModalOutputBtn.addEventListener('click', () => appendModalEntry('output'));
  cancelModalBtn.addEventListener('click', closeRecipeModal);
  closeModalBtn.addEventListener('click', closeRecipeModal);
  saveModalBtn.addEventListener('click', saveRecipeFromModal);

  openSettingsButton?.addEventListener('click', openSettingsModal);
  closeSettingsButton?.addEventListener('click', closeSettingsModal);
  saveSettingsButton?.addEventListener('click', () => {
    saveSettings();
    closeSettingsModal();
  });

  settingsModal?.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
      closeSettingsModal();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

function openSettingsModal(): void {
  if (!settingsModal) return;
  settingsModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeSettingsModal(): void {
  if (!settingsModal) return;
  settingsModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

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
  const referenceCurrency = REF_CURRENCY;
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
  chrome.runtime.sendMessage({ action: 'getPriceCache' }, (cache: PriceCache) => {
    if (!cache || Object.keys(cache.prices).length === 0) {
      return;
    }

    currencyCache = cache;
    renderRecipes();
  });
}

function loadRecipes(): void {
  chrome.storage.sync.get('recipes', (data: { recipes?: Recipe[] }) => {
    recipes = (data.recipes || []).map((recipe) => ({
      ...recipe,
      isEnabled: recipe.isEnabled ?? true,
      showNotification: recipe.showNotification ?? true,
    }));
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
  const refCurrency = REF_CURRENCY;

  recipes.forEach((recipe, index) => {
    const profit = calculateRecipeProfit(recipe, refCurrency);
    const curInfo = currencyInfo[mapStringToCurrency(refCurrency)];
    const currencyImagePath = getCurrencyImagePath(curInfo?.imagePath || '');
    const profitSign = profit >= 0 ? '+' : '';
    const profitLabel = `${profitSign}${profit.toFixed(2)}`;

    const card = document.createElement('article');
    card.className = 'rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-black/20 transition hover:scale-[1.01]';

    const inputsSummary = renderItemsSummary(recipe.inputs);
    const outputsSummary = renderItemsSummary(recipe.outputs);

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-lg font-bold text-white">${recipe.name || 'Untitled Recipe'}</h3>
        <div class="flex items-center gap-1 text-xs">
          LAST UPDATED PLACEHOLDER
        </div>
      </div>
      <div class="mt-3 rounded-lg p-2">
        <div class="text-2xl font-extrabold rounded px-3 py-2 flex items-center gap-2 ${profit >= 0 ? 'bg-emerald-700 text-white' : 'bg-rose-600 text-white'}"><img src="${currencyImagePath}" alt="${refCurrency}" class="w-6 h-6" />${profitLabel}</div>
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
            const curInfo = item.currency ? currencyInfo[item.currency] : null;
            const imagePath = getCurrencyImagePath(curInfo?.imagePath || '');
            const displayName = curInfo?.displayName ?? item.currency ?? 'Unknown';
            return `<li class="flex items-center gap-2"><img src="${imagePath}" alt="${displayName}" class="w-5 h-5" /> ${(item.amount || 0).toFixed(2)} × ${displayName}</li>`;
          }
          return `<li>Trade Search Query</li>`;
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
  setToggleState(modalIsEnabled, recipe?.isEnabled ?? true);
  setToggleState(modalShowNotification, recipe?.showNotification ?? true);

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
  row.className = 'flex flex-wrap gap-2 rounded-lg border border-slate-700 bg-slate-800 p-4 items-center';

  const typeSelect = document.createElement('select');
  typeSelect.className = 'rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100';
  typeSelect.innerHTML = `
    <option value="currency" ${item.type === 'currency' ? 'selected' : ''}>Currency</option>
    <option value="trade_api" ${item.type === 'trade_api' ? 'selected' : ''}>Trade API</option>
  `;

  const fieldsContainer = document.createElement('div');
  fieldsContainer.className = 'flex flex-1 flex-wrap gap-2 items-center min-w-0';

  const currencySelect = document.createElement('select');
  currencySelect.className = 'flex-1 min-w-[120px] rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100';
  currencySelect.innerHTML = `<option value="">Select currency</option>` + Object.entries(currencyInfo)
    .map(([key, info]) => `<option value="${key}" ${item.currency === key ? 'selected' : ''}>${info.displayName}</option>`)
    .join('');

  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.step = '0.01';
  amountInput.min = '0';
  amountInput.value = `${item.amount ?? 0}`;
  amountInput.placeholder = 'Amount';
  amountInput.className = 'w-20 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100';

  const apiInput = document.createElement('input');
  apiInput.type = 'url';
  apiInput.value = item.type === 'trade_api' ? (item.tradeApiUrl ?? '') : '';
  apiInput.placeholder = 'Trade API URL';
  apiInput.className = 'flex-1 min-w-[200px] rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100';

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

  Array.from(container.children).forEach((child) => {
    const row = child as HTMLElement;
    const typeSelect = row.querySelector('select') as HTMLSelectElement;
    if (!typeSelect) return;

    const type = typeSelect.value as 'currency' | 'trade_api';
    if (type === 'currency') {
      const selects = row.querySelectorAll('select');
      const currencySelect = selects[1] as HTMLSelectElement;
      const amountInput = row.querySelector('input[type="number"]') as HTMLInputElement;
      if (!currencySelect || !currencySelect.value || !amountInput || parseFloat(amountInput.value || '0') <= 0) return;

      items.push({
        type,
        currency: currencySelect.value as Currency,
        amount: parseFloat(amountInput.value) || 0,
      });
    } else {
      const apiInput = row.querySelector('input[type="url"]') as HTMLInputElement;
      if (!apiInput || !apiInput.value.trim()) return;

      items.push({ type, tradeApiUrl: apiInput.value });
    }
  });

  return items;
}

function saveRecipeFromModal(): void {
  const name = modalRecipeName.value.trim() || 'Untitled Recipe';
  const threshold = parseFloat(modalThreshold.value || '0') || 0;

  const newRecipe: Recipe = {
    id: crypto.randomUUID(),
    isEnabled: getToggleState(modalIsEnabled),
    name,
    threshold,
    showNotification: getToggleState(modalShowNotification),
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
