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
  'standing/CrossedArmsWB': [-199, 62, 1071, 2871], 'standing/EasingBW': [-190, 62, 1075, 2884], 'standing/EasingWB': [-190, 62, 1075, 2884],
  'standing/PointingFingerBW': [-15, 62, 1300, 2607], 'standing/PointingFingerWB': [-16, 62, 1300, 2607],
  'standing/RestingBW': [7, 62, 1274, 2880], 'standing/RestingWB': [7, 62, 1274, 2879],
  'standing/RoboDanceBW': [-146, 62, 1350, 2926], 'standing/RoboDanceWB': [-146, 62, 1350, 2927],
  'standing/ShirtPantsBW': [44, 62, 894, 2934], 'standing/ShirtPantsWB': [44, 62, 894, 2934],
  'standing/WalkingBW': [-83, 62, 1035, 2848], 'standing/WalkingWB': [-83, 62, 1035, 2848],
  'sitting/OneLegUpBW': [-72, 62, 1305, 1920], 'sitting/OneLegUpWB': [-72, 62, 1305, 1920],
  'sitting/MediumBW': [-285, 62, 1322, 1833], 'sitting/CrossedLegs': [89, 62, 1421, 2243],
};

// how each person looks: the demo's four are set; anyone else gets one picked from their id. `tone` is
// their clothes: BW a dark top over light trousers, WB the other way round
const LOOKS = {
  u1: { hair: 'ShortVolumed', face: 'Smile', beard: 'MoustacheThin', tone: 'WB' },
  u2: { hair: 'LongBangs', face: 'Cute', tone: 'BW' },
  u3: { hair: 'MediumShort', face: 'Cheeky', glasses: 'GlassRound', tone: 'WB' },
  u4: { hair: 'Bun', face: 'Smile', tone: 'BW' },
};
const HAIRS = ['Short', 'ShortCurly', 'ShortMessy', 'ShortWavy', 'ShortVolumed', 'Medium', 'MediumShort', 'MediumLong', 'MediumStraight', 'Long', 'LongBangs', 'LongCurly', 'Bun', 'Bangs', 'Pomp', 'FlatTop', 'Afro', 'Twists'];
const FACES = ['Smile', 'Cute', 'Cheeky', 'SmileLol']; // open-eyed, friendly (a blink closes them now and then)
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
export function lookOf(id) {
  if (LOOKS[id]) return LOOKS[id];
  const h = hash(String(id));
  return { hair: HAIRS[h % HAIRS.length], face: FACES[(h >>> 8) % FACES.length], tone: (h >>> 16) % 2 ? 'BW' : 'WB' };
}

// true once every piece given has loaded
export function usePeeps(keys) {
  const list = [...new Set(keys)].join('|');
  const [done, setDone] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all(list.split('|').filter(Boolean).map(load)).then(() => { if (live) setDone(true); }).catch(() => {});
    return () => { live = false; };
  }, [list]);
  return done;
}
