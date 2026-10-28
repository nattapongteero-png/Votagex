import { lazy, Suspense, useEffect, useState } from 'react';
import Peep from './Peep';
import SpeechNotes from './SpeechNotes';
import { Land, Prop, Scarf, Space, Sweat } from './scenery';
import { POSE_BOX, piecesOf, usePeeps } from './peeps';

const SceneWeather = lazy(() => import('./SceneWeather'));

// The home page's stage: today as a little scene of Open Peeps (Peep.jsx), in place of the calendar, drawn
// straight on the page (no card) in a park at life size (scenery.jsx), which reaches on up behind the header.
// I'm always the one on the left; my notes (what used to float over my picture) are my thoughts, one at a time
// in a bubble over my head: the first comes by itself once the hellos are done, then each tap on me brings
// the next, and each goes again after a few seconds.
// Each pose of the library comes in its own clothes, so we're dressed for the weather by the pose (WEAR), each
// of us in something different, and keep to it: no walking in, no gestures.
// A day out: me on the left, the friends going on the right, the first of them says hi (where we're off to and
// when is in the cards below). On my own page (no group picked) it's only me, in the middle.
// A day with nothing on: I'm by the signpost (on a fair day, arms crossed), my head tilting now and then,
// wondering where to go; the bench behind me empty. A change of scene (another profile picked) is a Remotion
// transition (SceneSwap.jsx).
// The day's weather (where I am today) plays on it all: the sky and the land take its colour, the sun or the
// clouds are up (sailing across), rain falls in depth with ripples on the land, a storm flashes, fog drifts
// (SceneWeather.jsx, a Remotion loop, behind the park so a bush or a tree keeps the rain off what's behind it).
// On a wet day we're under a shelter, dry, the rain all round and running off the roof; on a hot one we sweat;
// on a cold one we've scarves on and the trees have lost most of their leaves.
// We fade in as it shows, then only breathe and blink; tap it for the plan, or for ideas on a free day.

const FULL = 3000; // a standing person's height in the library's units, feet to above the hair
// a person's box (round all their `poses`, should they have more than one); feet on the bottom
const footOf = (poses) => Math.max(...poses.map((p) => POSE_BOX[p][1] + POSE_BOX[p][3])) + 12;
const boxOf = (poses) => {
  const bs = poses.map((p) => POSE_BOX[p]);
  const x0 = Math.min(...bs.map((b) => b[0])) - 40; const x1 = Math.max(...bs.map((b) => b[0] + b[2])) + 40;
  const foot = footOf(poses);
  const h = poses[0].startsWith('standing') ? FULL : foot + 60;
  return [x0, foot - h, x1 - x0, h];
};
// how high a person's head comes, off the ground, in --tall (the top of every pose's hair is at 62)
const headOf = (poses) => (footOf(poses) - 62) / FULL;
// a bust sits at a table, its head as high as someone sat on a chair (the chair pose's, 2243 off the floor): how
// far off the floor it starts, in --tall (the table hides where it stops)
const SEATED_HEAD = 2243;
const liftOf = (poses) => (poses[0].startsWith('bust') ? (SEATED_HEAD - (footOf(poses) - 62)) / FULL : 0);
// where the face is across a pose (the head's always at the same place on one, the face 440–620 across): a person
// is placed by it, so it's the face that lands on the phi grid
const FACE_X = 530;

// a person, in one pose or swapping between `poses` (CSS); looking left with `flip`; with `onTap`, one to tap.
// gear: { sweat, scarf: 'dark' | 'light' }, drawn in each pose's own units over it (so it moves with it).
// `far`: px back up the land (smaller for it)
function Person({ look, poses, flip, onTap, label, gear = {}, far = 0, className = '', style }) {
  const [x, y, w, h] = boxOf(poses);
  const face = (FACE_X - x) / w;
  const scale = 1 - far / HORIZON;
  const lift = liftOf(poses) * scale;
  const tap = onTap ? { role: 'button', tabIndex: 0, 'aria-label': label, onClick: onTap, onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && onTap() } : {};
  const svg = { viewBox: `${x} ${y} ${w} ${h}`, style: flip ? { transform: 'scaleX(-1)' } : undefined };
  return (
    <div className={`ds-person ${className}${onTap ? ' ds-tappable' : ''}`} {...tap}
      style={{ aspectRatio: `${w} / ${h}`, height: `calc(var(--tall) * ${(h / FULL) * scale})`, '--far': `${far}px`, '--lift': lift, '--face': flip ? 1 - face : face, ...style }}>
      {poses.map((pose, i) => (
        <svg key={pose} className={`ds-pose ds-pose-${i}`} {...svg}>
          {/* (one group, so it all breathes as one: what they wear moves with them) */}
          <g>
            <Peep look={look} pose={pose} blink />
            {gear.scarf && <Scarf dark={gear.scarf === 'dark'} />}
            {gear.sweat && <Sweat />}
          </g>
        </svg>
      ))}
    </div>
  );
}

