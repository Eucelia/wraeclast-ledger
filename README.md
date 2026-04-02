# Wraeclast Ledger

A Chrome extension that helps you design and track profitable crafting “recipes” for Path of Exile 2 (POE2). It pulls currency prices from the background script, lets you describe recipes using trade searches or raw currency amounts, and shows per‑recipe profit in a rich dashboard UI.

## Features

- **Dashboard UI** for browsing all recipes as cards with live profit indicators
- **Recipe editor modal** with separate Inputs / Outputs, support for:
  - Trade API URLs (priced via cached listings)
  - Direct currency amounts (using cached currency prices)
  - Input multiplier (e.g. “run this 3 times”)
- **Details modal** per recipe showing:
  - Inputs / outputs summaries with icons
  - Per‑item value breakdowns
- **Settings panel**:
  - League selector
  - `POESESSID` input for authenticated trade calls
  - Gold→Exalt conversion rate
  - Buttons to refresh currency prices, recompute profits, refresh trade listings, and clear the trade cache
- **Background price cache** and trade‑listing cache managed via `service-worker` and `price-cache`

## Development

This project uses TypeScript. To build:

```bash
npm install
npm run build
```

For development with watch mode:

```bash
npm run watch
```

## Installing the extension

1. Run `npm run build`.
2. In Chrome, open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project root directory.

## Using the dashboard

- Open the extension’s dashboard (the `dashboard.html` page bundled with the extension).
- Click **Add Recipe** to define inputs and outputs for a craft.
- Open the **Settings** menu to set league, `POESESSID`, and gold→exalt rate, then refresh prices and trade listings.
- Click any recipe card to open its **details modal** and inspect the aligned breakdown of **Total input cost**, **Total output value**, and overall profit.

