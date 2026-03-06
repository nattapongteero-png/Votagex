export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'KRW', symbol: '₩', name: 'Korean Won', flag: '🇰🇷' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', symbol: '$', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'TWD', symbol: '$', name: 'Taiwan Dollar', flag: '🇹🇼' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'NZD', symbol: '$', name: 'New Zealand Dollar', flag: '🇳🇿' }
];

export const CURRENCY_SYMBOLS = Object.fromEntries(CURRENCIES.map(c => [c.code, c.symbol]));

// Rates: 1 THB = X foreign currency (updated Mar 2026)
const DEFAULT_RATES = {
  USD: 0.0317, EUR: 0.0272, JPY: 4.979, GBP: 0.0237,
  KRW: 46.49, CNY: 0.2194, AUD: 0.045, SGD: 0.0404,
  HKD: 0.247, TWD: 1.025, MYR: 0.141, VND: 808,
  INR: 2.72, CHF: 0.028, NZD: 0.0525
};

let cachedRates = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export async function fetchRates() {
  if (cachedRates && Date.now() - cacheTime < CACHE_TTL) return cachedRates;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/THB');
    const data = await res.json();
    if (data.result === 'success') {
      cachedRates = data.rates;
      cacheTime = Date.now();
      return cachedRates;
    }
  } catch { /* fallback to default */ }
  return null;
}

export function getRate(currency) {
  if (cachedRates && cachedRates[currency]) return cachedRates[currency];
  return DEFAULT_RATES[currency] || 0;
}

export function convertCurrency(thb, currency) {
  if (!currency) return 0;
  const rate = getRate(currency);
  return (thb * rate).toFixed(2);
}

export function convertToTHB(foreignAmount, currency) {
  if (!currency) return 0;
  const rate = getRate(currency);
  if (!rate) return 0;
  return foreignAmount / rate;
}
