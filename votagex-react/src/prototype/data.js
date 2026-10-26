// Sample data and helpers for the /proto prototype.
// Dates are generated relative to the real today so the demo always reads as "current".

/* ---------- dates ---------- */
const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
export const TODAY = iso(new Date());
const rel = (n) => addDays(TODAY, n);

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
// Keep a Thai name on one line: browsers break Thai with a dictionary, and names it doesn't know (โอซาก้า)
// get split mid-word. A word joiner between Thai letters stops that; spaces still break.
export const keepThai = (s) => (s || '').replace(/([\u0E00-\u0E7F])(?=[\u0E01-\u0E30\u0E32\u0E33\u0E3F-\u0E46\u0E4F-\u0E5B])/g, '$1\u2060');
export const thaiShort = (s) => { const d = parseISO(s); return `${d.getDate()} ${TH_MONTHS[d.getMonth()]}`; };
export const thaiDay = (s) => TH_DAYS[parseISO(s).getDay()];
export const thaiYear = (s) => parseISO(s).getFullYear() + 543;
export function thaiRange(a, b) {
  if (!a) return 'ยังไม่กำหนดวัน';
  if (!b || a === b) return `${thaiDay(a)} ${thaiShort(a)}`;
  const da = parseISO(a), db = parseISO(b);
  if (da.getMonth() === db.getMonth()) return `${da.getDate()}–${db.getDate()} ${TH_MONTHS[db.getMonth()]}`;
  return `${thaiShort(a)} – ${thaiShort(b)}`;
}
export function dayList(a, b) {
  if (!a) return [];
  const out = [];
  for (let s = a; s <= (b || a); s = addDays(s, 1)) out.push(s);
  return out;
}

