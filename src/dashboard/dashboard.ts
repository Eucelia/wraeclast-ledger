// Dashboard page script

import { Currency, currencyInfo } from '../types/currencies.js';
import { getCurrencyImagePath, mapStringToCurrency } from '../utils.js';
import { clearTradeCache, getCachedCheapestPrice, getFirstPagePricesFromUrl, isTradeUrlFresh, PriceListing } from './poeTrade.js';


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
  label?: string;
}

interface OutputItem {
  type: 'trade_api' | 'currency';
  tradeApiUrl?: string;
  currency?: Currency;
  amount?: number;
  label?: string;
}

let recipes: Recipe[] = [];
let currencyCache: PriceCache = { prices: {} as Record<Currency, number>, lastUpdated: Date.now() };
let recipeColumns = 4;
let editingRecipeIndex: number | null = null;

// In-memory cache of primary image per recipe (trade image or currency icon)
const recipeImageCache: Record<string, string> = {};

// Last computed profit per recipe so we can avoid updating
// when trade listings are stale.
const lastRecipeProfit: Record<string, number> = {};

let hasRefreshedTradesOnLoad = false;

function getProfitColor(profit: number): string {
  // Clamp profit to [-100, 100] for opacity scaling
  const clamped = Math.max(-100, Math.min(100, profit));
  const intensity = Math.abs(clamped) / 100; // 0..1

  if (intensity === 0) {
    // Neutral: use card background color
    return 'rgba(15, 23, 42, 0.8)'; // approx slate-900/80
  }

  // Positive → green, negative → red; opacity scaled by |profit|
  if (clamped > 0) {
    // Tailwind emerald-500-ish: rgb(16, 185, 129)
    return `rgba(16, 185, 129, ${intensity})`;
  }
  // Tailwind rose-500-ish: rgb(244, 63, 94)
  return `rgba(244, 63, 94, ${intensity})`;
}

let REF_CURRENCY = Currency.EXALTED_ORB;

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Never';
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return '  just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return ` ~${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return ` ~${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return ` ~${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

const referenceCurrencySelect = document.getElementById('referenceCurrency') as HTMLSelectElement;
const leagueSelect = document.getElementById('league') as HTMLSelectElement;
const poeSessIdInput = document.getElementById('poeSessId') as HTMLInputElement;
const addRecipeButton = document.getElementById('addRecipe') as HTMLButtonElement;
const refreshButton = document.getElementById('refreshPrices') as HTMLButtonElement;
const recalcProfitsButton = document.getElementById('recalcProfits') as HTMLButtonElement | null;
const refreshTradesButton = document.getElementById('refreshTrades') as HTMLButtonElement | null;
const clearTradeCacheButton = document.getElementById('clearTradeCache') as HTMLButtonElement | null;
const recipesGrid = document.getElementById('recipesGrid') as HTMLElement;
const noRecipesIndicator = document.getElementById('noRecipes') as HTMLElement;

const openSettingsButton = document.getElementById('openSettings') as HTMLButtonElement | null;
const settingsModal = document.getElementById('settingsModal') as HTMLElement | null;
const closeSettingsButton = document.getElementById('closeSettings') as HTMLButtonElement | null;
const saveSettingsButton = document.getElementById('saveSettings') as HTMLButtonElement | null;

const recipeDetailsModal = document.getElementById('recipeDetailsModal') as HTMLElement | null;
const recipeDetailsTitle = document.getElementById('recipeDetailsTitle') as HTMLElement | null;
const recipeDetailsContent = document.getElementById('recipeDetailsContent') as HTMLElement | null;
const closeRecipeDetailsButton = document.getElementById('closeRecipeDetails') as HTMLButtonElement | null;
const editFromDetailsButton = document.getElementById('editFromDetails') as HTMLButtonElement | null;

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
const deleteModalBtn = document.getElementById('deleteModal') as HTMLButtonElement | null;

const refreshStatus = document.getElementById('refreshStatus') as HTMLElement;

