// Utility functions
import { Currency } from './types/currencies.js';
export function getCurrencyImagePath(imagePath) {
    return `../../public/${imagePath}`;
}
export const currencyStringMap = {
    chaos: Currency.CHAOS_ORB,
    exalted: Currency.EXALTED_ORB,
    divine: Currency.DIVINE_ORB,
};
export function mapStringToCurrency(value) {
    return currencyStringMap[value] || Currency.EXALTED_ORB;
}
