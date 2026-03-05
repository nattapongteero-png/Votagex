import { CURRENCY_SYMBOLS } from '../constants/currencies';

export function formatNumberComma(num) {
  if (!num && num !== 0) return '';
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export function stripCommas(str) {
  return str.replace(/,/g, '');
}

function formatAbbreviated(num) {
  if (num >= 1000000) {
    const val = num / 1000000;
    return val % 1 === 0 ? `${val}M` : `${val.toFixed(1)}M`;
  }
  if (num >= 1000) {
    const val = num / 1000;
    return val % 1 === 0 ? `${val}k` : `${val.toFixed(1)}k`;
  }
  return String(num);
}

export function formatSpend(amount, currency) {
  if (!amount) return '0';
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  if (currency && currency !== 'THB') {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${formatAbbreviated(num)}`;
  }
  return formatAbbreviated(num);
}

export function formatBudgetDisplay(budget) {
  if (!budget) return '0';
  const num = parseFloat(String(budget).replace(/,/g, ''));
  if (isNaN(num)) return '0';
  return formatAbbreviated(num);
}

export function getActivityAmountForDay(activity, dateStr) {
  if (activity.category === 'hotel') {
    const nights = getHotelNightsNum(activity);
    if (nights <= 0) return 0;
    const total = parseFloat(activity.amount) || 0;
    return total / nights;
  }
  return parseFloat(activity.amount) || 0;
}

function getHotelNightsNum(activity) {
  if (!activity.checkIn || !activity.checkOut) return 0;
  const d1 = new Date(activity.checkIn);
  const d2 = new Date(activity.checkOut);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}