// Wall-clock "HH:MM" at a UTC offset (destination time during trips abroad)
export function localHM(utc = 7) {
  const d = new Date(Date.now() + (utc * 60 + new Date().getTimezoneOffset()) * 60000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const byTime = (a, b) => (a.time || '99').localeCompare(b.time || '99');
// a day's stops in the order set by dragging (order), else by time; a time always sits between its neighbours'
export const byOrder = (a, b) => (a.order ?? 1e12) - (b.order ?? 1e12) || byTime(a, b);
// the next order on a day that's been dragged into order (none if it hasn't: time decides)
export const nextOrder = (stops, date) => {
  const set = stops.filter((s) => s.date === date && s.order != null);
  return set.length ? Math.max(...set.map((s) => s.order)) + 1 : null;
};

/* ---------- money ---------- */
export const CURRENCIES = {
  THB: { symbol: '฿', toTHB: 1, label: 'บาท' },
  JPY: { symbol: '¥', toTHB: 0.23, label: 'เยน' },
  KRW: { symbol: '₩', toTHB: 0.025, label: 'วอน' },
  TWD: { symbol: 'NT$', toTHB: 1.1, label: 'ดอลลาร์ไต้หวัน' },
  SGD: { symbol: 'S$', toTHB: 26, label: 'ดอลลาร์สิงคโปร์' },
  HKD: { symbol: 'HK$', toTHB: 4.4, label: 'ดอลลาร์ฮ่องกง' },
  VND: { symbol: '₫', toTHB: 0.0013, label: 'ดอง' },
  EUR: { symbol: '€', toTHB: 38, label: 'ยูโร' },
  USD: { symbol: '$', toTHB: 34, label: 'ดอลลาร์' },
};
export function fmtMoney(n, cur = 'THB') {
  const c = CURRENCIES[cur] || CURRENCIES.THB;
  return `${c.symbol}${Math.round(n).toLocaleString('en-US')}`;
}
export const toTHB = (e) => e.amount * e.toTHB;

/* ---------- countries ---------- */
export const COUNTRIES = {
  TH: { name: 'ไทย', currency: 'THB', utc: 7 },
  JP: { name: 'ญี่ปุ่น', currency: 'JPY', utc: 9 },
  KR: { name: 'เกาหลีใต้', currency: 'KRW', utc: 9 },
  TW: { name: 'ไต้หวัน', currency: 'TWD', utc: 8 },
  SG: { name: 'สิงคโปร์', currency: 'SGD', utc: 8 },
  HK: { name: 'ฮ่องกง', currency: 'HKD', utc: 8 },
  VN: { name: 'เวียดนาม', currency: 'VND', utc: 7 },
  FR: { name: 'ฝรั่งเศส', currency: 'EUR', utc: 1 },
  US: { name: 'อเมริกา', currency: 'USD', utc: -5 },
};
export const countryOf = (code) => ({ ...(COUNTRIES[code] || { name: code || '-', currency: 'THB', utc: 7 }), code });

// Popular destinations matched before hitting Photon (Photon is weak on Thai spellings of foreign cities)
export const DESTINATIONS = [
  { name: 'กรุงเทพฯ', country: 'TH', lat: 13.7563, lng: 100.5018, prov: 'กรุงเทพมหานคร', keys: 'bangkok กทม' },
  { name: 'เชียงใหม่', country: 'TH', lat: 18.7883, lng: 98.9853, prov: 'เชียงใหม่', keys: 'chiang mai' },
  { name: 'เชียงราย', country: 'TH', lat: 19.9105, lng: 99.8406, prov: 'เชียงราย', keys: 'chiang rai' },
  { name: 'น่าน', country: 'TH', lat: 18.7756, lng: 100.773, prov: 'น่าน', keys: 'nan' },
  { name: 'เขาใหญ่', country: 'TH', lat: 14.4389, lng: 101.3722, prov: 'นครราชสีมา', keys: 'khao yai' },
  { name: 'พัทยา', country: 'TH', lat: 12.9236, lng: 100.8825, prov: 'ชลบุรี', keys: 'pattaya' },
  { name: 'หัวหิน', country: 'TH', lat: 12.5684, lng: 99.9577, prov: 'ประจวบคีรีขันธ์', keys: 'hua hin' },
  { name: 'ภูเก็ต', country: 'TH', lat: 7.8804, lng: 98.3923, prov: 'ภูเก็ต', keys: 'phuket' },
  { name: 'กระบี่', country: 'TH', lat: 8.0863, lng: 98.9063, prov: 'กระบี่', keys: 'krabi' },
  { name: 'โตเกียว', country: 'JP', lat: 35.6762, lng: 139.6503, keys: 'tokyo' },
  { name: 'โอซาก้า', country: 'JP', lat: 34.6937, lng: 135.5023, keys: 'osaka' },
  { name: 'เกียวโต', country: 'JP', lat: 35.0116, lng: 135.7681, keys: 'kyoto' },
  { name: 'ฮอกไกโด', country: 'JP', lat: 43.0618, lng: 141.3545, keys: 'hokkaido sapporo' },
  { name: 'โซล', country: 'KR', lat: 37.5665, lng: 126.978, keys: 'seoul' },
  { name: 'ไทเป', country: 'TW', lat: 25.033, lng: 121.5654, keys: 'taipei' },
  { name: 'สิงคโปร์', country: 'SG', lat: 1.3521, lng: 103.8198, keys: 'singapore' },
  { name: 'ฮ่องกง', country: 'HK', lat: 22.3193, lng: 114.1694, keys: 'hong kong' },
  { name: 'ดานัง', country: 'VN', lat: 16.0544, lng: 108.2022, keys: 'da nang danang' },
  { name: 'ปารีส', country: 'FR', lat: 48.8566, lng: 2.3522, keys: 'paris' },
];

/* ---------- people ---------- */
// Who "I" am and the people I know. The demo has four sample friends; signed in, ME is my Firebase uid and
// PEOPLE fills with the members of my groups (setPeople). Both are live: every importer sees the change.
const DEMO_PEOPLE = {
  u1: { id: 'u1', name: 'ต้น', avatar: '/assets/avatars/avatar-male.svg' },
  u2: { id: 'u2', name: 'ฝ้าย', avatar: '/assets/avatars/p5.svg' },
  u3: { id: 'u3', name: 'บิว', avatar: '/assets/avatars/p4.svg' },
  u4: { id: 'u4', name: 'แพร', avatar: '/assets/avatars/p9.svg' },
};
export const DEFAULT_AVATAR = '/assets/avatars/p6.svg';
export let ME = 'u1';
export const PEOPLE = { ...DEMO_PEOPLE };
export function setMe(id, people = DEMO_PEOPLE) {
  ME = id;
  Object.keys(PEOPLE).forEach((k) => delete PEOPLE[k]);
  Object.assign(PEOPLE, people);
}
export const addPeople = (people) => Object.assign(PEOPLE, people);
// share the link (phone share sheet), else copy it
export async function sendInvite(link, name, showToast) {
  if (navigator.share) {
    try { await navigator.share({ title: 'VOTAGEX', text: `มาวางแผนเที่ยวกับ “${name}” กัน`, url: link }); return; } catch { /* closed: copy instead */ }
  }
  await navigator.clipboard?.writeText(link).catch(() => {});
  showToast('คัดลอกลิงก์ชวนแล้ว');
}
// Travel groups: the same gang across many trips. A trip may belong to one (then anyone in it can plan it)
// and takes along all or some of its members; a trip with no group is just mine.
export const GROUP_COLORS = ['#0EA5E9', '#F97316', '#7C3AED', '#16A34A', '#DB2777'];
export const GROUP_ICONS = ['users', 'plane', 'beach', 'mountain', 'food', 'sparkle', 'gift'];
const SEED_GROUPS = [
  { id: 'g-uni', name: 'แก๊งมหาลัย', icon: 'users', color: '#0EA5E9', members: ['u1', 'u2', 'u3'], createdBy: 'u1' },
  { id: 'g-four', name: 'สายเที่ยวธรรมชาติ', icon: 'mountain', color: '#16A34A', members: ['u1', 'u2', 'u3', 'u4'], createdBy: 'u4' },
];
const SEED_PLAN_GROUPS = { osaka: 'g-uni', tonight: 'g-uni', bangsaen: 'g-uni', cnx: 'g-four', khaoyai: 'g-four', krabi: 'g-four' };
// sample groups, and the sample trips that belong to them (also for data saved before groups)
export const withSeedGroups = (d) => ({
  ...d,
  groups: SEED_GROUPS.map((g) => ({ ...g })),
  plans: d.plans.map((p) => ({ ...p, groupId: p.groupId ?? SEED_PLAN_GROUPS[p.id] ?? null })),
});
// Avatars: ThaiWell's set (Notionists by Zoish via DiceBear, CC0)
// Placeholder PromptPay number — the QR is for demo only and must never point to a real account
export const DEMO_PROMPTPAY = '0000000000';

/* ---------- categories ---------- */
export const PLACE_CATS = {
  food: { label: 'ร้านกิน', color: '#EA580C', bg: '#FFF1E6' },
  cafe: { label: 'คาเฟ่', color: '#A16207', bg: '#FEF6DC' },
  sight: { label: 'ที่เที่ยว', color: '#0D9488', bg: '#E6F7F4' },
  shop: { label: 'ช้อปปิ้ง', color: '#DB2777', bg: '#FDECF4' },
  stay: { label: 'ที่พัก', color: '#4F46E5', bg: '#ECEEFE' },
  move: { label: 'เดินทาง', color: '#0284C7', bg: '#E5F4FC' },
  event: { label: 'งาน', color: '#7C3AED', bg: '#F1EBFE' },
};
// A saved place may have dates: an event people keep from a post (concert, market, pop-up), which no API
// carries. It is the same kind of thing as any place I want to go, with startDate/endDate/time, its kind,
// and the venue it's at (name is the event's own). Shared with a group, it has groupId.
export const EVENT_KINDS = {
  concert: { label: 'คอนเสิร์ต', icon: 'music' },
  market: { label: 'ตลาดนัด', icon: 'shop' },
  popup: { label: 'งานขายของ', icon: 'gift' },
  other: { label: 'อื่นๆ', icon: 'event' },
};
export const eventOn = (ev, d) => Boolean(ev.startDate) && d >= ev.startDate && d <= (ev.endDate || ev.startDate);

// Somewhere I've saved and not been yet, picked for me. Events on the day come up more, and near beats far.
export function shufflePool(places, plans, date, group) {
  const taken = new Set(plans.flatMap((p) => p.stops.filter((s) => s.date === date && s.placeId).map((s) => s.placeId)));
  return places
    .filter((p) => (!p.groupId || p.groupId === group?.id) && p.status !== 'visited' && !taken.has(p.id))
    .filter((p) => (p.startDate ? eventOn(p, date) : (p.country || 'TH') === 'TH'))
    .map((p) => {
      const km = distanceKm(HOME, p);
      return { ...p, km, weight: (p.startDate ? 3 : 1) / (1 + km / 15) };
    });
}
export const eventEnded = (ev, today) => Boolean(ev.startDate) && (ev.endDate || ev.startDate) < today;
// an event saved before events were places: { title, place: { name, area, … }, … }
export const eventToPlace = ({ title, place, ...ev }) => ({
  ...ev, name: title, venue: place.name, area: place.area, prov: place.prov, country: place.country || 'TH',
  lat: place.lat, lng: place.lng, cat: 'event', status: 'want', savedAt: ev.savedAt || ev.startDate,
});
export const eventRange = (ev) => (ev.endDate && ev.endDate !== ev.startDate ? `${thaiShort(ev.startDate)} – ${thaiShort(ev.endDate)}` : thaiShort(ev.startDate));
export const EXPENSE_CATS = {
  food: { label: 'อาหาร', color: '#EA580C' },
  move: { label: 'เดินทาง', color: '#0284C7' },
  stay: { label: 'ที่พัก', color: '#4F46E5' },
  shop: { label: 'ช้อปปิ้ง', color: '#DB2777' },
  ticket: { label: 'ตั๋ว/กิจกรรม', color: '#0D9488' },
  other: { label: 'อื่นๆ', color: '#6B7280' },
};
export const KINDS = {
  outing: { label: 'นัด' },
  trip: { label: 'ทริปในไทย' },
  abroad: { label: 'ต่างประเทศ' },
  idea: { label: 'ไอเดีย' },
};
export const MOODS = ['moodLove', 'moodHappy', 'moodSmile', 'moodMeh', 'moodTired']; // icon names
export const JAR_ICONS = ['piggy', 'plane', 'beach', 'mountain', 'ticket', 'gift', 'sparkle'];

// Two riso inks per month (main, accent), picked from what the month feels like in Thailand
export const RISO_INKS = [
  ['#3255A4', '#FF48B0'], // ม.ค. ลมหนาว ทะเลหมอก
  ['#FF48B0', '#3255A4'], // ก.พ. ดอกนางพญาเสือโคร่ง / วาเลนไทน์
  ['#FF6C2F', '#0078BF'], // มี.ค. ร้อนแดดแรง ทะเล
  ['#0078BF', '#FF6C2F'], // เม.ย. สงกรานต์ สาดน้ำ
  ['#00A95C', '#FFB511'], // พ.ค. มะม่วง
  ['#0078BF', '#00A95C'], // มิ.ย. ฝนแรก
  ['#00A95C', '#0078BF'], // ก.ค. นาข้าวเขียว
  ['#765BA7', '#FF48B0'], // ส.ค. ดอกบัว
  ['#00838A', '#765BA7'], // ก.ย. ฝนชุก
  ['#FF6C2F', '#3255A4'], // ต.ค. โคมออกพรรษา
  ['#3255A4', '#FFB511'], // พ.ย. ลอยกระทงคืนเพ็ญ
  ['#F15060', '#0078BF'], // ธ.ค. หนาว ปีใหม่
];

/* ---------- travel piggy banks ---------- */
// One piggy per topic (usually a trip). Its money is split into spending categories (the expense
// categories), each with a share %. Coins in the pig are coloured by category. Money leaves a category
// through a manual "use" or an expense recorded during the trip in that category.
export const SPENT_COLOR = '#9CA3AF';
export const JAR_TEMPLATES = {
  abroad: { move: 35, stay: 30, food: 15, ticket: 10, shop: 10 },
  trip: { stay: 35, food: 30, move: 20, ticket: 15 },
};

// list of { cat, share } for a jar, in a stable order
export const jarCats = (jar) => Object.keys(EXPENSE_CATS).filter((k) => jar.cats?.[k] != null).map((k) => ({ id: k, share: jar.cats[k] }));

// expenses recorded during the jar's trip, as { date, cat, amount } in THB (my share)
function tripSpends(jar, plans, expenses) {
  const plan = plans.find((p) => p.id === jar.planId);
  if (!plan?.startDate) return [];
  const end = plan.endDate || plan.startDate;
  return expenses
    .filter((e) => e.planId === plan.id && e.date >= plan.startDate && e.date <= end && jar.cats?.[e.cat] != null)
    .map((e) => ({ date: e.date, cat: e.cat, amount: Math.round(myShare(e)) }))
    .filter((e) => e.amount > 0);
}

// every money movement of a jar, oldest first: { date, type: 'in' | 'use', alloc: { cat: amount }, note }
function jarEvents(jar, log, plans, expenses) {
  const own = log.filter((e) => e.jar === jar.id);
  const spends = tripSpends(jar, plans, expenses).map((e) => ({ date: e.date, type: 'use', alloc: { [e.cat]: e.amount }, auto: true }));
  return [...own].reverse().concat(spends).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// Per-category totals for one jar: in, used, balance (+ the jar's totals)
export function jarStats(jar, log, plans, expenses) {
  const by = Object.fromEntries(jarCats(jar).map((c) => [c.id, { in: 0, used: 0 }]));
  jarEvents(jar, log, plans, expenses).forEach((e) => Object.entries(e.alloc).forEach(([cat, amt]) => {
    if (by[cat]) by[cat][e.type === 'use' ? 'used' : 'in'] += amt;
  }));
  const rows = jarCats(jar).map((c) => ({
    ...c, ...EXPENSE_CATS[c.id], ...by[c.id], balance: by[c.id].in - by[c.id].used, goal: Math.round((jar.goal * c.share) / 100),
  }));
  const saved = rows.reduce((s, r) => s + r.in, 0);
  const used = rows.reduce((s, r) => s + r.used, 0);
  return { rows, saved, used, balance: saved - used };
}

// Coins in the glass piggy: one per ฿100 of each category's balance, oldest first.
// A split deposit interleaves its colours; spending takes that category's latest coins out.
export function jarCoins(jar, log, plans, expenses) {
  const bal = {};
  const coins = [];
  jarEvents(jar, log, plans, expenses).forEach((e) => {
    const added = [];
    Object.entries(e.alloc).forEach(([cat, amt]) => {
      if (!EXPENSE_CATS[cat]) return;
      const before = Math.floor((bal[cat] || 0) / 100);
      bal[cat] = (bal[cat] || 0) + (e.type === 'use' ? -amt : amt);
      const diff = Math.floor(Math.max(0, bal[cat]) / 100) - Math.max(0, before);
      for (let k = 0; k < diff; k++) added.push({ cat, at: (k + 0.5) / diff });
      for (let k = 0; k < -diff; k++) {
        const i = coins.lastIndexOf(cat);
        if (i >= 0) coins.splice(i, 1);
      }
    });
    coins.push(...added.sort((x, y) => x.at - y.at).map((c) => c.cat));
  });
  return coins.map((cat) => EXPENSE_CATS[cat].color);
}

// Split an amount by share %, rounding so the parts add up exactly. items: [{ id, share }]
export function splitByShare(amount, items) {
  const total = items.reduce((s, j) => s + (j.share || 0), 0) || 1;
  const parts = items.map((j) => Math.floor((amount * (j.share || 0)) / total));
  const rest = amount - parts.reduce((s, x) => s + x, 0);
  if (items.length) parts[0] += rest;
  return Object.fromEntries(items.map((j, i) => [j.id, parts[i]]).filter(([, v]) => v > 0));
}

export const SOURCES = {
  tiktok: { label: 'TikTok' },
  instagram: { label: 'Instagram' },
  maps: { label: 'Google Maps' },
  manual: { label: 'ค้นหาเอง' },
};

// Map an OSM tag from Photon to one of our place categories
export function guessCat(osmKey, osmValue) {
  if (['restaurant', 'fast_food', 'food_court', 'bar', 'pub', 'marketplace'].includes(osmValue)) return 'food';
  if (['cafe', 'ice_cream', 'bakery'].includes(osmValue)) return 'cafe';
  if (osmKey === 'shop' || osmValue === 'mall' || osmValue === 'department_store') return 'shop';
  if (['hotel', 'hostel', 'guest_house', 'motel', 'apartment', 'resort'].includes(osmValue)) return 'stay';
  if (osmKey === 'aeroway' || osmKey === 'railway' || osmValue === 'station' || osmValue === 'bus_station') return 'move';
  return 'sight';
}

/* ---------- geo ---------- */
export const HOME = { lat: 13.7563, lng: 100.5018 }; // demo "current location": central Bangkok
export function distanceKm(a, b) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} ม.` : `${km < 10 ? km.toFixed(1) : Math.round(km)} กม.`);
export const directionsUrl = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;

/* ---------- plan helpers ---------- */
// My check-in state for a stop: done | late-done | missed | due | pending
export function stopState(stop, today, nowHM) {
  const mine = stop.checkIns?.[ME];
  if (mine) return mine.late ? 'late-done' : 'done';
  if (!stop.date) return 'pending';
  if (stop.date < today) return 'missed';
  if (stop.date === today && stop.time && stop.time < nowHM) return 'due';
  return 'pending';
}
export const myShare = (e) => (e.split.includes(ME) ? toTHB(e) / e.split.length : 0);

export function planStatus(plan, today) {
  if (plan.kind === 'idea' || !plan.startDate) return 'idea';
  if (today < plan.startDate) return 'upcoming';
  if (today > (plan.endDate || plan.startDate)) return 'past';
  return 'ongoing';
}

// Who still owes whom, in THB, after the transfers the receiver has confirmed.
// Greedy match of largest debtor with largest creditor.
export function settleUp(expenses, members, payments = []) {
  const net = Object.fromEntries(members.map((m) => [m, 0]));
  for (const e of expenses) {
    const thb = toTHB(e);
    net[e.paidBy] = (net[e.paidBy] || 0) + thb;
    e.split.forEach((u) => { net[u] = (net[u] || 0) - thb / e.split.length; });
  }
  payments.filter((x) => x.status === 'received').forEach((x) => {
    net[x.from] = (net[x.from] || 0) + x.amount;
    net[x.to] = (net[x.to] || 0) - x.amount;
  });
  const debt = [], cred = [];
  Object.entries(net).forEach(([u, v]) => { if (v < -1) debt.push([u, -v]); else if (v > 1) cred.push([u, v]); });
  debt.sort((a, b) => b[1] - a[1]);
  cred.sort((a, b) => b[1] - a[1]);
  const out = [];
  let i = 0, j = 0;
  while (i < debt.length && j < cred.length) {
    const amt = Math.min(debt[i][1], cred[j][1]);
    out.push({ from: debt[i][0], to: cred[j][0], amount: Math.round(amt) });
    debt[i][1] -= amt; cred[j][1] -= amt;
    if (debt[i][1] < 1) i++;
    if (cred[j][1] < 1) j++;
  }
  return out;
}

// The month's going-out money: outings only (a trip saves up in its own piggy), counted as cash from my
// pocket, each outing in its own month. What I paid, less what friends paid me back (once I confirm it),
// plus what I sent them; that is my share, plus what friends still owe me, less what I still owe them.
// byCat: my share by category. rows: each outing with its cash, what's owed to me and what I owe.
export function monthMoney(monthKey, plans, expenses, payments) {
  const byCat = {};
  const rows = plans.filter((p) => p.kind === 'outing' && p.startDate?.startsWith(monthKey)).map((p) => {
    const exp = expenses.filter((e) => e.planId === p.id);
    const pays = payments.filter((x) => x.planId === p.id);
    exp.forEach((e) => { const v = myShare(e); if (v) byCat[e.cat] = (byCat[e.cat] || 0) + v; });
    const share = exp.reduce((sum, e) => sum + myShare(e), 0);
    const paid = exp.filter((e) => e.paidBy === ME).reduce((sum, e) => sum + toTHB(e), 0);
    const back = pays.filter((x) => x.to === ME && x.status === 'received').reduce((sum, x) => sum + x.amount, 0);
    const sent = pays.filter((x) => x.from === ME).reduce((sum, x) => sum + x.amount, 0);
    const cash = paid - back + sent;
    return { plan: p, cash, owed: Math.max(0, cash - share), owe: Math.max(0, share - cash) };
  });
  const sum = (k) => Math.round(rows.reduce((t, r) => t + r[k], 0));
  return { spent: sum('cash'), owed: sum('owed'), owe: sum('owe'), byCat, rows: rows.filter((r) => r.cash || r.owe) };
}

// A photo shrunk to a JPEG data URL (memories, transfer slips)
export function compressImage(file, max = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      resolve(cv.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* ---------- seed ---------- */
const ALL = ['u1', 'u2', 'u3', 'u4'];
const done = (people, at, late = false) => Object.fromEntries(people.map((u) => [u, { at, late }]));

export function seedData() {
  const osakaStart = rel(23);
  const o = (n) => addDays(osakaStart, n);
  const cnxStart = rel(-314);
  const c = (n) => addDays(cnxStart, n);
  const kyStart = rel(-89);

  const plans = [
    {
      id: 'tonight', name: 'เย็นนี้ เดินห้าง + จ๊อดแฟร์', kind: 'outing', country: 'TH', currency: 'THB',
      destination: { name: 'พระราม 9', lat: 13.7586, lng: 100.5661 },
      startDate: TODAY, endDate: TODAY, members: ['u1', 'u2'], budget: 800,
      cover: { icon: 'food', tint: '#FFF1E6' },
      stops: [
        { id: 'tn1', date: TODAY, time: '17:30', name: 'Central Rama 9', area: 'ห้วยขวาง · กรุงเทพฯ', prov: 'กรุงเทพมหานคร', lat: 13.7586, lng: 100.5661, cat: 'shop', note: 'หาของขวัญวันเกิดบิว', checkIns: {} },
        { id: 'tn2', date: TODAY, time: '19:00', name: 'จ๊อดแฟร์ รัชดา', area: 'ดินแดง · กรุงเทพฯ', prov: 'กรุงเทพมหานคร', lat: 13.7682, lng: 100.5709, cat: 'food', note: 'ซี่โครงหมูภูเขาไฟ · รอฝ้ายที่ MRT', checkIns: {}, placeId: 'p9' },
      ],
    },
    {
      id: 'osaka', name: 'โอซาก้า–เกียวโต', kind: 'abroad', country: 'JP', currency: 'JPY',
      destination: { name: 'โอซาก้า', lat: 34.6937, lng: 135.5023 },
      startDate: osakaStart, endDate: o(5), members: ['u1', 'u2', 'u3'], budget: 45000,
      cover: { icon: 'globe', tint: '#E8F3FF' },
      checklist: [
        { id: 'c1', text: 'พาสปอร์ตอายุเหลือเกิน 6 เดือน', done: true },
        { id: 'c2', text: 'ตั๋วเครื่องบินไป–กลับ', done: true },
        { id: 'c3', text: 'จองที่พักครบทุกคืน', done: true },
        { id: 'c4', text: 'ประกันการเดินทาง', done: false },
        { id: 'c5', text: 'eSIM / Pocket WiFi', done: false },
        { id: 'c6', text: 'ลงทะเบียน Visit Japan Web', done: false },
        { id: 'c7', text: 'แลกเงินเยน', done: false },
        { id: 'c8', text: 'ปลั๊กแปลง + พาวเวอร์แบงก์', done: false },
      ],
      stops: [
        { id: 'os1', date: o(0), time: '09:40', name: 'สนามบินคันไซ', area: 'โอซาก้า', lat: 34.432, lng: 135.2304, cat: 'move', note: 'นั่ง Nankai ไปนัมบะ', checkIns: {} },
        { id: 'os2', date: o(0), time: '13:00', name: 'ที่พักย่านนัมบะ', area: 'นัมบะ · โอซาก้า', lat: 34.665, lng: 135.501, cat: 'stay', note: 'เช็คอินได้ 15:00 ฝากกระเป๋าก่อน', checkIns: {} },
        { id: 'os3', date: o(0), time: '15:30', name: 'ปราสาทโอซาก้า', area: 'ชูโอ · โอซาก้า', lat: 34.6872, lng: 135.5254, cat: 'sight', note: '', checkIns: {} },
        { id: 'os4', date: o(0), time: '18:30', name: 'โดทงโบริ', area: 'นัมบะ · โอซาก้า', lat: 34.669, lng: 135.5016, cat: 'food', note: 'ทาโกะยากิ + ถ่ายรูปป้ายกูลิโกะ', checkIns: {}, placeId: 'p11' },
        { id: 'os5', date: o(1), time: '08:30', name: 'ยูนิเวอร์แซล สตูดิโอ เจแปน', area: 'โคโนฮานะ · โอซาก้า', lat: 34.6656, lng: 135.4325, cat: 'sight', note: 'Express Pass ซื้อแล้ว', checkIns: {} },
        { id: 'os6', date: o(1), time: '19:30', name: 'ตลาดคุโรมง', area: 'นิปปงบาชิ · โอซาก้า', lat: 34.6653, lng: 135.507, cat: 'food', note: '', checkIns: {} },
        { id: 'os7', date: o(2), time: '10:00', name: 'สถานีเกียวโต', area: 'เกียวโต', lat: 34.9858, lng: 135.7588, cat: 'move', note: 'JR Special Rapid ~30 นาที', checkIns: {} },
        { id: 'os8', date: o(2), time: '13:00', name: 'ศาลเจ้าฟุชิมิ อินาริ', area: 'ฟุชิมิ · เกียวโต', lat: 34.9675, lng: 135.7797, cat: 'sight', note: 'เดินขึ้นเขาประมาณ 2 ชม.', checkIns: {} },
        { id: 'os9', date: o(2), time: '17:00', name: 'วัดคิโยมิสึ', area: 'ฮิงาชิยามะ · เกียวโต', lat: 34.9943, lng: 135.7844, cat: 'sight', note: 'ดูพระอาทิตย์ตก', checkIns: {} },
        { id: 'os10', date: o(3), time: '08:00', name: 'ป่าไผ่อาราชิยามะ', area: 'อาราชิยามะ · เกียวโต', lat: 35.017, lng: 135.6713, cat: 'sight', note: 'ไปเช้าคนน้อย', checkIns: {}, placeId: 'p12' },
        { id: 'os11', date: o(3), time: '12:30', name: 'ตลาดนิชิกิ', area: 'นากาเกียว · เกียวโต', lat: 35.005, lng: 135.7656, cat: 'food', note: '', checkIns: {} },
        { id: 'os12', date: o(4), time: '11:00', name: 'ย่านชิโจ-คาวาระมาจิ', area: 'เกียวโต', lat: 35.0037, lng: 135.7681, cat: 'shop', note: 'วันว่าง ช้อปของฝาก', checkIns: {} },
        { id: 'os13', date: o(5), time: '11:00', name: 'สนามบินคันไซ', area: 'โอซาก้า', lat: 34.432, lng: 135.2304, cat: 'move', note: 'บินกลับ 14:25', checkIns: {} },
      ],
    },
    {
      id: 'cnx', name: 'เชียงใหม่หน้าหนาว', kind: 'trip', country: 'TH', currency: 'THB',
      destination: { name: 'เชียงใหม่', lat: 18.7883, lng: 98.9853 },
      startDate: cnxStart, endDate: c(3), members: ALL, budget: 8000,
      cover: { img: '/assets/photo1.jpg' },
      stops: [
        { id: 'cm1', date: c(0), time: '10:30', name: 'สนามบินเชียงใหม่', area: 'เชียงใหม่', prov: 'เชียงใหม่', lat: 18.7668, lng: 98.9649, cat: 'move', note: '', checkIns: done(ALL, '10:35') },
        { id: 'cm2', date: c(0), time: '14:00', name: 'ย่านนิมมาน', area: 'สุเทพ · เชียงใหม่', prov: 'เชียงใหม่', lat: 18.7964, lng: 98.968, cat: 'cafe', note: '', checkIns: done(ALL, '14:20', true) },
        { id: 'cm3', date: c(0), time: '18:00', name: 'ตลาดวโรรส', area: 'ช้างม่อย · เชียงใหม่', prov: 'เชียงใหม่', lat: 18.7902, lng: 99.0005, cat: 'food', note: '', checkIns: done(ALL, '18:05') },
        { id: 'cm4', date: c(1), time: '05:30', name: 'ยอดดอยอินทนนท์', area: 'จอมทอง · เชียงใหม่', prov: 'เชียงใหม่', lat: 18.5883, lng: 98.4867, cat: 'sight', note: '', checkIns: done(ALL, '05:50') },
        { id: 'cm5', date: c(1), time: '09:00', name: 'กิ่วแม่ปาน', area: 'จอมทอง · เชียงใหม่', prov: 'เชียงใหม่', lat: 18.5545, lng: 98.4826, cat: 'sight', note: '', checkIns: done(ALL, '09:10') },
        { id: 'cm6', date: c(2), time: '09:00', name: 'วัดพระธาตุดอยสุเทพ', area: 'สุเทพ · เชียงใหม่', prov: 'เชียงใหม่', lat: 18.8048, lng: 98.9216, cat: 'sight', note: '', checkIns: done(ALL, '09:00') },
        { id: 'cm7', date: c(2), time: '16:00', name: 'ม่อนแจ่ม', area: 'แม่ริม · เชียงใหม่', prov: 'เชียงใหม่', lat: 18.9484, lng: 98.7945, cat: 'sight', note: '', checkIns: done(ALL, '16:30', true) },
        { id: 'cm8', date: c(3), time: '10:00', name: 'ข้าวซอย ย่านวัวลาย', area: 'หายยา · เชียงใหม่', prov: 'เชียงใหม่', lat: 18.7766, lng: 98.987, cat: 'food', note: '', checkIns: done(ALL, '10:05') },
      ],
    },
    {
      id: 'iconsiam', name: 'เสาร์ชิลริมน้ำ', kind: 'outing', country: 'TH', currency: 'THB',
      destination: { name: 'ICONSIAM', lat: 13.7268, lng: 100.5103 },
      startDate: rel(-5), endDate: rel(-5), members: ['u1'], budget: 1500,
      cover: { icon: 'shop', tint: '#FDECF4' },
      stops: [
        { id: 'ic1', date: rel(-5), time: '13:00', name: 'ICONSIAM', area: 'คลองสาน · กรุงเทพฯ', prov: 'กรุงเทพมหานคร', lat: 13.7268, lng: 100.5103, cat: 'shop', note: '', checkIns: done(['u1'], '13:15') },
      ],
    },
    {
      id: 'khaoyai', name: 'เขาใหญ่ 3 วัน 2 คืน', kind: 'trip', country: 'TH', currency: 'THB',
      destination: { name: 'เขาใหญ่', lat: 14.4389, lng: 101.3722 },
      startDate: kyStart, endDate: addDays(kyStart, 2), members: ['u1', 'u3'], budget: 5000,
      cover: { img: '/assets/photo2.jpg' },
      stops: [
        { id: 'ky1', date: kyStart, time: '11:00', name: 'อุทยานแห่งชาติเขาใหญ่', area: 'ปากช่อง · นครราชสีมา', prov: 'นครราชสีมา', lat: 14.4389, lng: 101.3722, cat: 'sight', note: '', checkIns: done(['u1', 'u3'], '11:20') },
        { id: 'ky2', date: addDays(kyStart, 1), time: '09:00', name: 'น้ำตกเหวสุวัต', area: 'นครราชสีมา', prov: 'นครราชสีมา', lat: 14.4351, lng: 101.4133, cat: 'sight', note: '', checkIns: done(['u1', 'u3'], '09:00') },
      ],
    },
    {
      id: 'bangsaen', name: 'ทะเลบางแสน', kind: 'outing', country: 'TH', currency: 'THB',
      destination: { name: 'บางแสน', lat: 13.288, lng: 100.913 },
      startDate: rel(-365), endDate: rel(-365), members: ['u1', 'u2'], budget: 1500,
      cover: { img: '/assets/photo5.jpg' },
      stops: [
        { id: 'bs1', date: rel(-365), time: '10:00', name: 'หาดบางแสน', area: 'เมืองชลบุรี · ชลบุรี', prov: 'ชลบุรี', lat: 13.288, lng: 100.913, cat: 'sight', note: '', checkIns: done(['u1', 'u2'], '10:30', true) },
      ],
    },
    {
      id: 'krabi', name: 'ทะเลกระบี่ ช่วงปีใหม่?', kind: 'idea', country: 'TH', currency: 'THB',
      destination: { name: 'กระบี่', lat: 8.0863, lng: 98.9063 },
      startDate: null, endDate: null, members: ['u1', 'u2', 'u4'], budget: 7000,
      cover: { icon: 'sight', tint: '#E6F7F4' },
      note: 'รอดูโปรตั๋วเครื่องบิน',
      stops: [
        { id: 'kb1', date: null, time: '', name: 'หาดไร่เลย์', area: 'อ่าวนาง · กระบี่', prov: 'กระบี่', lat: 8.0114, lng: 98.8379, cat: 'sight', note: '', checkIns: {} },
        { id: 'kb2', date: null, time: '', name: 'อ่าวนาง', area: 'เมืองกระบี่ · กระบี่', prov: 'กระบี่', lat: 8.032, lng: 98.822, cat: 'sight', note: '', checkIns: {} },
        { id: 'kb3', date: null, time: '', name: 'เกาะพีพีดอน', area: 'เกาะพีพี · กระบี่', prov: 'กระบี่', lat: 7.7407, lng: 98.7784, cat: 'sight', note: '', checkIns: {} },
      ],
    },
  ];

  const places = [
    { id: 'p1', name: 'ภูเขาทอง วัดสระเกศ', area: 'ป้อมปราบฯ · กรุงเทพฯ', prov: 'กรุงเทพมหานคร', country: 'TH', lat: 13.7539, lng: 100.5062, cat: 'sight', status: 'want', source: { type: 'tiktok', author: '@bkk.walker', url: 'https://www.tiktok.com/@bkk.walker' }, note: 'ขึ้นไปดูวิวตอนเย็น บันได 344 ขั้น', savedAt: rel(-3) },
    { id: 'p2', name: 'ตลาดน้ำอัมพวา', area: 'อัมพวา · สมุทรสงคราม', prov: 'สมุทรสงคราม', country: 'TH', lat: 13.4249, lng: 99.9555, cat: 'sight', status: 'want', source: { type: 'instagram', author: '@weekend.trip.th', url: 'https://www.instagram.com/' }, note: 'ไปเย็นศุกร์–อาทิตย์ ล่องเรือดูหิ่งห้อย', savedAt: rel(-12) },
    { id: 'p3', name: 'เยาวราช', area: 'สัมพันธวงศ์ · กรุงเทพฯ', prov: 'กรุงเทพมหานคร', country: 'TH', lat: 13.7419, lng: 100.509, cat: 'food', status: 'want', source: { type: 'tiktok', author: '@eatwithme', url: 'https://www.tiktok.com/@eatwithme' }, note: 'ก๋วยจั๊บน้ำข้น คิวยาว ไปก่อน 6 โมง', savedAt: rel(-1) },
    { id: 'p4', name: 'Jim Thompson House', area: 'ปทุมวัน · กรุงเทพฯ', prov: 'กรุงเทพมหานคร', country: 'TH', lat: 13.7493, lng: 100.5285, cat: 'sight', status: 'want', source: { type: 'maps', url: 'https://maps.google.com/' }, note: '', savedAt: rel(-30) },
    { id: 'p5', name: 'หาดตาแหวน', area: 'เกาะล้าน · ชลบุรี', prov: 'ชลบุรี', country: 'TH', lat: 12.9254, lng: 100.7798, cat: 'sight', status: 'want', source: { type: 'instagram', author: '@sea.lover', url: 'https://www.instagram.com/' }, note: 'น้ำใส เรือจากท่าบาลีฮาย', savedAt: rel(-20) },
    { id: 'p6', name: 'ตลาดนัดจตุจักร', area: 'จตุจักร · กรุงเทพฯ', prov: 'กรุงเทพมหานคร', country: 'TH', lat: 13.7999, lng: 100.5502, cat: 'shop', status: 'want', source: { type: 'tiktok', author: '@bkkweekend', url: 'https://www.tiktok.com/@bkkweekend' }, note: 'โซนต้นไม้ไปวันพุธ–พฤหัส', savedAt: rel(-8) },
    { id: 'p7', name: 'สวนลุมพินี', area: 'ปทุมวัน · กรุงเทพฯ', prov: 'กรุงเทพมหานคร', country: 'TH', lat: 13.7306, lng: 100.5415, cat: 'sight', status: 'visited', source: { type: 'manual' }, note: 'วิ่งตอนเย็น', savedAt: rel(-60) },
    { id: 'p8', name: 'Samyan Mitrtown', area: 'ปทุมวัน · กรุงเทพฯ', prov: 'กรุงเทพมหานคร', country: 'TH', lat: 13.7344, lng: 100.5283, cat: 'shop', status: 'visited', source: { type: 'manual' }, note: '', savedAt: rel(-45) },
    { id: 'p9', name: 'จ๊อดแฟร์ รัชดา', area: 'ดินแดง · กรุงเทพฯ', prov: 'กรุงเทพมหานคร', country: 'TH', lat: 13.7682, lng: 100.5709, cat: 'food', status: 'want', source: { type: 'tiktok', author: '@streetfood.th', url: 'https://www.tiktok.com/@streetfood.th' }, note: 'ซี่โครงหมูภูเขาไฟ', savedAt: rel(-4) },
    { id: 'p10', name: 'ตลาดน้ำตลิ่งชัน', area: 'บางกอกน้อย · กรุงเทพฯ', prov: 'กรุงเทพมหานคร', country: 'TH', lat: 13.7764, lng: 100.4566, cat: 'food', status: 'want', source: { type: 'maps', url: 'https://maps.google.com/' }, note: 'เปิดเฉพาะเสาร์–อาทิตย์', savedAt: rel(-15) },
    { id: 'p11', name: 'โดทงโบริ', area: 'นัมบะ · โอซาก้า', country: 'JP', lat: 34.669, lng: 135.5016, cat: 'food', status: 'want', source: { type: 'tiktok', author: '@japan.eats', url: 'https://www.tiktok.com/@japan.eats' }, note: 'ทาโกะยากิร้านปลาหมึกยักษ์', savedAt: rel(-40) },
    { id: 'p12', name: 'ป่าไผ่อาราชิยามะ', area: 'อาราชิยามะ · เกียวโต', country: 'JP', lat: 35.017, lng: 135.6713, cat: 'sight', status: 'want', source: { type: 'instagram', author: '@kyoto.daily', url: 'https://www.instagram.com/' }, note: '', savedAt: rel(-38) },
  ];

  const ex = (id, planId, date, title, amount, cat, paidBy, split, currency = 'THB') => ({
    id, planId, date, title, amount, cat, paidBy, split, currency, toTHB: CURRENCIES[currency].toTHB,
  });
  const expenses = [
    ex('e1', 'tonight', TODAY, 'ค่า MRT', 42, 'move', 'u1', ['u1']),
    ex('e19', 'tonight', TODAY, 'ซี่โครงหมูภูเขาไฟ', 480, 'food', 'u1', ['u1', 'u2']),
    ex('e20', 'iconsiam', rel(-5), 'เรือข้ามฟาก', 60, 'move', 'u1', ['u1']),
    ex('e2', 'osaka', rel(-40), 'ตั๋วเครื่องบิน BKK–KIX ×3', 38700, 'move', 'u1', ['u1', 'u2', 'u3']),
    ex('e3', 'osaka', rel(-35), 'ที่พัก 5 คืน', 96000, 'stay', 'u2', ['u1', 'u2', 'u3'], 'JPY'),
    ex('e4', 'osaka', rel(-10), 'ตั๋ว USJ + Express Pass ×3', 45600, 'ticket', 'u3', ['u1', 'u2', 'u3'], 'JPY'),
    ex('e5', 'cnx', c(0), 'ตั๋วเครื่องบินไป–กลับ ×4', 9600, 'move', 'u1', ALL),
    ex('e6', 'cnx', c(0), 'ที่พัก 3 คืน', 6300, 'stay', 'u2', ALL),
    ex('e7', 'cnx', c(0), 'รถเช่า 3 วัน', 3000, 'move', 'u3', ALL),
    ex('e8', 'cnx', c(0), 'กาแฟนิมมาน', 520, 'food', 'u1', ['u1', 'u4']),
    ex('e9', 'cnx', c(0), 'ข้าวเย็นตลาดวโรรส', 860, 'food', 'u4', ALL),
    ex('e10', 'cnx', c(1), 'ค่าเข้าอุทยาน + รถสองแถว', 1200, 'ticket', 'u2', ALL),
    ex('e11', 'cnx', c(2), 'น้ำมันรถ', 900, 'move', 'u3', ALL),
    ex('e12', 'cnx', c(2), 'ของฝาก', 1450, 'shop', 'u1', ['u1']),
    ex('e13', 'cnx', c(3), 'ข้าวซอย', 480, 'food', 'u4', ALL),
    ex('e14', 'iconsiam', rel(-5), 'ข้าวกลางวัน', 380, 'food', 'u1', ['u1']),
    ex('e15', 'iconsiam', rel(-5), 'เสื้อเชิ้ต', 890, 'shop', 'u1', ['u1']),
    ex('e16', 'khaoyai', kyStart, 'ที่พัก 2 คืน', 3200, 'stay', 'u1', ['u1', 'u3']),
    ex('e17', 'khaoyai', kyStart, 'ค่าเข้าอุทยาน', 80, 'ticket', 'u3', ['u1', 'u3']),
    ex('e18', 'bangsaen', rel(-365), 'ซีฟู้ดริมหาด', 1240, 'food', 'u2', ['u1', 'u2']),
  ];

  const memories = [
    { id: 'm1', planId: 'cnx', date: c(1), stopId: 'cm4', photos: ['/assets/photo1.jpg'], text: 'ยอดดอยอินทนนท์ 6 องศา หนาวสุดในชีวิต แต่ทะเลหมอกคุ้มมาก', mood: 'moodLove', by: 'u1' },
    { id: 'm2', planId: 'cnx', date: c(1), stopId: 'cm5', photos: ['/assets/photo2.jpg'], text: 'เส้นทางกิ่วแม่ปาน ป่าสนสวยจนไม่อยากเดินออก', mood: 'moodHappy', by: 'u2' },
    { id: 'm3', planId: 'cnx', date: c(2), stopId: 'cm7', photos: ['/assets/photo4.jpg'], text: 'ม่อนแจ่ม นั่งร้านกาแฟของชาวบ้าน ลมเย็นทั้งบ่าย', mood: 'moodHappy', by: 'u3' },
    { id: 'm4', planId: 'cnx', date: c(0), stopId: 'cm2', photos: [], text: 'ร้านกาแฟในซอย 9 น่านั่งมาก ต้องกลับมาอีก', mood: 'moodSmile', by: 'u4' },
    { id: 'm5', planId: 'khaoyai', date: addDays(kyStart, 1), stopId: null, photos: ['/assets/photo6.jpg'], text: 'แวะฟาร์มม้าระหว่างทาง ตัวใหญ่กว่าที่คิดเยอะ', mood: 'moodLove', by: 'u1' },
    { id: 'm6', planId: 'bangsaen', date: rel(-365), stopId: 'bs1', photos: ['/assets/photo5.jpg'], text: 'ทะเลหน้าฝนก็สวยดี ได้ซีฟู้ดอร่อยด้วย', mood: 'moodHappy', by: 'u1' },
    { id: 'm7', planId: 'iconsiam', date: rel(-5), stopId: 'ic1', photos: [], text: 'ลมริมน้ำเย็นสบาย นั่งดูเรือจนเย็น', mood: 'moodSmile', by: 'u1' },
  ];

  // paid back: บิว (u4) settled up the Chiang Mai trip; ฝ้าย says she sent her half of tonight's dinner
  const cnxBack = settleUp(expenses.filter((e) => e.planId === 'cnx'), ALL).find((t) => t.from === 'u4' && t.to === 'u1');
  const payments = [
    { id: 'pay1', planId: 'cnx', from: 'u4', to: 'u1', amount: cnxBack.amount, status: 'received', date: c(3), slip: null },
    { id: 'pay2', planId: 'tonight', from: 'u2', to: 'u1', amount: 240, status: 'sent', date: TODAY, slip: null },
  ];

  return withSeedGroups({ v: 1, seededOn: TODAY, simMode: 'normal', plans, places: [...seedEvents(), ...places], expenses, payments, memories, ...seedPiggy() });
}

// sample events around today: one on now, a weekend market, a concert, a pop-up next week
export function seedEvents() {
  const sat = (6 - new Date(`${TODAY}T00:00`).getDay() + 7) % 7 || 7; // days to the coming Saturday
  const at = (name, area, lat, lng) => ({ name, area, prov: 'กรุงเทพมหานคร', country: 'TH', lat, lng });
  const events = [
    { id: 'ev1', title: 'ป๊อปอัปขนมโฮมเมด', kind: 'popup', startDate: TODAY, endDate: rel(1), time: '16:00', place: at('จ๊อดแฟร์ รัชดา', 'ดินแดง · กรุงเทพฯ', 13.7682, 100.5709), source: { type: 'instagram', author: '@homemade.bkk', url: 'https://www.instagram.com/' }, note: 'บราวนี่หมดไว ไปก่อน 6 โมง', by: 'u2' },
    { id: 'ev2', title: 'ตลาดนัดวินเทจสุดสัปดาห์', kind: 'market', startDate: rel(sat), endDate: rel(sat + 1), time: '10:00', place: at('ช่างชุ่ย', 'บางพลัด · กรุงเทพฯ', 13.7906, 100.4791), source: { type: 'tiktok', author: '@vintage.th', url: 'https://www.tiktok.com/@vintage.th' }, note: 'เสื้อมือสอง ของแต่งบ้าน', by: 'u1' },
    { id: 'ev3', title: 'Indie Night คอนเสิร์ตลานกลางแจ้ง', kind: 'concert', startDate: rel(sat), endDate: rel(sat), time: '19:00', place: at('Samyan Mitrtown', 'ปทุมวัน · กรุงเทพฯ', 13.7344, 100.5283), source: { type: 'instagram', author: '@indienight.bkk', url: 'https://www.instagram.com/' }, note: 'บัตรหน้างาน 350', by: 'u1', groupId: 'g-uni' },
    { id: 'ev4', title: 'Handmade Market', kind: 'popup', startDate: rel(sat + 6), endDate: rel(sat + 8), time: '11:00', place: at('สยามดิสคัฟเวอรี่', 'ปทุมวัน · กรุงเทพฯ', 13.7466, 100.5309), source: { type: 'tiktok', author: '@craft.bkk', url: 'https://www.tiktok.com/@craft.bkk' }, note: '', by: 'u3' },
  ];
  return events.map(eventToPlace);
}

export function seedPiggy() {
  const jars = [
    { id: 'jar-osaka', name: 'โอซาก้า–เกียวโต', icon: 'plane', planId: 'osaka', goal: 45000, cats: { ...JAR_TEMPLATES.abroad } },
    { id: 'jar-krabi', name: 'ทะเลกระบี่', icon: 'beach', planId: 'krabi', goal: 7000, cats: { ...JAR_TEMPLATES.trip } },
  ];
  // deposits split by each jar's category shares; one deposit for USJ was spent already
  let n = 0;
  const put = (jar, day, amount) => ({ id: `pg${++n}`, jar: jar.id, date: rel(day), type: 'in', amount, alloc: splitByShare(amount, jarCats(jar)) });
  const [osaka, krabi] = jars;
  const piggyLog = [
    put(osaka, -2, 700), put(krabi, -2, 300),
    put(osaka, -6, 1050), put(krabi, -6, 450),
    { id: 'pg-usj', jar: osaka.id, date: rel(-10), type: 'use', amount: 1200, alloc: { ticket: 1200 }, note: 'มัดจำตั๋ว USJ' },
    put(osaka, -20, 1400), put(krabi, -20, 600),
    put(osaka, -30, 3000),
    put(osaka, -45, 2800), put(krabi, -45, 1200),
    put(osaka, -60, 3500), put(krabi, -60, 1500),
  ];
  return { jars, piggyLog };
}

// Move every stored date by n days (keeps a saved demo "current" on later days)
export function shiftData(data, n) {
  if (!n) return data;
  const s = (d) => (d ? addDays(d, n) : d);
  return {
    ...data,
    seededOn: s(data.seededOn),
    plans: data.plans.map((p) => ({ ...p, startDate: s(p.startDate), endDate: s(p.endDate), stops: p.stops.map((st) => ({ ...st, date: s(st.date) })) })),
    places: data.places.map((p) => ({ ...p, savedAt: s(p.savedAt), startDate: s(p.startDate), endDate: s(p.endDate) })),
    expenses: data.expenses.map((e) => ({ ...e, date: s(e.date) })),
    payments: data.payments?.map((x) => ({ ...x, date: s(x.date) })),
    memories: data.memories.map((m) => ({ ...m, date: s(m.date) })),
    piggyLog: (data.piggyLog || []).map((e) => ({ ...e, date: s(e.date) })),
    events: (data.events || []).map((e) => ({ ...e, startDate: s(e.startDate), endDate: s(e.endDate) })),
  };
}