// a pose in a person's tone (BW: a dark top over light trousers, WB the other way round; some come in one only)
const ONE_TONE = new Set(['standing/PolkaDots', 'sitting/CrossedLegs']);
const pose = (look, kind) => (ONE_TONE.has(kind) || kind.startsWith('bust') ? kind : `${kind}${look.tone || 'BW'}`);
// what we wear, by the weather, each of us something different (me, then each friend): each of the library's
// poses comes in its own clothes, so the clothes are the pose, and we each keep to one (no one changes clothes,
// no gestures). Long sleeves, a shirt, polka dots on a fair day (on a free day I've my arms crossed, wondering);
// jackets in the rain; a blazer, arms hugged round, a jacket in the cold; T-shirts in the heat, sat on the
// ground (a T-shirt's only standing pose is mid-stride). Not the poses with a prosthetic leg, a wheelchair or a
// doctor's clothes: those are who someone is, not the weather
const WEAR = {
  fair: ['standing/Resting', 'standing/ShirtPants', 'standing/PolkaDots'],
  wet: ['standing/Easing', 'standing/BlazerPants', 'standing/ShirtPants'],
  cold: ['standing/BlazerPants', 'standing/CrossedArms', 'standing/Easing'],
  hot: ['sitting/OneLegUp', 'sitting/HandsBack', 'sitting/Medium'],
};
// out to eat, sat at the table: busts (the table hides where they stop), still dressed for the weather we came
// out in, each something different (at a café, me with a coffee)
const AT_TABLE = {
  fair: ['bust/ButtonShirt', 'bust/StripedShirt', 'bust/Dress'],
  wet: ['bust/Hoodie', 'bust/ShirtCoat', 'bust/BlazerBlackTee'],
  cold: ['bust/Sweater', 'bust/Turtleneck', 'bust/FurJacket'],
  hot: ['bust/Shirt', 'bust/SportyShirt', 'bust/Selena'],
};
// at home: me on the sofa, legs crossed; friends round on the rug; in what we wear at home, whatever the weather
const AT_HOME = ['sitting/CrossedLegs', 'sitting/HandsBack', 'sitting/OneLegUp'];
// indoors, the room (scenery.jsx Space, in perspective) and what's in it, as the park's props are: `X` across as
// it would be at our feet (it's drawn on toward the vanishing point, the further back the more), or `x` where it
// is in the picture; `up` hung on a wall, people's units off the floor. Framed as the park is, a plant at the side
// in front, cut by the edge. Out to eat: the lamps over the tables hung in rows on back, the board on the back
// wall. At home: me on the sofa (with friends, on its right end, towards them; on my own, in the middle), the
// picture over it, the standard lamp, and the rug (in the Space) where the friends sit, or in front of me
const LAMP_UP = 3300;
const ROOMS = {
  eat: () => [{ p: 'plant', X: -0.02, far: 24 }, { p: 'plant', X: 1.04, far: 30, size: 0.85, flip: true }, { p: 'board', X: 0.1, far: 149, up: 2300 },
    ...[110, 40].flatMap((far) => [0.2, 0.8].map((X) => ({ p: 'pendant', args: [LAMP_UP], X, far, up: LAMP_UP })))],
  home: (sofa) => [{ p: 'floorLamp', X: 1.0, far: 30 }, { p: 'picture', x: sofa, far: 124, up: 1900, size: 1.5 }, { p: 'sofa', x: sofa, far: 14 },
    { p: 'plant', X: 0.0, far: 20 }],
};
const SOFA_W = 3800;
const RUG = [[0.16, 0.7, -24, 8], [0.5, 0.98, -16, 34]];

