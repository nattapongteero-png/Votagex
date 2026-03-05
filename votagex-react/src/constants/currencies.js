export const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', JPY: '¥', GBP: '£',
  KRW: '₩', CNY: '¥', AUD: '$', SGD: '$'
};

export const CURRENCY_RATES = {
  USD: 0.028,
  EUR: 0.026,
  JPY: 4.3,
  GBP: 0.022,
  KRW: 39,
  CNY: 0.2,
  AUD: 0.044,
  SGD: 0.038
};

export function convertCurrency(thb, currency) {
  if (!currency || !CURRENCY_RATES[currency]) return 0;
  return (thb * CURRENCY_RATES[currency]).toFixed(2);
}

export function convertToTHB(foreignAmount, currency) {
  if (!currency || !CURRENCY_RATES[currency]) return 0;
  return foreignAmount / CURRENCY_RATES[currency];
}