function tradeCurrencyToEnum(currency: string): Currency | null {
  const key = currency.toLowerCase();
  switch (key) {
    case 'chaos':
      return Currency.CHAOS_ORB;
    case 'exalted':
      return Currency.EXALTED_ORB;
    case 'divine':
      return Currency.DIVINE_ORB;
    default:
      return null;
  }
}

function convertTradePriceToExalts(currency: string, amount: number): number | null {
  const enumCur = tradeCurrencyToEnum(currency);
  if (!enumCur) return null;
  const rateInExalts = currencyCache.prices[enumCur];
  if (!rateInExalts || rateInExalts <= 0) return null;
  return amount * rateInExalts;
}

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

let detailsRecipeIndex: number | null = null;

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
  recalcProfitsButton?.addEventListener('click', recalculateProfits);
  refreshTradesButton?.addEventListener('click', refreshAllTradeListings);
  clearTradeCacheButton?.addEventListener('click', () => {
    clearTradeCache();
    refreshStatus.textContent = 'Trade cache cleared';
    refreshStatus.style.color = '#fbbf24'; // amber-400-ish
    setTimeout(() => {
      refreshStatus.textContent = '';
    }, 1500);
  });

  modalIsEnabled.addEventListener('click', () => setToggleState(modalIsEnabled, !getToggleState(modalIsEnabled)));
  modalShowNotification.addEventListener('click', () => setToggleState(modalShowNotification, !getToggleState(modalShowNotification)));


  addModalInputBtn.addEventListener('click', () => appendModalEntry('input'));
  addModalOutputBtn.addEventListener('click', () => appendModalEntry('output'));
  cancelModalBtn.addEventListener('click', () => closeRecipeModal(true));
  closeModalBtn.addEventListener('click', () => closeRecipeModal(true));
  saveModalBtn.addEventListener('click', saveRecipeFromModal);
  deleteModalBtn?.addEventListener('click', () => {
    if (editingRecipeIndex !== null && window.confirm('Delete this recipe? This cannot be undone.')) {
      deleteRecipe(editingRecipeIndex);
      closeRecipeModal(false);
    }
  });

  openSettingsButton?.addEventListener('click', openSettingsModal);
  closeSettingsButton?.addEventListener('click', closeSettingsModal);
  saveSettingsButton?.addEventListener('click', () => {
    saveSettings();
    closeSettingsModal();
  });

  closeRecipeDetailsButton?.addEventListener('click', closeRecipeDetailsModal);
  editFromDetailsButton?.addEventListener('click', () => {
    if (detailsRecipeIndex !== null && recipes[detailsRecipeIndex]) {
      const recipe = recipes[detailsRecipeIndex];
      closeRecipeDetailsModal();
      openRecipeModal(recipe, detailsRecipeIndex);
    }
  });

  settingsModal?.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
      closeSettingsModal();
    }
  });

  // Periodically refresh "Last updated" relative timestamps without recalculating profits.
  setInterval(updateRecipeTimestamps, 60_000);
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