// Seen from a little over our heads, as the people are drawn (the tops of their shoes show, a foot set back sits
// higher): the horizon (the hills) is HORIZON px over our feet, above our heads, so the land (Land, a tint, not
// a line) spreads out round us and the bench shows its seat's top. We stand level, at the front; the park is
// further back, each thing `far` px up the land and smaller by as much as that's nearer the horizon.
const HORIZON = 240;
// the park round us, a stage framed by two trees, the big one on the left, a smaller one on the right (the
// same tree turned round); a bush at the foot of each. { p: prop, x: centre, size: of life size, far: px back up the land, flip } or, in the sky,
// { p, x, top: off the top of the whole backdrop (header and all), size }. Nothing may reach past the top of the
// page (a crop there clashes with the browser's bar). A free day: the signpost near the middle (I stand by it),
// the bench back on the left, empty. On a wet day, a shelter over us (and the signpost out from under it)
// The path (Space) runs back from under our feet; the tufts are on the grass either side of it (`X`, drawn on
// toward the vanishing point as the path's edges are, so they stay off it)
const FRAME = [{ p: 'tuft', X: 0.06, far: -24 }, { p: 'tuft', X: 1.04, far: -20 }, { p: 'tuft', X: 0.02, far: 40 }, { p: 'tuft', X: 1.1, far: 36 },
  { p: 'tuft', X: -0.06, far: 90, size: 0.9 }, { p: 'tuft', X: 0.1, far: 130, size: 0.8 }, { p: 'tuft', X: 1.06, far: 150 },
  { p: 'tree', x: 0.03, far: 60 }, { p: 'tree', x: 0.97, far: 74, size: 0.82, flip: true }];
