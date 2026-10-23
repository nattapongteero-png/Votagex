import { useEffect, useSyncExternalStore } from 'react';
import { CURRENCIES } from './data';

// Live exchange rates from ExchangeRate-API's open endpoint (free, no key, CORS ok, updated once a day;
// attribution required, see the profile page). It covers every currency we use, TWD and VND included.
// The rates are written into CURRENCIES[c].toTHB, so the rest of the app reads them as before; until they
// arrive (or offline) the built-in ones stand in. Kept for 12 hours in localStorage.
const URL = 'https://open.er-api.com/v6/latest/THB';
const KEY = 'votagex.proto.rates';
const TTL = 12 * 60 * 60 * 1000;
const listeners = new Set();
let version = 0;
let started = false;
let updated = null; // when the provider last published the rates (ms)

function apply({ rates, at }) {
  // the response is THB → X; we keep X → THB
  Object.keys(CURRENCIES).forEach((c) => { if (rates[c]) CURRENCIES[c].toTHB = 1 / rates[c]; });
  updated = at;
  version++;
  listeners.forEach((l) => l());
}

function load() {
  if (started) return;
  started = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved?.rates) {
      apply(saved);
      if (Date.now() - saved.fetched < TTL) return;
    }
  } catch { /* no storage: just fetch */ }
  fetch(URL)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then((d) => {
      if (d.result !== 'success') return;
      const entry = { rates: d.rates, at: d.time_last_update_unix * 1000, fetched: Date.now() };
      try { localStorage.setItem(KEY, JSON.stringify(entry)); } catch { /* fine */ }
      apply(entry);
    })
    .catch(() => {});
}

// Re-renders when fresh rates land; returns when they were published (null = built-in rates)
export function useRates() {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version);
  useEffect(load, []);
  return updated;
}

// 1 unit in baht, readable: ฿0.2156 for yen, ฿38.12 for euro
export const fmtRate = (cur) => {
  const r = CURRENCIES[cur]?.toTHB ?? 1;
  return r >= 10 ? r.toFixed(2) : r >= 0.1 ? r.toFixed(3) : r.toPrecision(2);
};
