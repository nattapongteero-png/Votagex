import { useEffect, useState } from 'react';

// Open Peeps by Pablo Stanley (CC0): hand-drawn people put together from pieces, a body in a pose (standing,
// sitting or bust) and a head on it (hair, face, facial hair, glasses). The pieces are JSON element trees in
// /assets/peeps (taken from react-peeps), [tag, props, ...children], the line colour "$S" and the fill "$B";
// each is fetched once, the first time it's wanted. Peep.jsx draws them.

const cache = new Map(); // "kind/Name" → its tree, or the promise of it
const load = (key) => {
  if (!cache.has(key)) cache.set(key, fetch(`/assets/peeps/${key}.json`).then((r) => r.json()).then((t) => { cache.set(key, t); return t; }));
  return cache.get(key);
};
export const loaded = (key) => { const v = cache.get(key); return Boolean(v) && !(v instanceof Promise); };
export const treeOf = (key) => (loaded(key) ? cache.get(key) : null);

// a look's pieces as "kind/Name" keys: a body in `pose` ("standing/WalkingBW") and the head's
export const piecesOf = (look, pose, face) => [pose, look.hair && `hair/${look.hair}`, `face/${face || look.face}`,
  look.beard && look.beard !== 'None' && `facialHair/${look.beard}`, look.glasses && look.glasses !== 'None' && `accessories/${look.glasses}`].filter(Boolean);

// each full-body pose's box in the library's units with a short-haired head on it, [x, y, width, height]
// (measured from the drawings), to stand people on one line at one size
export const POSE_BOX = {
  'standing/CrossedArmsBW': [-199, 62, 1071, 2871], 'standing/CrossedArmsWB': [-199, 62, 1071, 2871], 'standing/EasingBW': [-190, 62, 1075, 2884], 'standing/EasingWB': [-190, 62, 1075, 2884],
  'standing/PointingFingerBW': [-15, 62, 1300, 2607], 'standing/PointingFingerWB': [-16, 62, 1300, 2607],
  'standing/RestingBW': [7, 62, 1274, 2880], 'standing/RestingWB': [7, 62, 1274, 2879],
  'standing/RoboDanceBW': [-146, 62, 1350, 2926], 'standing/RoboDanceWB': [-146, 62, 1350, 2927],
  'standing/BlazerPantsBW': [-75, 62, 1046, 2826], 'standing/BlazerPantsWB': [-75, 62, 1046, 2827], 'standing/PolkaDots': [42, 62, 830, 2837],
  'standing/ShirtPantsBW': [44, 62, 894, 2934], 'standing/ShirtPantsWB': [44, 62, 894, 2934],
  'standing/WalkingBW': [-83, 62, 1035, 2848], 'standing/WalkingWB': [-83, 62, 1035, 2848],
  'sitting/OneLegUpBW': [-72, 62, 1305, 1920], 'sitting/OneLegUpWB': [-72, 62, 1305, 1920],
  'sitting/MediumBW': [-285, 62, 1322, 1833], 'sitting/MediumWB': [-285, 62, 1322, 1833],
  'sitting/HandsBackBW': [-88, 62, 1258, 1807], 'sitting/HandsBackWB': [-88, 62, 1258, 1807], 'sitting/ClosedLegBW': [-2, 62, 1347, 1966], 'sitting/ClosedLegWB': [-2, 62, 1347, 1966], 'sitting/CrossedLegs': [89, 62, 1421, 2243],
};

// how each person looks: the demo's four are set; anyone else gets one picked from their id, until they pick
// their own (LookSheet; the store hands those over with setLooks). `tone` is their clothes: BW a dark top
// over light trousers, WB the other way round
const LOOKS = {
  u1: { hair: 'ShortVolumed', face: 'Smile', beard: 'MoustacheThin', tone: 'WB' },
  u2: { hair: 'LongBangs', face: 'Cute', tone: 'BW' },
  u3: { hair: 'MediumShort', face: 'Cheeky', glasses: 'GlassRound', tone: 'WB' },
  u4: { hair: 'Bun', face: 'Smile', tone: 'BW' },
};
const HAIRS = ['Short', 'ShortCurly', 'ShortMessy', 'ShortWavy', 'ShortVolumed', 'Medium', 'MediumShort', 'MediumLong', 'MediumStraight', 'Long', 'LongBangs', 'LongCurly', 'Bun', 'Bangs', 'Pomp', 'FlatTop', 'Afro', 'Twists'];
const FACES = ['Smile', 'Cute', 'Cheeky', 'SmileLol']; // open-eyed, friendly (a blink closes them now and then)
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
let picked = {};
export const setLooks = (looks) => { picked = looks || {}; };
export function lookOf(id) {
  if (picked[id]) return picked[id];
  if (LOOKS[id]) return LOOKS[id];
  const h = hash(String(id));
  return { hair: HAIRS[h % HAIRS.length], face: FACES[(h >>> 8) % FACES.length], tone: (h >>> 16) % 2 ? 'BW' : 'WB' };
}