// the sky, by the weather: a fair day's sun glowing and birds crossing; a scorcher's sun huge and white-hot; a
// dull day's clouds big and grey-bellied, no sun; rain's clouds low and grey; fog has none
const BIRDS = { p: 'birds', x: '30%', top: '31%', size: 0.42, fly: 16 };
const SKY = {
  sun: [{ p: 'sun', x: '66%', top: '27%', size: 0.55 }, BIRDS, { ...BIRDS, x: '74%', top: '25%', size: 0.3, fly: 12 }],
  hot: [{ p: 'sun', x: '62%', top: '24%', size: 0.85 }],
  partly: [{ p: 'sun', x: '60%', top: '28%', size: 0.5 }, { p: 'cloud', x: '72%', top: '33%', size: 0.5 }, { p: 'cloud', x: '24%', top: '30%', size: 0.4 }, BIRDS],
  cloud: [{ p: 'cloud', x: '12%', top: '35%', size: 0.42 }, { p: 'cloud', x: '36%', top: '27%', size: 0.62 },
    { p: 'cloud', x: '64%', top: '31%', size: 0.75 }, { p: 'cloud', x: '90%', top: '26%', size: 0.5 }],
  rain: [{ p: 'cloud', x: '60%', top: '28%', size: 0.56 }, { p: 'cloud', x: '27%', top: '33%', size: 0.44 }, { p: 'cloud', x: '87%', top: '36%', size: 0.36 }],
  fog: [],
};
SKY.storm = SKY.rain;
SKY.snow = SKY.cloud;
// a cloud (or the birds, faster) sails on across the sky with the wind, left to right as the rain leans, round and
// in again from the left; the smaller (further) ones slower. Set going from where it's placed (x)
const across = (x, size, speed = 40) => { const dur = speed / size; return { '--dur': `${dur.toFixed(1)}s`, '--delay': `${(-parseFloat(x) / 100 * dur).toFixed(1)}s` }; };
// a mild day, some cloud: butterflies about the bushes. A cold one: leaves falling from the trees (both drawn
// bigger than life, to be seen)
const BUTTERFLIES = [{ p: 'butterfly', x: '21%', far: 76, size: 1.4 }, { p: 'butterfly', x: '81%', far: 70, size: 1.2 }];
const FALLING = [['7%', 33], ['15%', 37], ['89%', 36], ['95%', 40], ['22%', 41]].map(([x, top], i) => ({ p: 'leaf', x, top: `${top}%`, size: 1.1, falling: i }));
const BACKDROP = [...FRAME, { p: 'bush', X: -0.02, far: 44, size: 0.7 }, { p: 'bush', X: 1.08, far: 50, size: 0.55, flip: true }];
// The picture's laid out on the golden section, the phi grid of what shows of the stage (lines .382 and .618
// across it, and up it, CSS --ground): our faces on its lines, mine on the left one, the friend's who says hi
// on the right one (a second friend a step behind, at the golden spiral's eye, .724), face to face. The place is
// in one-point perspective (Space): when we meet, its vanishing point is between us, so it all runs back to where
// we say hi; on my own, it's on the other line, ahead of me, the way I'm looking.
// Where we stand, by how many friends (two at most): my face (a share across), and each friend's [face, px back
// up the land]
const PHI = 0.618;
const LAYOUT = [
  { me: 1 - PHI, at: [] },
  { me: 1 - PHI, at: [[PHI, 0]] },
  { me: 1 - PHI, at: [[PHI, 0], [0.724, 11]] },
];
const pct = (k) => `${+(k * 100).toFixed(2)}%`;
const SHELTER = [4600, 3800]; // the shelter's size in people's units (scenery.jsx), for the rain to keep off under it
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// scene: { kind: 'meet' | 'free', me, friends: [look], label, ask (free) }; a free day with friends (a group
// picked) has us stood as on a day out;
// notes: what I say (SpeechNotes), after the hellos
export default function DayScene({ scene, notes = [], weather = { kind: 'partly' }, onTap, onReady }) {
  const { me, kind } = scene;
  const friends = scene.friends || [];
  const n = friends.length;
  const free = kind === 'free';
  const wet = weather.kind === 'rain' || weather.kind === 'storm';
  const sky = weather.hot ? 'hot' : weather.kind;
  // where we are: with nothing on, at home; out to eat (the next stop a restaurant or a café), at the table;
  // anywhere else, the park
  const place = free ? 'home' : scene.cat === 'food' || scene.cat === 'cafe' ? 'eat' : 'park';
  const indoor = place !== 'park';
  // dressed for the day (the rain before the cold before the heat), one pose each
  const day = wet ? 'wet' : weather.cold ? 'cold' : weather.hot ? 'hot' : 'fair';
  const cast = [me, ...friends].map((look, i) => [look, [pose(look, place === 'home' ? AT_HOME[i]
    : place === 'eat' ? (scene.cat === 'cafe' && !i ? 'bust/Coffee' : AT_TABLE[day][i]) : WEAR[day][i])]]);
  // dressed for it outdoors: a scarf against the cold (dark on a light top), sweat in the heat
  const gear = (look) => (indoor ? {} : { sweat: weather.hot, scarf: weather.cold && ((look.tone || 'BW') === 'WB' ? 'dark' : 'light') });
  const ready = usePeeps(['face/EyesClosed', ...cast.flatMap(([look, poses]) => poses.flatMap((p) => piecesOf(look, p)))]);
  // (for a change of scene, SceneSwap.jsx: it goes once our people are drawn)
  useEffect(() => { if (ready) onReady?.(); }, [ready, onReady]);
  // where we are (at the table, a little back from it)
  const sat = place === 'eat' ? 16 : 0;
  const meAt = LAYOUT[n].me;
  const at = (i) => LAYOUT[n].at[i][0];
  const back = (i) => LAYOUT[n].at[i][1] + sat;
  // how high a head is off the ground, in --tall (a bust's off the floor it starts; further back, smaller)
  const headAt = (poses, far) => (liftOf(poses) + headOf(poses)) * (1 - far / HORIZON);
  // the vanishing point (between us, or ahead of me on my own), and where a thing `far` back is in the picture
  // that would be `X` across at our feet
  const vx = n ? 0.5 : PHI;
  const toward = (X, far = 0) => vx + (X - vx) * (1 - far / HORIZON);
  // what keeps the rain off us outdoors, centred on us: a shelter
  const cover = !indoor && wet ? 'shelter' : null;
  const coverAt = n ? 50 : 45;
  // my thoughts, one at a time, just over my head, out to the side where there's room (towards the friends):
  // { i: which, k: a count to start each afresh, on: showing }. The first comes once the hellos are done
  // (straight away with reduced motion); a tap on me brings the next
  const said = free ? [{ key: 'ask', text: scene.ask, onClick: onTap }, ...notes] : notes;
  const [thought, setThought] = useState({ i: -1, k: 0, on: false });
  useEffect(() => {
    const t = setTimeout(() => setThought((x) => (x.i < 0 ? { i: 0, k: 1, on: true } : x)), reduced() ? 0 : !free && n ? 3200 : 900);
    return () => clearTimeout(t);
  }, [free, n]);
  const think = () => said.length && setThought((x) => ({ i: (x.i + 1) % said.length, k: x.k + 1, on: true }));
  const shown = thought.on && said[thought.i % said.length];

  // at home, the sofa under me (its middle, or with friends its right end): where my body's middle is, off my face
  const [bx, , bw] = boxOf(cast[0][1]);
  const sofa = `calc(${pct(meAt)} + var(--tall) * ${((bx + bw / 2 - FACE_X - (n ? SOFA_W / 4 : 0)) / FULL).toFixed(3)})`;
  const props = place === 'home' ? ROOMS.home(sofa) : indoor ? ROOMS[place]() : [...(SKY[sky] || SKY.partly), ...BACKDROP,
    ...(sky === 'partly' && !weather.cold ? BUTTERFLIES : []), ...(weather.cold ? FALLING : [])];
  // out to eat, the table across in front of us laid where we sit: a plate before me and the friend who says hi,
  // glasses between (on my own, a small one)
  const laid = n ? [4200, [meAt, at(0)].map((f) => (f - 0.5) * 0.96 + 0.5), [0.5, 0.86]] : [1800, [0.5], [0.82]];
  return (
    <div className={`ds ds-${kind} ds-at-${place} ds-wx-${weather.kind}${weather.hot ? ' ds-hot' : ''}${weather.cold ? ' ds-cold' : ''}${ready ? ' ready' : ''}`}
      style={{ '--horizon': `${HORIZON}px` }}>
      {!indoor && <Land />}
      <div className="ds-world" aria-hidden="true">
        {!indoor && <div className="ds-skytint" />}
        <Space place={place} vx={vx} horizon={HORIZON} weather={weather} rug={place === 'home' && RUG[n ? 1 : 0]} />
        {/* the weather in the air goes behind the park, so a bush or a tree keeps it off what's behind them */}
        {!indoor && (wet || weather.kind === 'fog') && (
          <Suspense fallback={null}>
            <SceneWeather kind={weather.kind} level={weather.level} horizon={HORIZON}
              shelter={wet ? { at: coverAt / 100, w: SHELTER[0], h: SHELTER[1] } : null} />
          </Suspense>
        )}
        {props.map(({ p, args, x, X, size = 1, top, far, up, flip, fly, falling }, i) => {
          if (top) {
            const go = p === 'cloud' ? across(x, size) : fly ? across(x, size, fly) : null;
            return <Prop key={i} kind={p} x={x} size={size} className={`ds-sky${fly ? ' ds-fly' : ''}${falling != null ? ' ds-falling' : ''}`}
              style={{ top, ...go, ...(falling != null ? { '--delay': `${-falling * 1.7}s` } : {}) }} />;
          }
          // (in the cold, the trees all but bare)
          const k = size * (1 - (far || 0) / HORIZON);
          const where = X != null ? pct(toward(X, far)) : typeof x === 'number' ? pct(x) : x;
          return <Prop key={i} kind={p === 'tree' && weather.cold ? 'bareTree' : p} args={args} x={where} size={k} className={p === 'butterfly' ? `ds-bfly ds-bfly-${i % 2}` : ''}
            style={{ '--far': `${far || 0}px`, '--up': up ? `calc(var(--tall) * ${(up * k) / FULL})` : undefined, transform: flip ? 'scaleX(-1)' : undefined }} />;
        })}
        {cover && <Prop kind={cover} x={`${coverAt}%`} />}
        {!indoor && weather.kind === 'fog' && [0, 1, 2].map((i) => <i key={i} className={`ds-mist ds-mist-${i}`} />)}
      </div>
      <button className="ds-tap" onClick={onTap} aria-label={scene.label} />
      {ready && (
        <>
          {/* the furthest back first, so the nearer ones stand in front */}
          {friends.map((look, i) => (
            <Person key={i} look={look} poses={cast[i + 1][1]} flip gear={gear(look)} far={back(i)} className="ds-friend"
              style={{ '--x': pct(at(i)), '--blink': `${1.1 + 0.9 * i}s` }} />
          )).reverse()}
          {/* me, facing them (on a free day, my head tilting now and then, wondering) */}
          <Person look={me} poses={cast[0][1]} onTap={think} label="ความคิดของฉัน" gear={gear(me)} far={sat} className={`ds-me${free ? ' ds-wonder' : ''}`}
            style={{ '--x': pct(meAt), '--blink': free ? '1.6s' : '2.4s' }} />
          {/* out to eat, the table across in front of us */}
          {place === 'eat' && <Prop kind="table" args={laid} x={n ? '50%' : pct(meAt)} className="ds-front" />}
          {!free && n > 0 && <span className="ds-say" style={{ '--x': pct(at(0)), '--far': `${back(0)}px`, '--head': headAt(cast[1][1], back(0)) }}>หวัดดี!</span>}
        </>
      )}
      {/* fog low over the ground, in front of our feet */}
      {!indoor && weather.kind === 'fog' && <i className="ds-mist ds-mist-low" />}
      {ready && shown && (
        <div key={thought.k} className="ds-note right" style={{ '--x': pct(meAt), '--far': `${sat}px`, '--head': headAt(cast[0][1], sat) }}
          onAnimationEnd={(e) => e.target === e.currentTarget && setThought((x) => ({ ...x, on: false }))}>
          <SpeechNotes notes={[shown]} />
        </div>
      )}
    </div>
  );
}