function openRecipeDetailsModal(recipe: Recipe, index: number): void {
  detailsRecipeIndex = index;
  console.log('openRecipeDetailsModal', recipe, index);
  if (!recipeDetailsModal || !recipeDetailsContent || !recipeDetailsTitle) return;
  recipeDetailsTitle.textContent = recipe.name || 'Untitled Recipe';

  const refCurrency = REF_CURRENCY;
  const profit = calculateRecipeProfit(recipe, refCurrency);
  const inputValue = recipe.inputs.reduce((sum, item) => sum + valueForItem(item), 0);
  const outputValue = recipe.outputs.reduce((sum, item) => sum + valueForItem(item), 0);

  const inputsHtml = renderItemsSummary(recipe.inputs);
  const outputsHtml = renderItemsSummary(recipe.outputs);

  const inputsValueList = recipe.inputs
    .map((item) => {
      const val = valueForItem(item);
      return `<li class="flex justify-between text-xs text-slate-300"><span>${
        item.type === 'currency'
          ? currencyInfo[item.currency as Currency]?.displayName ?? item.currency
          : item.label || 'Trade URL'
      }</span><span class="font-mono">${val.toFixed(3)} ex</span></li>`;
    })
    .join('');

  const outputsValueList = recipe.outputs
    .map((item) => {
      const val = valueForItem(item);
      return `<li class="flex justify-between text-xs text-slate-300"><span>${
        item.type === 'currency'
          ? currencyInfo[item.currency as Currency]?.displayName ?? item.currency
          : item.label || 'Trade URL'
      }</span><span class="font-mono">${val.toFixed(3)} ex</span></li>`;
    })
    .join('');

  recipeDetailsContent.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
        <h4 class="font-semibold text-slate-100 mb-2 text-sm">Inputs</h4>
        ${inputsHtml}
        <ul class="mt-2 space-y-1">
          ${inputsValueList}
        </ul>
      </div>
      <div class="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
        <h4 class="font-semibold text-slate-100 mb-2 text-sm">Outputs</h4>
        ${outputsHtml}
        <ul class="mt-2 space-y-1">
          ${outputsValueList}
        </ul>
      </div>
    </div>
    <div class="mt-4">
      <h4 class="font-semibold text-slate-100 mb-1">Profit Breakdown</h4>
      <p class="text-slate-200 text-sm">Total inputs: <span class="font-mono">${inputValue.toFixed(
        3,
      )} ex</span></p>
      <p class="text-slate-200 text-sm">Total outputs: <span class="font-mono">${outputValue.toFixed(
        3,
      )} ex</span></p>
      <p class="text-slate-200 text-sm">Profit (ref currency): <span class="font-mono">${profit.toFixed(
        3,
      )}</span></p>
    </div>
    <div class="mt-4 space-y-2">
      <h4 class="font-semibold text-slate-100 mb-1">Trade Listings</h4>
      ${renderTradeDetails(recipe)}
    </div>
  `;

  recipeDetailsModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeRecipeDetailsModal(): void {
  if (!recipeDetailsModal) return;
  recipeDetailsModal.classList.add('hidden');
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

function recalculateProfits(): void {
  // Clear cached profits so they are recalculated on next render.
  for (const key of Object.keys(lastRecipeProfit)) {
    delete lastRecipeProfit[key];
  }
  renderRecipes();
}

async function refreshAllTradeListings(): Promise<void> {
  const poeSessId = poeSessIdInput?.value || '';
  const urls = new Set<string>();

  recipes.forEach((recipe) => {
    [...recipe.inputs, ...recipe.outputs]
      .filter((item) => item.type === 'trade_api' && item.tradeApiUrl)
      .forEach((item) => urls.add(item.tradeApiUrl as string));
  });

  const promises: Promise<unknown>[] = [];
  urls.forEach((url) => {
    promises.push(
      getFirstPagePricesFromUrl(url, {
        maxPerPage: 10,
        sessionId: poeSessId || undefined,
      }).catch((err) => {
        console.error('Failed to refresh trade listing for URL', url, err);
      }),
    );
  });

  if (promises.length === 0) {
    return;
  }

  refreshStatus.textContent = 'Refreshing trade listings...';
  refreshStatus.style.color = '#38bdf8';

  await Promise.all(promises);

  // After trade listings update, recompute profits for all recipes.
  recalculateProfits();

  refreshStatus.textContent = '✓ Trade listings refreshed';
  refreshStatus.style.color = '#22c55e';
  setTimeout(() => {
    refreshStatus.textContent = '';
  }, 1800);
}

function loadRecipes(): void {
  chrome.storage.sync.get('recipes', (data: { recipes?: Recipe[] }) => {
    recipes = (data.recipes || []).map((recipe) => ({
      ...recipe,
      isEnabled: recipe.isEnabled ?? true,
      showNotification: recipe.showNotification ?? true,
    }));
    renderRecipes();

    // Refresh trade listings once on initial load
    if (!hasRefreshedTradesOnLoad) {
      hasRefreshedTradesOnLoad = true;
      refreshAllTradeListings().catch((err) =>
        console.error('Failed to refresh trade listings on load', err),
      );
    }
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
  const lastUpdatedGlobal = currencyCache.lastUpdated || 0;

  recipes.forEach((recipe, index) => {
    const tradeUrls = [...recipe.inputs, ...recipe.outputs]
      .filter((item) => item.type === 'trade_api' && item.tradeApiUrl)
      .map((item) => item.tradeApiUrl as string);

    const hasTrade = tradeUrls.length > 0;
    const tradeReady = hasTrade
      ? tradeUrls.every(
          (url) =>
            isTradeUrlFresh(url, 5 * 60 * 1000) &&
            getCachedCheapestPrice(url, convertTradePriceToExalts) != null,
        )
      : false;

    let profit = lastRecipeProfit[recipe.id] ?? 0;
    if (!hasTrade || tradeReady) {
      profit = calculateRecipeProfit(recipe, refCurrency);
      lastRecipeProfit[recipe.id] = profit;
    }

    const showNumericProfit = !hasTrade || tradeReady;
    const curInfo = currencyInfo[mapStringToCurrency(refCurrency)];
    const currencyImagePath = getCurrencyImagePath(curInfo?.imagePath || '');
    const profitSign = profit >= 0 ? '+' : '';
    const profitLabel = showNumericProfit ? `${profitSign}${profit.toFixed(2)}` : 'Retrieving...';
    const profitBgColor = showNumericProfit ? getProfitColor(profit) : 'rgba(15, 23, 42, 0.8)';

    const primaryImage = getRecipePrimaryImage(recipe, currencyImagePath);

    const card = document.createElement('article');
    card.className =
      'flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-black/20 transition hover:scale-[1.01]';
    card.style.cursor = 'pointer';

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-3">
          ${
            primaryImage
              ? `<img src="${primaryImage}" alt="Recipe icon" class="rounded-md object-contain recipe-image shrink-0" style="width:48px;height:48px;" data-recipe-id="${recipe.id}" />`
              : ''
          }
          <h3 class="text-lg font-bold text-white">${recipe.name || 'Untitled Recipe'}</h3>
        </div>
      </div>
      <div class="mt-3">
        <div
          class="inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold text-white shadow-sm"
          style="background-color: ${profitBgColor};"
        >
          <img
            src="${currencyImagePath}"
            alt="${refCurrency}"
            class="inline-block align-middle"
            style="width:20px;height:20px;"
          />
          <span>${profitLabel}</span>
        </div>
      </div>
      <div class="mt-auto pt-4 flex justify-between items-center">
        <div class="flex items-center gap-2 text-xs">
          <span class="text-slate-400">Updated</span>
          <span
            class="recipe-updated text-slate-300"
            data-recipe-id="${recipe.id}"
            data-last-updated="${lastUpdatedGlobal}"
          >
            ${formatRelativeTime(lastUpdatedGlobal)}
          </span>
        </div>
      </div>
    `;

    // Make entire card clickable to open details modal
    card.addEventListener('click', () => openRecipeDetailsModal(recipe, index));

    // Fallback hover effect via inline styles so it works even if
    // Tailwind doesn't see dynamic classNames.
    card.addEventListener('mouseenter', () => {
      card.style.backgroundColor = 'rgba(30, 41, 59, 0.95)'; // slate-800-ish
      card.style.borderColor = '#64748b'; // slate-500
    });
    card.addEventListener('mouseleave', () => {
      card.style.backgroundColor = 'rgba(15, 23, 42, 0.8)'; // original slate-900/80
      card.style.borderColor = '#334155'; // original slate-700
    });

    recipesGrid.appendChild(card);
  });

  // Kick off async fetches for trade-based recipe images
  ensureRecipeTradeImages();
}

