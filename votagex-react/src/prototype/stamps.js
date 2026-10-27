import { useMemo } from 'react';
import { useCollection, useProto } from './useProto';
import { COUNTRIES, diffDays, parseISO, planStatus } from './data';

// The stamp book (StampBook): a postage stamp for every province and country collected, the same collection
// the me page counts (useCollection). Each stamp carries the trip that earned it, its date and a photo from
// there; the rest of the 77 provinces wait as empty outlines.

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
    return {
      provinces: number(prov),
      countries: number(abroad),
      missing: PROVINCES.filter(([th]) => !got.has(th)).map(([th, en]) => ({ name: th, en })),
      soon,
    };
  }, [plans, memories, places, today, provinces, countries]);
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
