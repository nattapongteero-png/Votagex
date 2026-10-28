import { lazy, Suspense, useEffect, useState } from 'react';
import Peep from './Peep';
import SpeechNotes from './SpeechNotes';
import { Land, Prop, Scarf, Sweat } from './scenery';
import { POSE_BOX, piecesOf, usePeeps } from './peeps';

const SceneWeather = lazy(() => import('./SceneWeather'));

// The home page's stage: today as a little scene of Open Peeps (Peep.jsx), in place of the calendar, drawn
// straight on the page (no card) in a park at life size (scenery.jsx), which reaches on up behind the header.
// I'm always the one on the left; my notes (what used to float over my picture) are my thoughts, one at a time
// in a bubble over my head: the first comes by itself once the hellos are done, then each tap on me brings
// the next, and each goes again after a few seconds.
// Each pose of the library comes in its own clothes, so only the long-sleeved ones are used (standing easy,
// a hand out, arms crossed: as on my picture), and no one changes clothes as they move.
// A day out: the friends going wait on the right, I come in from the left (standing easy, a step bounce),
// stop by them, the first of them holds out a hand and says hi (where we're off to and when is in the cards
// below). On my own page (no group picked) it's only me: I come in to the middle and stand there.
// A day with nothing on: I stand with my arms crossed by the signpost, my head tilting now and then,
// wondering where to go; the bench behind me empty.
// The day's weather (where I am today) plays on it all: the sky and the land take its colour, the sun or the
// clouds are up (sailing across), rain falls in depth with ripples on the land, a storm flashes, fog drifts
// (SceneWeather.jsx, a Remotion loop, behind the park so a bush or a tree keeps the rain off what's behind it).
// On a wet day we're under a shelter, dry, the rain all round and running off the roof; on a hot one we sweat;
// on a cold one we've scarves on and the trees have lost most of their leaves.
// It plays once as it shows (CSS, about four seconds) and then only breathes and blinks; tap it for the plan,
// or for ideas on a free day.

const FULL = 3000; // a standing person's height in the library's units, feet to above the hair
// a person's box: `poses` share one, so swapping between them keeps the head where it was; feet on the bottom
const footOf = (poses) => Math.max(...poses.map((p) => POSE_BOX[p][1] + POSE_BOX[p][3])) + 12;
const boxOf = (poses) => {
  const bs = poses.map((p) => POSE_BOX[p]);
  const x0 = Math.min(...bs.map((b) => b[0])) - 40; const x1 = Math.max(...bs.map((b) => b[0] + b[2])) + 40;
  const foot = footOf(poses);
  const h = poses[0].startsWith('sitting') ? foot + 60 : FULL;
  return [x0, foot - h, x1 - x0, h];
};
// how high a person's head comes, off the ground, in --tall (the top of every pose's hair is at 62)
const headOf = (poses) => (footOf(poses) - 62) / FULL;

