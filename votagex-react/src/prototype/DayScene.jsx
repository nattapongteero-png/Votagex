import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Peep from './Peep';
import SpeechNotes from './SpeechNotes';
import { Prop, Scarf, Sweat } from './scenery';
import { POSE_BOX, piecesOf, usePeeps } from './peeps';

const SceneWeather = lazy(() => import('./SceneWeather'));
// the places, built in 3D and drawn as an architect's sketch (scene3d/)
const Scene3D = lazy(() => import('./scene3d/Scene3D'));

// The home page's stage: today as a little scene of Open Peeps (Peep.jsx), in place of the calendar, drawn
// straight on the page (no card) at life size in a place built in 3D and drawn as an architect's sketch
// (scene3d/), which reaches on up behind the header: a café when we're out to eat, the park when we're out
// anywhere else, the living room at home when there's nothing on.
// I'm always the one on the left; my notes (what used to float over my picture) are my thoughts, one at a time
// in a bubble over my head: the first comes by itself once the hellos are done, then each tap on me brings
// the next, and each goes again after a few seconds.
// Each pose of the library comes in its own clothes, so we're dressed for the weather by the pose (WEAR), each
// of us in something different, and keep to it: no walking in, no gestures.
// A day out: me on the left, the friends going on the right, the first of them says hi (where we're off to and
// when is in the cards below). On my own page (no group picked) it's only me. A day with nothing on: at home on
// my own, my head tilting now and then, wondering where to go. Each place is taken as a photographer would take it, the
// framing chosen for it and for how many of us there are (FRAMING). A change of scene (another profile picked)
// is a Remotion transition (SceneSwap.jsx).
// The day's weather (where I am today) plays on it all: outdoors the sky takes its colour, clouds are up
// (sailing across), rain falls in depth, a storm flashes, fog drifts (SceneWeather.jsx, a Remotion loop); no
// sun in the sky, the sun is in the light (scene3d: warm light and cool shadows, our shadows with the trees'; a
// glow in from where it is); on a wet day we're in the park's sala, dry, the rain all round; on a hot one we
// sweat; on a cold one we've scarves on and the trees are bare. Indoors it's at the windows: the sun on the
// floor, the glare, the rain going past, the flashes.
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
// `far`: px back up the land (smaller for it, by how near the `horizon` that is)
function Person({ look, poses, flip, onTap, label, gear = {}, far = 0, horizon = HORIZON, className = '', style }) {
  const [x, y, w, h] = boxOf(poses);
  const face = (FACE_X - x) / w;
  const scale = 1 - far / horizon;
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
// at home (on my own): me on the sofa, legs crossed, in what I wear at home, whatever the weather
const AT_HOME = 'sitting/CrossedLegs';
// Seen from a little over our heads, as the people are drawn (the tops of their shoes show, a foot set back sits
// higher): the horizon is HORIZON px over our feet, above our heads (the camera Scene3D draws the place through
// is put there). We stand level, each of us `far` px back up the ground and smaller by as much as that's nearer
// the horizon.
const HORIZON = 240;
// (at home the camera's lower, at about the height of our heads sat down, as an interior's taken from the chest:
// the ceiling over us in the picture as well as the floor)
const HORIZON_AT = { home: 165 };
// the sky, by the weather (no sun: the sun's in the light): birds crossing on a fair day; a scorcher's empty,
// white-hot; a dull day's clouds big and grey-bellied; rain's low and grey; fog has none
const BIRDS = { p: 'birds', x: '30%', top: '31%', size: 0.42, fly: 16 };
const SKY = {
  sun: [BIRDS, { ...BIRDS, x: '74%', top: '25%', size: 0.3, fly: 12 }],
  hot: [],
  partly: [{ p: 'cloud', x: '72%', top: '33%', size: 0.5 }, { p: 'cloud', x: '24%', top: '30%', size: 0.4 }, BIRDS],
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
// a cold day: leaves falling from the trees down either side of the walk (drawn bigger than life, to be seen)
const FALLING = [['7%', 33], ['15%', 37], ['89%', 36], ['95%', 40], ['22%', 41]].map(([x, top], i) => ({ p: 'leaf', x, top: `${top}%`, size: 1.1, falling: i }));
// The picture's laid out on the golden section, the phi grid of what shows of the stage (lines .382 and .618
// across it, and up it, CSS --ground): our faces on its lines, mine on the left one, the friend's who says hi
// on the right one (a second friend a step behind, at the golden spiral's eye, .724), face to face. Seen straight
// on, when we meet the vanishing point is between us, so it all runs back to where we say hi; on my own, it's on
// the other line, ahead of me, the way I'm looking.
// Where we stand, by how many friends (two at most): my face (a share across), and each friend's [face, px back
// up the land]
const PHI = 0.618;
const LAYOUT = [
  { me: 1 - PHI, at: [] },
  { me: 1 - PHI, at: [[PHI, 0]] },
  { me: 1 - PHI, at: [[PHI, 0], [0.724, 11]] },
];
// (sat down there's no stepping back: the second friend sits beside the first, the same step on from them as
// they are from me, so the three of us are spaced evenly)
const SIDE_BY_SIDE = { me: 1 - PHI, at: [[PHI, 0], [PHI + (2 * PHI - 1) * 0.97, 0]] };
// Each place taken as a photographer would, the framing chosen for it and for how many of us there are (LAYOUT,
// seen straight on, where it's left out; `vx` the vanishing point, the camera turned `yaw` to the left):
// - the café, two of us: over my shoulder, me close in the foreground on the left cut by the frame, the friend
//   across a round table further in on the right, the camera turned toward the window so the room runs back past
//   them (Scene3D `stage`); three, side by side at a long table, a group's picture; me alone, straight on;
// - home (on my own): from the front corner of the room, turned a little across it toward the window I'm
//   looking at, me on the left third, the room opening out ahead of me;
// - the park: from beside the walk, turned across it, so it runs off at a slant past us to the far end (its
//   strongest line, leading on to the friends), a big tree near us framing the left (park.js); the same for any
//   of us, so on a change of group I stay put.
const ART_TWO = { me: 0.3, meFar: -112, at: [[0.75, 42]], vx: 0.25, yaw: 0.38, stage: 'art' };
const FRAMING = {
  eat: [null, ART_TWO, SIDE_BY_SIDE],
  home: [{ me: 0.34, at: [], vx: 0.62, yaw: -0.2 }],
  park: LAYOUT.map((l) => ({ ...l, vx: 0.26, yaw: 0.36 })),
};
const pct = (k) => `${+(k * 100).toFixed(2)}%`;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// scene: { kind: 'meet' | 'free', me, friends: [look], label, ask (free) };
// notes: what I say (SpeechNotes), after the hellos
export default function DayScene({ scene, notes = [], weather = { kind: 'partly' }, onTap, onReady }) {
  const { me, kind } = scene;
  const free = kind === 'free';
  // (with nothing on, I'm at home on my own: no one's come round, whichever group's picked)
  const friends = free ? [] : scene.friends || [];
  const n = friends.length;
  const wet = weather.kind === 'rain' || weather.kind === 'storm';
  const sky = weather.hot ? 'hot' : weather.kind;
  // where we are: with nothing on, at home; out to eat (the next stop a restaurant or a café), at the table;
  // anywhere else, the park
  const place = free ? 'home' : scene.cat === 'food' || scene.cat === 'cafe' ? 'eat' : 'park';
  const indoor = place !== 'park';
  // dressed for the day (the rain before the cold before the heat), one pose each
  const day = wet ? 'wet' : weather.cold ? 'cold' : weather.hot ? 'hot' : 'fair';
  const cast = [me, ...friends].map((look, i) => [look, [pose(look, place === 'home' ? AT_HOME
    : place === 'eat' ? (scene.cat === 'cafe' && !i ? 'bust/Coffee' : AT_TABLE[day][i]) : WEAR[day][i])]]);
  // dressed for it outdoors: a scarf against the cold (dark on a light top), sweat in the heat
  const gear = (look) => (indoor ? {} : { sweat: weather.hot, scarf: weather.cold && ((look.tone || 'BW') === 'WB' ? 'dark' : 'light') });
  const ready = usePeeps(['face/EyesClosed', ...cast.flatMap(([look, poses]) => poses.flatMap((p) => piecesOf(look, p)))]);
  // (for a change of scene, SceneSwap.jsx: it goes once our people are drawn)
  useEffect(() => { if (ready) onReady?.(); }, [ready, onReady]);
  // where we are (at the table, a little back from it)
  const sat = place === 'eat' ? 16 : 0;
  const horizon = HORIZON_AT[place] || HORIZON;
  const layout = FRAMING[place][n] || LAYOUT[n];
  const meFar = layout.meFar ?? sat;
  const meAt = layout.me;
  const at = (i) => layout.at[i][0];
  const back = (i) => layout.at[i][1] + sat;
  // where we are in the place (the table's laid at our places), and the canvas for what's in front of us
  const front = useRef(null);
  // where the outside shows in the picture, under a roof (Scene3D: through the windows, past the sala's posts)
  const [outside, setOutside] = useState(null);
  const people = useMemo(() => [{ x: layout.me, far: meFar }, ...layout.at.map(([x, far]) => ({ x, far: far + sat }))], [layout, meFar, sat]);
  // how high a head is off the ground, in --tall (a bust's off the floor it starts; further back, smaller)
  const headAt = (poses, far) => (liftOf(poses) + headOf(poses)) * (1 - far / horizon);
  // the vanishing point (straight on: between us, or ahead of me on my own)
  const vx = layout.vx ?? (n ? 0.5 : PHI);
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

  // outdoors the sky's behind the place (Scene3D leaves it clear): the sun, the clouds, birds, falling leaves
  const props = indoor ? [] : [...(SKY[sky] || SKY.partly), ...(weather.cold ? FALLING : [])];
  return (
    <div className={`ds ds-${kind} ds-at-${place} ds-wx-${weather.kind}${weather.hot ? ' ds-hot' : ''}${weather.cold ? ' ds-cold' : ''}${ready ? ' ready' : ''}`}
      style={{ '--horizon': `${horizon}px` }}>
      <div className="ds-world" aria-hidden="true">
        {!indoor && <div className="ds-skytint" />}
        {props.map(({ p, x, size = 1, top, fly, falling }, i) => {
          const go = p === 'cloud' ? across(x, size) : fly ? across(x, size, fly) : null;
          return <Prop key={i} kind={p} x={x} size={size} className={`ds-sky${fly ? ' ds-fly' : ''}${falling != null ? ' ds-falling' : ''}`}
            style={{ top, ...go, ...(falling != null ? { '--delay': `${-falling * 1.7}s` } : {}) }} />;
        })}
        <Suspense fallback={null}>
          <Scene3D place={place} vx={vx} yaw={layout.yaw} stage={layout.stage} horizon={horizon} wx={weather.kind} hot={Boolean(weather.hot)} cold={Boolean(weather.cold)} people={people} front={front} onOutside={setOutside} />
        </Suspense>
        {/* the sun's light outdoors (no sun in the sky): a glow in from the top right, where it's coming from */}
        {!indoor && (weather.kind === 'sun' || weather.kind === 'partly') && <i className="ds-light" />}
        {/* the weather in the air: rain where the outside shows (past the sala's posts, out of the windows: never
            under a roof), fog over the park */}
        {((wet && outside) || (!indoor && weather.kind === 'fog')) && (
          <Suspense fallback={null}>
            <SceneWeather kind={weather.kind} level={weather.level} horizon={horizon} open={wet ? outside : null} far={indoor} />
          </Suspense>
        )}
        {!indoor && weather.kind === 'fog' && [0, 1, 2].map((i) => <i key={i} className={`ds-mist ds-mist-${i}`} />)}
      </div>
      <button className="ds-tap" onClick={onTap} aria-label={scene.label} />
      {ready && (
        <>
          {/* the furthest back first, so the nearer ones stand in front */}
          {friends.map((look, i) => (
            <Person key={i} look={look} poses={cast[i + 1][1]} flip gear={gear(look)} far={back(i)} horizon={horizon} className="ds-friend"
              style={{ '--x': pct(at(i)), '--blink': `${1.1 + 0.9 * i}s` }} />
          )).reverse()}
          {/* me, facing them (on a free day, my head tilting now and then, wondering) */}
          <Person look={me} poses={cast[0][1]} onTap={think} label="ความคิดของฉัน" gear={gear(me)} far={meFar} horizon={horizon} className={`ds-me${free ? ' ds-wonder' : ''}`}
            style={{ '--x': pct(meAt), '--blink': free ? '1.6s' : '2.4s', zIndex: meFar < 0 ? 1 : undefined }} />
          {!free && n > 0 && <span className="ds-say" style={{ '--x': pct(at(0)), '--far': `${back(0)}px`, '--head': headAt(cast[1][1], back(0)) }}>หวัดดี!</span>}
        </>
      )}
      {/* what's in front of us in the place (our table, the coffee table; under me when I'm in the foreground) */}
      <canvas ref={front} className="ds-3d-front" aria-hidden="true" />
      {/* fog low over the ground, in front of our feet */}
      {!indoor && weather.kind === 'fog' && <i className="ds-mist ds-mist-low" />}
      {ready && shown && (
        <div key={thought.k} className="ds-note right" style={{ '--x': pct(meAt), '--far': `${meFar}px`, '--head': headAt(cast[0][1], meFar) }}
          onAnimationEnd={(e) => e.target === e.currentTarget && setThought((x) => ({ ...x, on: false }))}>
          <SpeechNotes notes={[shown]} />
        </div>
      )}
    </div>
  );
}