function updateRecipeTimestamps(): void {
  const elements = document.querySelectorAll<HTMLElement>('.recipe-updated');
  elements.forEach((el) => {
    const tsStr = el.dataset.lastUpdated;
    if (!tsStr) return;
    const ts = parseInt(tsStr, 10);
    if (!Number.isFinite(ts) || ts <= 0) return;
    el.textContent = formatRelativeTime(ts);
  });
}

export async function fetchRecipeTradePrices(recipe: Recipe): Promise<Record<string, PriceListing[]>> {
  const tradeItems = [...recipe.inputs, ...recipe.outputs].filter(
    (item) => item.type === 'trade_api' && item.tradeApiUrl,
  );

  const poeSessId = poeSessIdInput?.value || '';
  const result: Record<string, PriceListing[]> = {};

  for (const item of tradeItems) {
    const url = item.tradeApiUrl as string;
    try {
      result[url] = await getFirstPagePricesFromUrl(url, {
        maxPerPage: 10,
        sessionId: poeSessId || undefined,
      });
    } catch (error) {
      console.error('Failed to fetch trade prices for URL', url, error);
    }
  }

  return result;
}

// expose for debugging
// @ts-ignore
window.fetchRecipeTradePrices = fetchRecipeTradePrices;

function getRecipePrimaryImage(recipe: Recipe, fallbackCurrencyImage: string): string | null {
  const hasTradeOutput = recipe.outputs.some(
    (o) => o.type === 'trade_api' && !!o.tradeApiUrl,
  );

  // Only prefer cached trade image if the recipe currently has a trade output
  if (hasTradeOutput && recipeImageCache[recipe.id]) {
    return recipeImageCache[recipe.id];
  }

  // If there is no trade output (or none with image yet), fall back to first currency output image
  const currencyOutput = recipe.outputs.find((o) => o.type === 'currency' && o.currency);
  if (currencyOutput && currencyOutput.currency) {
    const info = currencyInfo[currencyOutput.currency];
    return getCurrencyImagePath(info?.imagePath || fallbackCurrencyImage || '');
  }

  return null;
}