// what one can pick from in LookSheet (the library's work clothes, the monsters and the cross faces left out)
export const CHOICES = {
  hair: ['Short', 'ShortVolumed', 'ShortMessy', 'ShortWavy', 'ShortCurly', 'ShortScratch', 'Pomp', 'FlatTop', 'FlatTopLong', 'Mohawk',
    'ShavedSides', 'ShavedRight', 'ShavedWavy', 'Medium', 'MediumShort', 'MediumStraight', 'MediumLong', 'MediumBangs', 'MediumBangsFilled',
    'MediumShade', 'Bangs', 'BangsFilled', 'Long', 'LongBangs', 'LongCurly', 'LongAfro', 'Afro', 'Twists', 'TwistsVolumed', 'CornRows',
    'CornRowsFilled', 'BantuKnots', 'Bun', 'Buns', 'BunCurly', 'BunFancy', 'GrayShort', 'GrayMedium', 'GrayBun', 'Bald', 'BaldTop',
    'BaldSides', 'Beanie', 'HatHip', 'Hijab', 'Turban'],
  face: ['Smile', 'Cute', 'Cheeky', 'SmileLol', 'SmileBig', 'SmileTeeth', 'LoveGrin', 'EatingHappy', 'Calm', 'Awe', 'Blank', 'Serious', 'Suspicious', 'Tired'],
  beard: ['None', 'MoustacheThin', 'Chin', 'Goatee', 'GoateeCircle', 'Imperial', 'Painters', 'PaintersFilled', 'Handlebars', 'Dali',
    'Swashbuckler', 'MajesticHandlebars', 'Full', 'FullMedium', 'FullMajestic', 'GrayFull', 'Yosemite'],
  glasses: ['None', 'GlassRound', 'GlassRoundThick', 'GlassClubmaster', 'GlassAviator', 'GlassButterfly', 'GlassButterflyOutline',
    'SunglassWayfarer', 'SunglassClubmaster', 'Eyepatch'],
  tone: ['WB', 'BW'],
};
// a look's piece of one kind ("hair/Bun"), none for 'None'
export const pieceKey = (kind, name) => (name && name !== 'None' ? `${{ hair: 'hair', face: 'face', beard: 'facialHair', glasses: 'accessories' }[kind]}/${name}` : null);

// where the head's pieces go on it (the library's own offsets); the head's top left is at 225, 0 on a body
export const HEAD_AT = [225, 0];
export const PIECE_AT = { face: [159, 186], beard: [123, 338], glasses: [47, 241] };

// a person's picture: head and shoulders off the standing pose they're drawn in (so it's the same person as
// in the day scene), as an SVG data URL for any <img>. Made once their pieces have loaded; until then a
// blank (avatarOf starts the loading; onAvatars hears when one's ready, to draw again)
export const AVATAR_BOX = [40, 10, 860, 860];
const BLANK = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E';
const made = new Map(); // look → url
const making = new Set();
const listeners = new Set();
export const onAvatars = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const keyOf = (look) => [look.hair, look.face, look.beard, look.glasses, look.tone].join('/');
const text = (node, ink, fill) => {
  if (!Array.isArray(node)) return '';
  const [tag, props, ...kids] = node;
  const attrs = Object.entries(props).map(([k, v]) => ` ${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${v === '$S' ? ink : v === '$B' ? fill : v}"`).join('');
  return `<${tag}${attrs}>${kids.map((c) => text(c, ink, fill)).join('')}</${tag}>`;
};
function avatarSvg(look, ink = '#18181B', fill = '#fff') {
  const at = (kind, name) => { const t = treeOf(pieceKey(kind, name)); return t ? `<g transform="translate(${PIECE_AT[kind] || [0, 0]})">${text(t, ink, fill)}</g>` : ''; };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${AVATAR_BOX.join(' ')}">${text(treeOf(`standing/Resting${look.tone || 'BW'}`), ink, fill)}`
    + `<g transform="translate(${HEAD_AT})">${at('hair', look.hair)}${at('face', look.face)}${at('beard', look.beard)}${at('glasses', look.glasses)}</g></svg>`;
}
export function avatarOf(id) {
  const look = lookOf(id); const k = keyOf(look);
  if (made.has(k)) return made.get(k);
  if (!making.has(k)) {
    making.add(k);
    Promise.all(piecesOf(look, `standing/Resting${look.tone || 'BW'}`).map(load)).then(() => {
      made.set(k, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(look))}`);
      listeners.forEach((fn) => fn());
    }).catch(() => making.delete(k));
  }
  return BLANK;
}

// true once every piece given has loaded (false again while a new set loads; at once if they all have, so a
// scene of people already seen draws them straight away)
export function usePeeps(keys) {
  const list = [...new Set(keys)].join('|');
  const [doneFor, setDoneFor] = useState(null);
  const all = list.split('|').every((k) => !k || treeOf(k));
  useEffect(() => {
    let live = true;
    Promise.all(list.split('|').filter(Boolean).map(load)).then(() => { if (live) setDoneFor(list); }).catch(() => {});
    return () => { live = false; };
  }, [list]);
  return all || doneFor === list;
}
