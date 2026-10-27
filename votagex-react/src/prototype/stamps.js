import { useMemo } from 'react';
import { useCollection, useProto } from './useProto';
import { COUNTRIES, ME, PEOPLE, addDays, byOrder, diffDays, distanceKm, parseISO, planStatus, thaiShort, thaiYear } from './data';

// The stamp book (StampBook): a postage stamp for every province and country collected, the same collection
// the me page counts (useCollection). Each stamp carries the trip that earned it, its date and a photo from
// there; the book has a space for each of the 77 provinces, region by region.

export const PROVINCES = [
  ['กรุงเทพมหานคร', 'Bangkok'], ['กระบี่', 'Krabi'], ['กาญจนบุรี', 'Kanchanaburi'], ['กาฬสินธุ์', 'Kalasin'],
  ['กำแพงเพชร', 'Kamphaeng Phet'], ['ขอนแก่น', 'Khon Kaen'], ['จันทบุรี', 'Chanthaburi'], ['ฉะเชิงเทรา', 'Chachoengsao'],
  ['ชลบุรี', 'Chon Buri'], ['ชัยนาท', 'Chai Nat'], ['ชัยภูมิ', 'Chaiyaphum'], ['ชุมพร', 'Chumphon'],
  ['เชียงราย', 'Chiang Rai'], ['เชียงใหม่', 'Chiang Mai'], ['ตรัง', 'Trang'], ['ตราด', 'Trat'], ['ตาก', 'Tak'],
  ['นครนายก', 'Nakhon Nayok'], ['นครปฐม', 'Nakhon Pathom'], ['นครพนม', 'Nakhon Phanom'], ['นครราชสีมา', 'Nakhon Ratchasima'],
  ['นครศรีธรรมราช', 'Nakhon Si Thammarat'], ['นครสวรรค์', 'Nakhon Sawan'], ['นนทบุรี', 'Nonthaburi'], ['นราธิวาส', 'Narathiwat'],
  ['น่าน', 'Nan'], ['บึงกาฬ', 'Bueng Kan'], ['บุรีรัมย์', 'Buri Ram'], ['ปทุมธานี', 'Pathum Thani'],
  ['ประจวบคีรีขันธ์', 'Prachuap Khiri Khan'], ['ปราจีนบุรี', 'Prachin Buri'], ['ปัตตานี', 'Pattani'],
  ['พระนครศรีอยุธยา', 'Ayutthaya'], ['พะเยา', 'Phayao'], ['พังงา', 'Phang Nga'], ['พัทลุง', 'Phatthalung'],
  ['พิจิตร', 'Phichit'], ['พิษณุโลก', 'Phitsanulok'], ['เพชรบุรี', 'Phetchaburi'], ['เพชรบูรณ์', 'Phetchabun'],
  ['แพร่', 'Phrae'], ['ภูเก็ต', 'Phuket'], ['มหาสารคาม', 'Maha Sarakham'], ['มุกดาหาร', 'Mukdahan'],
  ['แม่ฮ่องสอน', 'Mae Hong Son'], ['ยโสธร', 'Yasothon'], ['ยะลา', 'Yala'], ['ร้อยเอ็ด', 'Roi Et'], ['ระนอง', 'Ranong'],
  ['ระยอง', 'Rayong'], ['ราชบุรี', 'Ratchaburi'], ['ลพบุรี', 'Lop Buri'], ['ลำปาง', 'Lampang'], ['ลำพูน', 'Lamphun'],
  ['เลย', 'Loei'], ['ศรีสะเกษ', 'Si Sa Ket'], ['สกลนคร', 'Sakon Nakhon'], ['สงขลา', 'Songkhla'], ['สตูล', 'Satun'],
  ['สมุทรปราการ', 'Samut Prakan'], ['สมุทรสงคราม', 'Samut Songkhram'], ['สมุทรสาคร', 'Samut Sakhon'], ['สระแก้ว', 'Sa Kaeo'],
  ['สระบุรี', 'Saraburi'], ['สิงห์บุรี', 'Sing Buri'], ['สุโขทัย', 'Sukhothai'], ['สุพรรณบุรี', 'Suphan Buri'],
  ['สุราษฎร์ธานี', 'Surat Thani'], ['สุรินทร์', 'Surin'], ['หนองคาย', 'Nong Khai'], ['หนองบัวลำภู', 'Nong Bua Lam Phu'],
  ['อ่างทอง', 'Ang Thong'], ['อำนาจเจริญ', 'Amnat Charoen'], ['อุดรธานี', 'Udon Thani'], ['อุตรดิตถ์', 'Uttaradit'],
  ['อุทัยธานี', 'Uthai Thani'], ['อุบลราชธานี', 'Ubon Ratchathani'],
];
const EN = Object.fromEntries(PROVINCES);

