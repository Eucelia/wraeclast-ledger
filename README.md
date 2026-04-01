# POE2 Profit Watch

A Chrome extension that monitors Path of Exile 2 (POE2) profits by making background POST requests on a timer, performing calculations, and notifying users when profit conditions are met.

## Features

- Background timer-based checks for profits
- Configurable recipes with inputs and outputs
- Support for Trade API URLs and POE2 Scout currency amounts
- Notifications when profit thresholds are exceeded
- Options page for managing recipes

## Recipe Structure

Each recipe consists of:

- **Name**: Descriptive label for the recipe
- **Inputs**: Array of input items, each defined as either:
  - Trade API URL (for fetching item prices)
  - Currency amount (using [POE2 Scout API](https://poe2scout.com/api/currency/{currency}))
- **Outputs**: Array of output items, each defined as either:
  - Trade API URL
  - Currency amount
- **Threshold**: Minimum profit amount to trigger notifications

Profit is calculated as: Total Output Value - Total Input Cost

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

## Installation

1. Build the project: `npm run build`
2. Load the extension in Chrome: Go to chrome://extensions/, enable Developer mode, click "Load unpacked", select the project folder
3. Configure recipes in the options page

## Usage

- Click the extension icon to open the popup
- Use "Open Configuration" to add/edit recipes
- The extension will check profits in the background and notify when conditions are met
