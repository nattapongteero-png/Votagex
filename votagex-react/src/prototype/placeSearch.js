import { useEffect, useState } from 'react';
import { DESTINATIONS, guessCat, HOME } from './data';

/* ---------- Photon (komoot) search: free, no key, fair use → debounce + cache ---------- */
const cache = new Map();

function fromPhoton(f) {
  const p = f.properties;
  const [lng, lat] = f.geometry.coordinates;
  const prov = (p.state || (p.countrycode === 'TH' ? p.city : '') || '').replace(/^จังหวัด/, '');
  const area = [p.district || p.locality || p.suburb, p.city || p.county, p.countrycode === 'TH' ? null : p.country]
    .filter((x, i, a) => x && a.indexOf(x) === i && x !== p.name).join(' · ');
  return {
    key: `${p.osm_type}${p.osm_id}`,
    name: p.name || p.street || 'ไม่มีชื่อ',
    area: area || prov || p.country || '',
    prov,
    country: p.countrycode,
    lat, lng,
    cat: guessCat(p.osm_key, p.osm_value),
  };
}

export async function searchPlaces(q, bias = HOME) {
  const key = `${q}|${bias.lat.toFixed(1)},${bias.lng.toFixed(1)}`;
  if (cache.has(key)) return cache.get(key);
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lat=${bias.lat}&lon=${bias.lng}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const json = await res.json();
  // OSM often has several objects for one place (node + area); keep the first of each name nearby
  const out = [];
  json.features.map(fromPhoton).forEach((r) => {
    const dup = out.some((o) => o.name === r.name && Math.abs(o.lat - r.lat) < 0.02 && Math.abs(o.lng - r.lng) < 0.02);
    if (!dup) out.push(r);
  });
  cache.set(key, out);
  return out;
}

export function matchDestinations(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return DESTINATIONS.filter((d) => d.name.toLowerCase().includes(s) || d.keys.includes(s))
    .map((d) => ({ key: `dest-${d.name}`, name: d.name, area: d.country === 'TH' ? d.prov : '', prov: d.prov || '', country: d.country, lat: d.lat, lng: d.lng, cat: 'sight' }));
}

// Debounced search hook. `local` results (e.g. popular destinations) are shown first.
export function usePlaceSearch(query, { bias, withDestinations = false, minLength = 2 } = {}) {
  const [state, setState] = useState({ results: [], loading: false, error: false, q: '' });
  const q = query.trim();
  const biasKey = bias ? `${bias.lat},${bias.lng}` : '';

  useEffect(() => {
    if (q.length < minLength) return undefined;
    let alive = true;
    const t = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true }));
      const local = withDestinations ? matchDestinations(q) : [];
      try {
        const remote = await searchPlaces(q, bias || HOME);
        if (alive) setState({ results: [...local, ...remote].slice(0, 8), loading: false, error: false, q });
      } catch {
        if (alive) setState({ results: local, loading: false, error: true, q });
      }
    }, 350);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, biasKey, withDestinations, minLength]);

  return q.length < minLength ? { results: [], loading: false, error: false } : state;
}

/* ---------- shared links / captions ---------- */
const URL_RE = /https?:\/\/[^\s]+/i;

// Understand what the user pasted or shared from TikTok / Instagram / Google Maps
export function parseShared(text) {
  const raw = (text || '').trim();
  if (!raw) return null;
  const urlMatch = raw.match(URL_RE);
  const url = urlMatch ? urlMatch[0].replace(/[),.]+$/, '') : null;
  const caption = raw.replace(URL_RE, '').trim();
  const out = { url, caption, candidates: captionCandidates(caption) };

  if (!url) return { ...out, type: 'text' };

  let m = url.match(/tiktok\.com\/@([^/?#]+)\/(?:video|photo)\/(\d+)/i);
  if (m) return { ...out, type: 'tiktok', author: `@${m[1]}`, videoId: m[2] };
  if (/(?:vt|vm)\.tiktok\.com|tiktok\.com\/t\//i.test(url)) return { ...out, type: 'tiktok', short: true };

  m = url.match(/instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (m) return { ...out, type: 'instagram', igKind: m[1] === 'reels' ? 'reel' : m[1], code: m[2] };
  if (/instagram\.com/i.test(url)) return { ...out, type: 'instagram' };

  if (/google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url)) {
    const place = parseGoogleMaps(url);
    return { ...out, type: 'maps', place, short: !place && /goo\.gl/i.test(url) };
  }
  return { ...out, type: 'web' };
}

export function parseGoogleMaps(url) {
  let u = url;
  try { u = decodeURIComponent(url); } catch { /* keep raw */ }
  const precise = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const at = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const q = u.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  const hit = precise || q || at;
  if (!hit) return null;
  const nameMatch = u.match(/\/maps\/place\/([^/@?]+)/);
  const name = nameMatch ? nameMatch[1].replace(/\+/g, ' ').trim() : 'ตำแหน่งจากลิงก์';
  return { name, lat: parseFloat(hit[1]), lng: parseFloat(hit[2]) };
}

// Pull likely place names out of a caption: "📍Name" first, then hashtags
export function captionCandidates(caption) {
  if (!caption) return [];
  const out = [];
  const pin = caption.match(/📍\s*([^\n#@]+)/u);
  if (pin) out.push(pin[1].replace(/[\p{Extended_Pictographic}]/gu, '').trim());
  for (const m of caption.matchAll(/#([\p{L}\p{M}\p{N}_]+)/gu)) out.push(m[1].replace(/_/g, ' '));
  return [...new Set(out)].filter((s) => s.length > 1).slice(0, 5);
}

// TikTok's oEmbed is public and CORS-enabled; it confirms the clip exists (caption/thumbnail are no longer returned)
export async function checkTikTok(url) {
  const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`oEmbed ${res.status}`);
  return res.json();
}

export const tiktokPlayer = (id) => `https://www.tiktok.com/player/v1/${id}?description=1&music_info=0&rel=0`;
export const instagramEmbed = (kind, code) => `https://www.instagram.com/${kind}/${code}/embed/`;
