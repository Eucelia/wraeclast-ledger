# Wraeclast Ledger

A Chrome extension that helps you design and track profitable crafting “recipes” for Path of Exile 2 (POE2). It pulls currency prices from the background script, lets you describe recipes using trade searches or raw currency amounts, and shows per‑recipe profit in a rich dashboard UI.

<img width="1610" height="531" alt="image" src="https://github.com/user-attachments/assets/b5edba8d-3569-4ee5-8556-0f2d267507cb" />

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

## Examples
Can be used to track profit for common crafts.

### Common Vaal corruption outcomes (e.g. adding a socket)
<img width="1013" height="859" alt="image" src="https://github.com/user-attachments/assets/1ce5b27a-02e5-4293-bb18-67c915defb1c" />

### Recombination with certain affixes
<img width="1024" height="824" alt="image" src="https://github.com/user-attachments/assets/2db2b706-88da-46ad-899c-fc04b3454502" />

You're able to specify your own custom recipes and have them update automatically.

## Installing the extension

1. Download as ZIP from Github and Unzip
2. In Chrome, open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project root directory.

## Using the dashboard

- Open the extension’s dashboard (Click on the divine orb icon in your extensions bar).
- Click **Add Recipe** to define inputs and outputs for a craft.
- Open the **Settings** menu to set league, `POESESSID` (which can be retrieved from the PoE trade page by pressing F12 and going to the Applications tab), and gold→exalt rate, then refresh prices and trade listings.
- Click any recipe card to open its **details modal** and **Total input cost**, **Total output value**, and overall profit.


## Development

This project uses TypeScript. To build:

```bash
npm install
npm run build
```