async function ensureRecipeTradeImages(): Promise<void> {
  const recipesWithTradeOutputs = recipes.filter((recipe) =>
    recipe.outputs.some((o) => o.type === 'trade_api' && o.tradeApiUrl),
  );

  const poeSessId = poeSessIdInput?.value || '';

  for (const recipe of recipesWithTradeOutputs) {
    if (recipeImageCache[recipe.id]) continue;

    const tradeOutputs = recipe.outputs.filter(
      (o) => o.type === 'trade_api' && o.tradeApiUrl,
    ) as OutputItem[];

    if (!tradeOutputs.length) continue;

    const url = tradeOutputs[0].tradeApiUrl as string;

    try {
      const priceMap = await getFirstPagePricesFromUrl(url, {
        maxPerPage: 10,
        sessionId: poeSessId || undefined,
      });
      const firstWithImage = priceMap.find((p) => p.imageUrl);
      if (firstWithImage && firstWithImage.imageUrl) {
        recipeImageCache[recipe.id] = firstWithImage.imageUrl;
        const imgEl = document.querySelector<HTMLImageElement>(
          `.recipe-image[data-recipe-id="${recipe.id}"]`,
        );
        if (imgEl) {
          imgEl.src = firstWithImage.imageUrl;
        }
      }
    } catch (error) {
      console.error('Failed to fetch trade image for recipe', recipe.id, error);
    }
  }
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
          const name = item.label || 'Trade Search Query';
          return `<li class="text-sky-300 truncate">${name}</li>`;
        })
        .join('')}
    </ul>
  `;
}

function renderTradeDetails(recipe: Recipe): string {
  const inputTrades = recipe.inputs.filter(
    (item) => item.type === 'trade_api' && item.tradeApiUrl,
  );
  const outputTrades = recipe.outputs.filter(
    (item) => item.type === 'trade_api' && item.tradeApiUrl,
  );

  if (!inputTrades.length && !outputTrades.length) {
    return '<div class="text-sm text-slate-500">No trade listings for this recipe.</div>';
  }

  const poeSessId = poeSessIdInput?.value || '';

  const buildSection = (items: (InputItem | OutputItem)[], kind: 'input' | 'output') => {
    if (!items.length) return '';
    const cards = items
      .map((item, idx) => {
        const url = item.tradeApiUrl as string;
        const sectionId = `trade-section-${recipe.id}-${kind}-${idx}`;
        const buttonId = `trade-load-${recipe.id}-${kind}-${idx}`;
        const name = item.label || 'Trade Search Query';
        return `
          <div id="${sectionId}" class="rounded-lg border border-slate-700 p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="flex-1 mr-2">
                <div class="text-xs font-semibold text-slate-100 truncate">${name}</div>
                <code class="text-[10px] break-all text-slate-400">${url}</code>
              </div>
              <button
                id="${buttonId}"
                type="button"
                class="ml-2 rounded-md bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-500"
              >
                View listings
              </button>
            </div>
            <div class="text-xs text-slate-400">Cheapest listing (exalts), based on cached prices.</div>
          </div>
        `;
      })
      .join('');
    return `
      <div>
        <h5 class="text-xs font-semibold text-slate-200 mb-1">${
          kind === 'input' ? 'Input trade listings' : 'Output trade listings'
        }</h5>
        <div class="space-y-2">
          ${cards}
        </div>
      </div>
    `;
  };

  // Attach handlers after DOM update
  setTimeout(() => {
    ([
      { items: inputTrades, kind: 'input' as const },
      { items: outputTrades, kind: 'output' as const },
    ] as const).forEach(({ items, kind }) => {
      items.forEach((item, idx) => {
        const url = item.tradeApiUrl as string;
        const buttonId = `trade-load-${recipe.id}-${kind}-${idx}`;
        const sectionId = `trade-section-${recipe.id}-${kind}-${idx}`;
        const btn = document.getElementById(buttonId) as HTMLButtonElement | null;
        const section = document.getElementById(sectionId) as HTMLElement | null;
        if (!btn || !section) return;

        btn.onclick = async () => {
          btn.disabled = true;
          btn.textContent = 'Loading...';
          try {
            const listings = await getFirstPagePricesFromUrl(url, {
              maxPerPage: 10,
              sessionId: poeSessId || undefined,
            });
            const rows = listings
              .map((l) => {
                const exValue = convertTradePriceToExalts(l.currency, l.amount);
                const exStr = exValue != null ? exValue.toFixed(3) : 'N/A';
                return `
                  <tr>
                    <td class="px-2 py-1 text-xs text-slate-200">${l.amount} ${l.currency}</td>
                    <td class="px-2 py-1 text-xs text-slate-200">${exStr}</td>
                  </tr>
                `;
              })
              .join('');
            section.innerHTML = `
              <div class="flex items-center justify-between mb-2">
                <code class="text-xs break-all text-slate-300">${url}</code>
              </div>
              <table class="w-full text-left border-t border-slate-700 mt-1">
                <thead>
                  <tr>
                    <th class="px-2 py-1 text-xs text-slate-400">Listing</th>
                    <th class="px-2 py-1 text-xs text-slate-400">Value (exalts)</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            `;
          } catch (err) {
            console.error('Failed to load listings for details view', url, err);
            section.innerHTML += `<div class="mt-2 text-xs text-rose-400">Failed to load listings.</div>`;
          }
        };
      });
    });
  }, 0);

  return `<div class="space-y-3">
    ${buildSection(inputTrades, 'input')}
    ${buildSection(outputTrades, 'output')}
  </div>`;
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
  // TODO: this is set for currency = exalted orb based on currencyCache
  if (item.type === 'currency' && item.currency && item.amount && currencyCache.prices[item.currency]) {
    return (item.amount || 0) * (currencyCache.prices[item.currency] || 0);
  }
  if (item.type === 'trade_api' && item.tradeApiUrl) {
    const cheapest = getCachedCheapestPrice(item.tradeApiUrl, convertTradePriceToExalts);
    if (cheapest != null) {
      // Treat listing amount as chaos-equivalent price for profit math.
      return cheapest;
    }
  }
  return 0;
}

type ModalArea = 'input' | 'output';

function outputsEqual(a: OutputItem[], b: OutputItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x.type !== y.type) return false;
    if (x.currency !== y.currency) return false;
    if (x.tradeApiUrl !== y.tradeApiUrl) return false;
    if ((x.amount ?? 0) !== (y.amount ?? 0)) return false;
  }
  return true;
}

function openRecipeModal(recipe?: Recipe, index?: number): void {
  editingRecipeIndex = index ?? null;
  modalTitle.textContent = index !== undefined ? 'Edit Recipe' : 'Add Recipe';

  modalRecipeName.value = recipe?.name || '';
  modalThreshold.value = `${recipe?.threshold ?? 0}`;
  setToggleState(modalIsEnabled, recipe?.isEnabled ?? true);
  setToggleState(modalShowNotification, recipe?.showNotification ?? true);

  // Show delete button only when editing an existing recipe
  if (deleteModalBtn) {
    deleteModalBtn.style.display = editingRecipeIndex !== null ? 'inline-flex' : 'none';
  }

  modalInputs.innerHTML = '';
  modalOutputs.innerHTML = '';

  (recipe?.inputs || []).forEach((input) => appendModalEntry('input', input));
  (recipe?.outputs || []).forEach((output) => appendModalEntry('output', output));

  if (!recipe?.inputs?.length) appendModalEntry('input');
  if (!recipe?.outputs?.length) appendModalEntry('output');

  recipeModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeRecipeModal(goBackToDetails = false): void {
  recipeModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  const idx = editingRecipeIndex;
  editingRecipeIndex = null;

  if (goBackToDetails && idx !== null && recipes[idx]) {
    openRecipeDetailsModal(recipes[idx], idx);
  }
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

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = item.label ?? '';
  nameInput.placeholder = 'Query name (optional)';
  nameInput.className = 'flex-1 min-w-[120px] rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100';

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
      fieldsContainer.appendChild(nameInput);
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
      const nameInput = row.querySelector('input[type="text"]') as HTMLInputElement;
      if (!apiInput || !apiInput.value.trim()) return;

      items.push({
        type,
        tradeApiUrl: apiInput.value,
        label: nameInput && nameInput.value.trim() ? nameInput.value.trim() : undefined,
      });
    }
  });

  return items;
}

function saveRecipeFromModal(): void {
  const name = modalRecipeName.value.trim() || 'Untitled Recipe';
  const threshold = parseFloat(modalThreshold.value || '0') || 0;

  // Preserve existing recipe id when editing; generate a new one only for new recipes.
  const existingId =
    editingRecipeIndex !== null && recipes[editingRecipeIndex]
      ? recipes[editingRecipeIndex].id
      : null;

  const newRecipe: Recipe = {
    id: existingId ?? crypto.randomUUID(),
    isEnabled: getToggleState(modalIsEnabled),
    name,
    threshold,
    showNotification: getToggleState(modalShowNotification),
    inputs: collectModalEntries('input') as InputItem[],
    outputs: collectModalEntries('output') as OutputItem[],
  };

  const targetId = newRecipe.id;
  const targetIndex = recipes.findIndex((r) => r.id === targetId);

  if (targetIndex !== -1) {
    const oldRecipe = recipes[targetIndex];
    // Clear this recipe's image cache entry only if outputs changed.
    if (!outputsEqual(oldRecipe.outputs, newRecipe.outputs)) {
      delete recipeImageCache[oldRecipe.id];
    }
    recipes[targetIndex] = newRecipe;
  } else {
    recipes.push(newRecipe);
  }

  chrome.storage.sync.set({ recipes }, () => {
    loadRecipes();
    closeRecipeModal(false);
  });
}

function deleteRecipe(index: number): void {
  const [removed] = recipes.splice(index, 1);
  if (removed) {
    delete recipeImageCache[removed.id];
  }
  chrome.storage.sync.set({ recipes }, () => renderRecipes());
}
