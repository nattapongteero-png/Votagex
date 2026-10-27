import { lazy, Suspense, useEffect, useState } from 'react';
import Peep from './Peep';
import SpeechNotes from './SpeechNotes';
import { Breath, Land, Prop, Sweat } from './scenery';
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
// clouds are up (sailing across), rain falls in depth with ripples on the land, a storm flashes, heat rises,
// fog drifts (SceneWeather.jsx, a Remotion loop, behind the park so a bush or a tree keeps the rain off what's
// behind it). On a wet day we're under a shelter, dry, the rain all round and running off the roof; on a hot
// one we sweat, on a cold one our breath puffs out.
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
// gear: { sweat, breath }, drawn in the pose's own units over it
function Person({ look, poses, flip, onTap, label, gear = {}, className = '', style }) {
  const [x, y, w, h] = boxOf(poses);
  const tap = onTap ? { role: 'button', tabIndex: 0, 'aria-label': label, onClick: onTap, onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && onTap() } : {};
  const svg = { viewBox: `${x} ${y} ${w} ${h}`, style: flip ? { transform: 'scaleX(-1)' } : undefined };
  return (
    <div className={`ds-person ${className}${onTap ? ' ds-tappable' : ''}`} style={{ aspectRatio: `${w} / ${h}`, height: `calc(var(--tall) * ${h / FULL})`, ...style }} {...tap}>
      {poses.map((pose, i) => (
        <svg key={pose} className={`ds-pose ds-pose-${i}`} {...svg}>
          <Peep look={look} pose={pose} blink />
        </svg>
      ))}
      {(gear.sweat || gear.breath) && <svg className="ds-gear" {...svg}>{gear.sweat && <Sweat />}{gear.breath && <Breath />}</svg>}
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
// same tree turned round); a bush at the foot of each, the little trees far off on the hills in the middle,
// between us. { p: prop, x: centre, size: of life size, far: px back up the land, flip } or, in the sky,
// { p, x, top: off the top of the whole backdrop (header and all), size }. Nothing may reach past the top of the
// page (a crop there clashes with the browser's bar). A free day: the signpost near the middle (I stand by it),
// the bench back on the left, empty. On a wet day, a shelter over us (SHELTER_SIZE: its width and height in
// people's units, for the rain to keep off under it)
const FRAME = [{ p: 'tree', x: '47%', far: 222, size: 0.9 }, { p: 'tree', x: '53%', far: 225, size: 0.7, flip: true },
  { p: 'tuft', x: '9%', far: -24 }, { p: 'tuft', x: '91%', far: -20 }, { p: 'tuft', x: '50%', far: -30, size: 0.9 }, { p: 'tuft', x: '30%', far: 40 },
  { p: 'tuft', x: '70%', far: 36 }, { p: 'tuft', x: '40%', far: 120, size: 0.8 }, { p: 'tuft', x: '62%', far: 150 },
  { p: 'tree', x: '3%', far: 60 }, { p: 'tree', x: '97%', far: 74, size: 0.82, flip: true }];
// the sky, by the weather (the sun high on the right, the birds out only on a fair day)
const BIRDS = { p: 'birds', x: '34%', top: '33%', size: 0.42 };
const SKY = {
  sun: [{ p: 'sun', x: '63%', top: '29%', size: 0.5 }, BIRDS],
  partly: [{ p: 'sun', x: '61%', top: '30%', size: 0.42 }, { p: 'cloud', x: '68%', top: '36%', size: 0.42 }, BIRDS],
  cloud: [{ p: 'cloud', x: '62%', top: '29%', size: 0.5 }, { p: 'cloud', x: '28%', top: '35%', size: 0.38 }, { p: 'cloud', x: '86%', top: '38%', size: 0.32 }, BIRDS],
  rain: [{ p: 'cloud', x: '60%', top: '28%', size: 0.56 }, { p: 'cloud', x: '27%', top: '33%', size: 0.44 }, { p: 'cloud', x: '87%', top: '36%', size: 0.36 }],
  fog: [],
};
SKY.storm = SKY.rain;
SKY.snow = SKY.cloud;
// a cloud sails on across the sky with the wind (left to right, as the rain leans), round and in again from the
// left; the smaller (further) ones slower. Set going from where it's placed (x)
const across = (x, size) => { const dur = 40 / size; return { '--dur': `${dur.toFixed(1)}s`, '--delay': `${(-parseFloat(x) / 100 * dur).toFixed(1)}s` }; };
const BACKDROP = {
  meet: [...FRAME, { p: 'bush', x: '17%', far: 44, size: 0.7 }, { p: 'bush', x: '84%', far: 50, size: 0.55, flip: true }],
  free: [...FRAME, { p: 'bench', x: '25%', far: 48 }, { p: 'bush', x: '86%', far: 50, size: 0.55, flip: true }, { p: 'sign', x: '74%', far: 12 }],
};
// the shelter's width in people's units: one for a few of us, a smaller one for me alone (scenery.jsx)
const SHELTER_W = { shelter: 4600, shelterOne: 2900 };
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// scene: { kind: 'meet', me, friends: [look], label } or { kind: 'free', me, ask, label };
// notes: what I say (SpeechNotes), after the hellos
export default function DayScene({ scene, notes = [], weather = { kind: 'partly' }, onTap }) {
  const { me, kind } = scene;
  const n = kind === 'meet' ? scene.friends.length : 0;
  const wet = weather.kind === 'rain' || weather.kind === 'storm';
  // all in the long-sleeved poses: I come in standing easy and, meeting friends, hold out a hand and stand easy
  // again; the first friend the same; on a free day, arms crossed
  const stands = (look, kinds) => kinds.map((k) => pose(look, `standing/${k}`));
  const cast = kind === 'meet'
    ? [[me, stands(me, n ? ['Resting', 'RoboDance'] : ['Resting'])],
      ...scene.friends.map((f, i) => [f, stands(f, i ? ['Resting'] : ['Resting', 'RoboDance'])])]
    : [[me, stands(me, ['CrossedArms'])]];
  const gear = { sweat: weather.hot, breath: weather.cold };
  const ready = usePeeps(['face/EyesClosed', ...cast.flatMap(([look, poses]) => poses.flatMap((p) => piecesOf(look, p)))]);
  // where people stand (centres), all on the one line, spread evenly about the middle, face to face: me on
  // the left, the friends on the right; on my own, in the middle; on a free day, by the signpost
  const meAt = kind === 'free' ? 40 : [50, 33, 25, 20][n];
  const at = (i) => [0, 67, 50, 40][n] + i * [0, 0, 25, 20][n];
  // a wet day's shelter over us all (centred on us; a small one for me alone), and my thoughts go up over its roof
  const shelterAt = kind === 'free' ? 40 : 50;
  const shelterKind = n ? 'shelter' : 'shelterOne';
  const head = headOf(cast[0][1]) + (wet ? 0.32 : 0);
  // my thoughts, one at a time: { i: which, k: a count to start each afresh, on: showing }. The first comes once
  // the hellos are done (straight away with reduced motion); a tap on me brings the next
  const said = kind === 'free' ? [{ key: 'ask', text: scene.ask, onClick: onTap }, ...notes] : notes;
  const [thought, setThought] = useState({ i: -1, k: 0, on: false });
  useEffect(() => {
    const t = setTimeout(() => setThought((x) => (x.i < 0 ? { i: 0, k: 1, on: true } : x)), reduced() ? 0 : kind === 'meet' && n ? 4100 : 900);
    return () => clearTimeout(t);
  }, [kind, n]);
  const think = () => said.length && setThought((x) => ({ i: (x.i + 1) % said.length, k: x.k + 1, on: true }));
  const shown = thought.on && said[thought.i % said.length];

  return (
    <div className={`ds ds-${kind} ds-wx-${weather.kind}${weather.hot ? ' ds-hot' : ''}${weather.cold ? ' ds-cold' : ''}${ready ? ' ready' : ''}`}
      style={{ '--horizon': `${HORIZON}px` }}>
      <Land />
      <div className="ds-world" aria-hidden="true">
        <div className="ds-skytint" />
        {/* the weather in the air goes behind the park, so a bush or a tree keeps it off what's behind them */}
        {(wet || weather.hot || weather.kind === 'fog') && (
          <Suspense fallback={null}>
            <SceneWeather kind={weather.kind} level={weather.level} hot={weather.hot} horizon={HORIZON}
              shelter={wet ? { at: shelterAt / 100, w: SHELTER_W[shelterKind], h: 3800 } : null} />
          </Suspense>
        )}
        {[...(SKY[weather.kind] || SKY.partly), ...BACKDROP[kind]].map(({ p, x, size = 1, top, far, flip }, i) => (top ? <Prop key={i} kind={p} x={x} size={size} className="ds-sky" style={{ top, ...(p === 'cloud' ? across(x, size) : {}) }} />
          : <Prop key={i} kind={p} x={x} size={size * (1 - (far || 0) / HORIZON)} className={far > 150 ? 'ds-far' : ''}
            style={{ '--far': `${far || 0}px`, transform: flip ? 'scaleX(-1)' : undefined }} />))}
        {wet && <Prop kind={shelterKind} x={`${shelterAt}%`} />}
      </div>
      <button className="ds-tap" onClick={onTap} aria-label={scene.label} />
      {ready && kind === 'meet' && (
        <>
          {scene.friends.map((look, i) => (
            <Person key={i} look={look} poses={cast[i + 1][1]} flip gear={gear} className={`ds-friend${i ? '' : ' ds-greeter'}`}
              style={{ '--x': `${at(i)}%`, '--blink': `${1.1 + 0.9 * i}s` }} />
          ))}
          {/* coming in facing right, then a hand out to say hi, then standing easy (on my own, just standing) */}
          <Person look={me} poses={cast[0][1]} onTap={think} label="ความคิดของฉัน" gear={gear}
            className={`ds-me${n ? '' : ' ds-alone'}`} style={{ '--x': `${meAt}%`, '--blink': '2.4s' }} />
          {n > 0 && <span className="ds-say" style={{ '--x': `${at(0)}%` }}>หวัดดี!</span>}
        </>
      )}
      {ready && kind === 'free' && (
        <Person look={me} poses={cast[0][1]} onTap={think} label="ความคิดของฉัน" gear={gear} className="ds-wonder" style={{ '--x': `${meAt}%`, '--blink': '1.6s' }} />
      )}
      {ready && shown && (
        <div key={thought.k} className="ds-note" style={{ '--x': `${meAt}%`, '--head': head }}
          onAnimationEnd={(e) => e.target === e.currentTarget && setThought((x) => ({ ...x, on: false }))}>
          <SpeechNotes notes={[shown]} />
        </div>
      )}
    </div>
  );
}