// a person, in one pose or swapping between `poses` (CSS); looking left with `flip`; with `onTap`, one to tap.
// gear: { sweat, scarf: 'dark' | 'light' }, drawn in each pose's own units over it (so it moves with it).
// `far`: px back up the land (smaller for it)
function Person({ look, poses, flip, onTap, label, gear = {}, far = 0, className = '', style }) {
  const [x, y, w, h] = boxOf(poses);
  const scale = 1 - far / HORIZON;
  const tap = onTap ? { role: 'button', tabIndex: 0, 'aria-label': label, onClick: onTap, onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && onTap() } : {};
  const svg = { viewBox: `${x} ${y} ${w} ${h}`, style: flip ? { transform: 'scaleX(-1)' } : undefined };
  return (
    <div className={`ds-person ${className}${onTap ? ' ds-tappable' : ''}`} {...tap}
      style={{ aspectRatio: `${w} / ${h}`, height: `calc(var(--tall) * ${(h / FULL) * scale})`, '--far': `${far}px`, ...style }}>
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

const pose = (look, kind) => `${kind}${look.tone || 'BW'}`;

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
const FRAME = [{ p: 'tuft', x: '9%', far: -24 }, { p: 'tuft', x: '91%', far: -20 }, { p: 'tuft', x: '50%', far: -30, size: 0.9 }, { p: 'tuft', x: '30%', far: 40 },
  { p: 'tuft', x: '70%', far: 36 }, { p: 'tuft', x: '40%', far: 120, size: 0.8 }, { p: 'tuft', x: '62%', far: 150 },
  { p: 'tree', x: '3%', far: 60 }, { p: 'tree', x: '97%', far: 74, size: 0.82, flip: true }];
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
const BACKDROP = {
  meet: [...FRAME, { p: 'bush', x: '17%', far: 44, size: 0.7 }, { p: 'bush', x: '84%', far: 50, size: 0.55, flip: true }],
  free: [...FRAME, { p: 'bench', x: '25%', far: 48 }, { p: 'bush', x: '86%', far: 50, size: 0.55, flip: true }, { p: 'sign', x: '74%', far: 12 }],
};
// where we stand, by how many friends (two at most): my centre (% across), and each friend's [centre, px back up
// the land]. On my own, in the middle; one friend, face to face, me on the left; two, the second close in a step
// behind the first, both facing me
const LAYOUT = [
  { me: 50, at: [] },
  { me: 33, at: [[67, 0]] },
  { me: 30, at: [[60, 0], [71, 11]] },
];
const SHELTER = [4600, 3800]; // the shelter's size in people's units (scenery.jsx), for the rain to keep off under it
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// scene: { kind: 'meet' | 'free', me, friends: [look], label, ask (free) }; a free day with friends (a group
// picked) has us stood as on a day out;
// notes: what I say (SpeechNotes), after the hellos
export default function DayScene({ scene, notes = [], weather = { kind: 'partly' }, onTap }) {
  const { me, kind } = scene;
  const friends = scene.friends || [];
  const n = friends.length;
  const free = kind === 'free';
  const wet = weather.kind === 'rain' || weather.kind === 'storm';
  const sky = weather.hot ? 'hot' : weather.kind;
  // all in the long-sleeved poses: I come in standing easy and, meeting friends, hold out a hand and stand easy
  // again; the first friend the same; on a free day, arms crossed. In the cold everyone hugs themselves (arms
  // crossed) instead of standing easy
  const easy = weather.cold ? 'CrossedArms' : 'Resting';
  const stands = (look, kinds) => kinds.map((k) => pose(look, `standing/${k}`));
  const cast = [[me, stands(me, free ? ['CrossedArms'] : n ? [easy, 'RoboDance'] : [easy])],
    ...friends.map((f, i) => [f, stands(f, free || i ? [easy] : [easy, 'RoboDance'])])];
  // dressed for it: a scarf against the cold (dark on a light top), sweat in the heat
  const gear = (look) => ({ sweat: weather.hot, scarf: weather.cold && ((look.tone || 'BW') === 'WB' ? 'dark' : 'light') });
  const ready = usePeeps(['face/EyesClosed', ...cast.flatMap(([look, poses]) => poses.flatMap((p) => piecesOf(look, p)))]);
  // where we stand (a free day on my own, by the signpost)
  const meAt = free && !n ? 40 : LAYOUT[n].me;
  const at = (i) => LAYOUT[n].at[i][0];
  const back = (i) => LAYOUT[n].at[i][1];
  // what keeps the weather off us, centred on us: a shelter from the rain, a patio umbrella from a scorching
  // sun (beside me when I'm alone, its pole not through me). Out from under them goes the signpost (or, with
  // friends there, it's not wanted)
  const cover = wet ? 'shelter' : null;
  const coverAt = free && !n ? 40 : 50;
  const signAt = cover ? '88%' : '74%';
  const head = headOf(cast[0][1]);
  // my thoughts, one at a time, just over my head, out to the side where there's room (towards the friends; on a
  // free day alone the other way, the signpost's there): { i: which, k: a count to start each afresh, on:
  // showing }. The first comes once the hellos are done (straight away with reduced motion); a tap on me brings
  // the next
  const said = free ? [{ key: 'ask', text: scene.ask, onClick: onTap }, ...notes] : notes;
  const [thought, setThought] = useState({ i: -1, k: 0, on: false });
  useEffect(() => {
    const t = setTimeout(() => setThought((x) => (x.i < 0 ? { i: 0, k: 1, on: true } : x)), reduced() ? 0 : !free && n ? 4100 : 900);
    return () => clearTimeout(t);
  }, [free, n]);
  const think = () => said.length && setThought((x) => ({ i: (x.i + 1) % said.length, k: x.k + 1, on: true }));
  const shown = thought.on && said[thought.i % said.length];

  // (the signpost and the bench are a free day's on my own; with friends, the park as on a day out)
  const props = [...(SKY[sky] || SKY.partly), ...BACKDROP[free && !n ? 'free' : 'meet'],
    ...(sky === 'partly' && !weather.cold ? BUTTERFLIES : []), ...(weather.cold ? FALLING : [])];
  return (
    <div className={`ds ds-${kind} ds-wx-${weather.kind}${weather.hot ? ' ds-hot' : ''}${weather.cold ? ' ds-cold' : ''}${ready ? ' ready' : ''}`}
      style={{ '--horizon': `${HORIZON}px` }}>
      <Land />
      <div className="ds-world" aria-hidden="true">
        <div className="ds-skytint" />
        {/* the weather in the air goes behind the park, so a bush or a tree keeps it off what's behind them */}
        {(wet || weather.kind === 'fog') && (
          <Suspense fallback={null}>
            <SceneWeather kind={weather.kind} level={weather.level} horizon={HORIZON}
              shelter={wet ? { at: coverAt / 100, w: SHELTER[0], h: SHELTER[1] } : null} />
          </Suspense>
        )}
        {props.map(({ p, x, size = 1, top, far, flip, fly, falling }, i) => {
          if (p === 'sign' && !signAt) return null;
          if (top) {
            const go = p === 'cloud' ? across(x, size) : fly ? across(x, size, fly) : null;
            return <Prop key={i} kind={p} x={x} size={size} className={`ds-sky${fly ? ' ds-fly' : ''}${falling != null ? ' ds-falling' : ''}`}
              style={{ top, ...go, ...(falling != null ? { '--delay': `${-falling * 1.7}s` } : {}) }} />;
          }
          // (in the cold, the trees all but bare)
          return <Prop key={i} kind={p === 'tree' && weather.cold ? 'bareTree' : p} x={p === 'sign' ? signAt : x} size={size * (1 - (far || 0) / HORIZON)} className={p === 'butterfly' ? `ds-bfly ds-bfly-${i % 2}` : ''}
            style={{ '--far': `${far || 0}px`, transform: flip ? 'scaleX(-1)' : undefined }} />;
        })}
        {cover && <Prop kind={cover} x={`${coverAt}%`} />}
        {weather.kind === 'fog' && [0, 1, 2].map((i) => <i key={i} className={`ds-mist ds-mist-${i}`} />)}
      </div>
      <button className="ds-tap" onClick={onTap} aria-label={scene.label} />
      {ready && (
        <>
          {/* the furthest back first, so the nearer ones stand in front */}
          {friends.map((look, i) => (
            <Person key={i} look={look} poses={cast[i + 1][1]} flip gear={gear(look)} far={back(i)} className={`ds-friend${i || free ? '' : ' ds-greeter'}`}
              style={{ '--x': `${at(i)}%`, '--blink': `${1.1 + 0.9 * i}s` }} />
          )).reverse()}
          {free ? (
            <Person look={me} poses={cast[0][1]} onTap={think} label="ความคิดของฉัน" gear={gear(me)} className="ds-wonder" style={{ '--x': `${meAt}%`, '--blink': '1.6s' }} />
          ) : (
            /* coming in facing right, then a hand out to say hi, then standing easy (on my own, just standing) */
            <Person look={me} poses={cast[0][1]} onTap={think} label="ความคิดของฉัน" gear={gear(me)}
              className={`ds-me${n ? '' : ' ds-alone'}`} style={{ '--x': `${meAt}%`, '--blink': '2.4s' }} />
          )}
          {!free && n > 0 && <span className="ds-say" style={{ '--x': `${at(0)}%` }}>หวัดดี!</span>}
        </>
      )}
      {/* fog low over the ground, in front of our feet */}
      {weather.kind === 'fog' && <i className="ds-mist ds-mist-low" />}
      {ready && shown && (
        <div key={thought.k} className={`ds-note ${free && !n ? 'left' : 'right'}`} style={{ '--x': `${meAt}%`, '--head': head }}
          onAnimationEnd={(e) => e.target === e.currentTarget && setThought((x) => ({ ...x, on: false }))}>
          <SpeechNotes notes={[shown]} />
        </div>
      )}
    </div>
  );
}