// the six regions (as the Royal Society divides them), each a page of the book with a space for every province
export const REGIONS = [
  ['north', 'ภาคเหนือ', ['เชียงราย', 'เชียงใหม่', 'น่าน', 'พะเยา', 'แพร่', 'แม่ฮ่องสอน', 'ลำปาง', 'ลำพูน', 'อุตรดิตถ์']],
  ['isan', 'ภาคอีสาน', ['กาฬสินธุ์', 'ขอนแก่น', 'ชัยภูมิ', 'นครพนม', 'นครราชสีมา', 'บึงกาฬ', 'บุรีรัมย์', 'มหาสารคาม', 'มุกดาหาร', 'ยโสธร',
    'ร้อยเอ็ด', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อำนาจเจริญ', 'อุดรธานี', 'อุบลราชธานี']],
  ['central', 'ภาคกลาง', ['กรุงเทพมหานคร', 'กำแพงเพชร', 'ชัยนาท', 'นครนายก', 'นครปฐม', 'นครสวรรค์', 'นนทบุรี', 'ปทุมธานี', 'พระนครศรีอยุธยา', 'พิจิตร',
    'พิษณุโลก', 'เพชรบูรณ์', 'ลพบุรี', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สระบุรี', 'อ่างทอง', 'อุทัยธานี']],
  ['east', 'ภาคตะวันออก', ['จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ตราด', 'ปราจีนบุรี', 'ระยอง', 'สระแก้ว']],
  ['west', 'ภาคตะวันตก', ['กาญจนบุรี', 'ตาก', 'ประจวบคีรีขันธ์', 'เพชรบุรี', 'ราชบุรี']],
  ['south', 'ภาคใต้', ['กระบี่', 'ชุมพร', 'ตรัง', 'นครศรีธรรมราช', 'นราธิวาส', 'ปัตตานี', 'พังงา', 'พัทลุง', 'ภูเก็ต', 'ระนอง', 'สตูล', 'สงขลา', 'สุราษฎร์ธานี', 'ยะลา']],
];
const COUNTRY_EN = { TH: 'Thailand', JP: 'Japan', KR: 'Korea', TW: 'Taiwan', SG: 'Singapore', HK: 'Hong Kong', VN: 'Vietnam', FR: 'France', US: 'United States' };

const checkedIn = (s) => Object.keys(s.checkIns || {}).length > 0;

// every stamp collected, oldest first, and what is still to collect:
// { key, kind: 'prov' | 'country', name, en, no, date, year, photo, from: [trip names], planId }
export function useStamps() {
  const { plans, memories, places, today } = useProto();
  const { provinces, countries } = useCollection();
  return useMemo(() => {
    const past = plans.filter((p) => planStatus(p, today) === 'past');
    const photoAt = (stopIds) => memories.find((m) => m.photos?.length && stopIds.includes(m.stopId))?.photos[0];
    const prov = provinces.map(({ name, from }) => {
      const hits = past.flatMap((p) => p.stops.filter((s) => s.prov === name && checkedIn(s)).map((s) => ({ p, s })))
        .sort((a, b) => (a.s.date || '').localeCompare(b.s.date || ''));
      const first = hits[0];
      const place = places.find((x) => x.status === 'visited' && x.prov === name);
      return {
        key: `p:${name}`, kind: 'prov', name, en: EN[name] || name, from,
        date: first?.s.date || place?.savedAt || today, planId: first?.p.id,
        photo: photoAt(hits.map((h) => h.s.id)) || hits.map((h) => h.p.cover?.img).find(Boolean) || null,
      };
    });
    const abroad = countries.filter((c) => c !== 'TH').map((code) => {
      const trips = past.filter((p) => p.country === code).sort((a, b) => a.startDate.localeCompare(b.startDate));
      return {
        key: `c:${code}`, kind: 'country', code, name: COUNTRIES[code]?.name || code, en: COUNTRY_EN[code] || code, from: trips.map((p) => p.name),
        date: trips[0]?.startDate || today, planId: trips[0]?.id,
        photo: photoAt(trips.flatMap((p) => p.stops.map((s) => s.id))) || trips.map((p) => p.cover?.img).find(Boolean) || null,
      };
    });
    const byDate = (a, b) => a.date.localeCompare(b.date);
    const number = (list) => list.sort(byDate).map((s, i) => ({ ...s, no: i + 1, year: parseISO(s.date).getFullYear() + 543 }));
    const got = new Set(provinces.map((p) => p.name));
    // countries a trip is booked for: their stamp is on its way
    const soon = plans.filter((p) => p.country && p.country !== 'TH' && !countries.includes(p.country) && planStatus(p, today) !== 'past' && p.startDate)
      .map((p) => ({ code: p.country, name: COUNTRIES[p.country]?.name || p.country, days: diffDays(today, p.startDate) }));
    const stamps = number(prov);
    return {
      provinces: stamps,
      countries: number(abroad),
      missing: PROVINCES.filter(([th]) => !got.has(th)).map(([th, en]) => ({ name: th, en })),
      // each region's spaces: the stamps in it first, then the provinces still to go
      regions: REGIONS.map(([key, name, list]) => ({
        key, name, total: list.length,
        stamps: stamps.filter((s) => list.includes(s.name)),
        missing: list.filter((th) => !got.has(th)).map((th) => ({ name: th, en: EN[th] })),
      })),
      soon,
    };
  }, [plans, memories, places, today, provinces, countries]);
}

// the stamp a trip goes with (from useStamps): abroad, its country's; at home, the province it checked in at most
export function stampOfTrip({ provinces, countries }, plan) {
  if (!plan) return null;
  if (plan.country && plan.country !== 'TH') return countries.find((s) => s.code === plan.country) || null;
  const count = {};
  plan.stops.forEach((s) => { if (s.prov && checkedIn(s)) count[s.prov] = (count[s.prov] || 0) + 1; });
  const most = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
  return provinces.find((s) => s.name === most) || null;
}

// the stamp a trip still under way will get (for its postcard): its own, else one made up for the province most
// of its stops are in (or its country), numbered next in the book
export function stampToSend(stamps, plan, today) {
  const own = stampOfTrip(stamps, plan);
  if (own || !plan) return own;
  const year = parseISO(today).getFullYear() + 543;
  if (plan.country && plan.country !== 'TH') {
    const code = plan.country;
    return { key: `c:${code}`, kind: 'country', code, name: COUNTRIES[code]?.name || code, en: COUNTRY_EN[code] || code, no: stamps.countries.length + 1, date: today, year, photo: null, from: [plan.name] };
  }
  const count = {};
  plan.stops.forEach((s) => { if (s.prov) count[s.prov] = (count[s.prov] || 0) + 1; });
  const most = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
  if (!most) return null;
  return stamps.provinces.find((s) => s.name === most)
    || { key: `p:${most}`, kind: 'prov', name: most, en: EN[most] || most, no: stamps.provinces.length + 1, date: today, year, photo: null, from: [plan.name] };
}

// what a trip's postcard (Postcard.jsx) shows; `label` heads its back (the home page's "วันนี้เมื่อปีที่แล้ว")
export function postcardOf({ plan, memories, postcards, stamp, label, today }) {
  const stops = plan.stops.filter((s) => s.date && !s.skip).sort((a, b) => a.date.localeCompare(b.date) || byOrder(a, b));
  const pins = stops.filter((s) => s.lat != null);
  const photos = memories.filter((m) => m.planId === plan.id).flatMap((m) => m.photos || []);
  const sent = postcards.find((x) => x.planId === plan.id && x.by === ME);
  const arrived = sent && today >= addDays(sent.deliver, -3); // as the look-back's "this day" (±3 days)
  return {
    key: plan.id, label, title: plan.name,
    date: `${thaiShort(plan.startDate)} ${thaiYear(plan.startDate)}`,
    where: stamp ? (stamp.kind === 'prov' ? `${stamp.en} · Thailand` : stamp.en) : plan.destination?.name || '',
    photo: plan.cover?.img || photos[0] || null,
    note: arrived ? { text: sent.text, name: PEOPLE[sent.by]?.name, avatar: PEOPLE[sent.by]?.avatar, on: `${thaiShort(sent.on)} ${thaiYear(sent.on)}` } : null,
    numbers: [
      [stops.length, 'ที่'],
      [Math.round(pins.reduce((t, s, i) => (i ? t + distanceKm(pins[i - 1], s) : 0), 0)), 'กม.'],
      [photos.length, 'รูป'],
    ],
    stamp,
    // the postmark: where the stamp is from, dated the day it was posted
    mark: stamp && { ...stamp, key: `pc-${plan.id}`, date: sent?.on || plan.startDate, year: thaiYear(sent?.on || plan.startDate) },
  };
}

// a seeded random in [0, 1) from a string, so a stamp always sits at the same tilt
export function seeded(key, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < key.length; i += 1) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

// a postage stamp's outline, w × h, its edges bitten by perforation holes of radius r about every `step`
// (evenly spread, so each edge starts and ends on a tooth); an SVG path, for clip-path and for canvas
export function perforated(w, h, r = 4, step = 13) {
  const out = [`M0,0`];
  const edge = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0); const dx = (x1 - x0) / len; const dy = (y1 - y0) / len;
    const n = Math.max(1, Math.round(len / step)); const gap = len / n;
    for (let i = 0; i < n; i += 1) {
      const c = (i + 0.5) * gap;
      out.push(`L${(x0 + dx * (c - r)).toFixed(2)},${(y0 + dy * (c - r)).toFixed(2)}`);
      out.push(`A${r},${r} 0 0 0 ${(x0 + dx * (c + r)).toFixed(2)},${(y0 + dy * (c + r)).toFixed(2)}`);
    }
    out.push(`L${x1},${y1}`);
  };
  edge(0, 0, w, 0); edge(w, 0, w, h); edge(w, h, 0, h); edge(0, h, 0, 0);
  return `${out.join(' ')} Z`;
}
