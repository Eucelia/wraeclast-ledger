// Utility functions

import { Currency } from './types/currencies.js';

export function getCurrencyImagePath(imagePath: string): string {
  return `../../public/${imagePath}`;
}

export const currencyStringMap: Record<string, Currency> = {
  chaos: Currency.CHAOS_ORB,
  exalted: Currency.EXALTED_ORB,
  divine: Currency.DIVINE_ORB,
};

export function mapStringToCurrency(value: string): Currency {
  return currencyStringMap[value] || Currency.EXALTED_ORB;
}
