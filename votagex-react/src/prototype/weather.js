import { useEffect, useSyncExternalStore } from 'react';

// Daily forecast from Open-Meteo (free, no key, CORS ok). Forecasts only reach ~16 days ahead,
// so days further out simply have no weather.
const URL = 'https://api.open-meteo.com/v1/forecast';
// PM2.5 from Open-Meteo's air-quality model (same terms, no key); its forecast reaches ~5 days
const AQ_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const cache = new Map(); // "lat,lng" → { [iso]: { code, max, min, rain, mm, pm25 } } | 'loading' | 'error'
const listeners = new Set();
let version = 0;
const emit = () => { version++; listeners.forEach((l) => l()); };

const keyOf = (p) => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`;

function load(key) {
  if (cache.has(key)) return;
  cache.set(key, 'loading');
  const [lat, lng] = key.split(',');
  const q = `latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=auto&forecast_days=16`;
  const json = (r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)));
  // dust is a bonus: the forecast still shows if it fails
  const aq = fetch(`${AQ_URL}?latitude=${lat}&longitude=${lng}&hourly=pm2_5&current=pm2_5&timezone=auto&forecast_days=5`)
    .then(json).then(pm25ByDay).catch(() => ({}));
  Promise.all([fetch(`${URL}?${q}`).then(json), aq])
    .then(([{ daily: d }, pm]) => {
      cache.set(key, Object.fromEntries(d.time.map((t, i) => [t, {
        code: d.weather_code[i],
        max: Math.round(d.temperature_2m_max[i]),
        min: Math.round(d.temperature_2m_min[i]),
        rain: d.precipitation_probability_max[i],
        mm: d.precipitation_sum?.[i] ?? 0,
        pm25: pm[t] ?? null,
      }])));
      emit();
    })
    .catch(() => { cache.set(key, 'error'); emit(); });
}

// µg/m³ per day: the 24-hour mean (what the Thai standard is measured on); today uses the reading now
function pm25ByDay({ hourly: h, current }) {
  const days = {};
  h.time.forEach((t, i) => {
    const v = h.pm2_5[i];
    if (v == null) return;
    const d = (days[t.slice(0, 10)] ||= { sum: 0, n: 0 });
    d.sum += v;
    d.n++;
  });
  const out = Object.fromEntries(Object.entries(days).map(([d, { sum, n }]) => [d, Math.round(sum / n)]));
  if (current?.pm2_5 != null) out[current.time.slice(0, 10)] = Math.round(current.pm2_5);
  return out;
}

// Pollution Control Department's PM2.5 bands (24-hour mean, 2023 standard)
export function pm25Level(v) {
  if (v == null) return null;
  if (v <= 15) return { key: 'great', label: 'อากาศดีมาก' };
  if (v <= 25) return { key: 'good', label: 'อากาศดี' };
  if (v <= 37.5) return { key: 'fair', label: 'ปานกลาง' };
  if (v <= 75) return { key: 'poor', label: 'เริ่มมีผลต่อสุขภาพ' };
  return { key: 'bad', label: 'มีผลต่อสุขภาพ' };
}

// points: { [iso]: { lat, lng } } → { [iso]: weather }
export function useWeather(points) {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version);
  const keys = [...new Set(Object.values(points).map(keyOf))].sort().join('|');
  useEffect(() => { if (keys) keys.split('|').forEach(load); }, [keys]);
  const out = {};
  Object.entries(points).forEach(([day, p]) => {
    const days = cache.get(keyOf(p));
    if (days && typeof days === 'object' && days[day]) out[day] = days[day];
  });
  return out;
}

// How hard it rains that day: 0 none, 1 light, 2 moderate, 3 heavy, 4 very heavy. The day's total follows the
// Thai Meteorological Department's bands (0.1–10 / 10.1–35 / 35.1–90 / >90 mm); the WMO code's own intensity
// (drizzle, slight/moderate/heavy rain or showers, thunderstorm) counts too, whichever is higher.
export function rainLevel(w) {
  if (!w) return 0;
  const mm = w.mm ?? 0;
  const byMm = mm > 90 ? 4 : mm > 35 ? 3 : mm > 10 ? 2 : mm > 0 ? 1 : 0;
  const c = w.code;
  const byCode = c >= 95 ? 3 : [65, 82, 67].includes(c) ? 3 : [63, 81].includes(c) ? 2 : (c >= 51 && c <= 61) || c === 80 || c === 66 ? 1 : 0;
  return Math.max(byMm, byCode);
}

// WMO weather code → icon + Thai label
export function weatherKind(code) {
  if (code === 0) return { icon: 'wSun', label: 'แดดจัด' };
  if (code <= 2) return { icon: 'wPartly', label: 'มีเมฆบางส่วน' };
  if (code === 3) return { icon: 'wCloud', label: 'เมฆมาก' };
  if (code <= 48) return { icon: 'wFog', label: 'หมอก' };
  if (code >= 95) return { icon: 'wStorm', label: 'พายุฝนฟ้าคะนอง' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: 'wSnow', label: 'หิมะ' };
  if (code <= 57) return { icon: 'wRain', label: 'ฝนปรอย' };
  return { icon: 'wRain', label: 'ฝนตก' };
}
