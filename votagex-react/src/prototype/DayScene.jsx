import { useEffect, useState } from 'react';
import Peep from './Peep';
import SpeechNotes from './SpeechNotes';
import { Ground, Hills, Prop } from './scenery';
import { POSE_BOX, piecesOf, usePeeps } from './peeps';

// The home page's stage: today as a little scene of Open Peeps (Peep.jsx), in place of the calendar, drawn
// straight on the page (no card) in a park at life size (scenery.jsx), which reaches on up behind the header.
// I'm always the one on the left, and my notes (what used to float over my picture) are what I say.
// A day out: the friends going wait on the right, I walk in from the left (a step bounce), stop by them, the
// first of them holds out a hand and says hi, then I say my notes (where we're off to and when is in the
// cards below).
// A day with nothing on: I'm sitting on a bench under the tree hugging my knees, my head tilting now and
// then, wondering where to go (and then my notes).
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

// a person, in one pose or swapping between `poses` (CSS); looking left with `flip`
function Person({ look, poses, flip, className = '', style }) {
  const [x, y, w, h] = boxOf(poses);
  return (
    <div className={`ds-person ${className}`} style={{ aspectRatio: `${w} / ${h}`, height: `calc(var(--tall) * ${h / FULL})`, ...style }}>
      {poses.map((pose, i) => (
        <svg key={pose} className={poses.length > 1 ? `ds-pose ds-pose-${i}` : 'ds-pose'} viewBox={`${x} ${y} ${w} ${h}`}
          style={flip ? { transform: 'scaleX(-1)' } : undefined}>
          <Peep look={look} pose={pose} blink />
        </svg>
      ))}
    </div>
  );
}

const pose = (look, kind) => `${kind}${look.tone || 'BW'}`;

// Seen as the people are drawn, from eye height: the horizon (the hills) is at a standing person's eye level,
// HORIZON px over the ground line, which is why the bench shows its seat's top (it's below our eyes). Everyone
// and everything near stands on the one ground line; only the little trees on the hills are far off, smaller by
// as much as they're nearer the horizon.
const HORIZON = 185;
// the park round us: { p: prop, x: centre, size: of life size, far: px up the page towards the horizon } or,
// in the sky, { p, x, top: off the top of the whole backdrop (header and all), size }. Nothing may reach past the
// top of the page (a crop there clashes with the browser's bar), so the tree is a young one, about 4 m. A day
// out: the tree behind me on the left, the bench behind the friends. A free day: the bench (I sit on it) under
// the tree, a signpost pointing two ways
const FAR_TREES = [{ p: 'tree', x: '58%', far: 166, size: 0.9 }, { p: 'tree', x: '63%', far: 168, size: 0.7 }];
const BENCH_AT = { p: 'bench', x: '40%' };
const SEAT = 960; // the middle of the bench's seat, off its front legs' ground, in its units (scenery.jsx)
const BACKDROP = {
  meet: [{ p: 'hills' }, ...FAR_TREES, { p: 'cloud', x: '88%', top: '44%', size: 0.4 }, { p: 'birds', x: '50%', top: '50%', size: 0.42 },
    { p: 'tree', x: '8%', size: 0.88 }, { p: 'bush', x: '20%', size: 0.6 }, { p: 'bench', x: '86%' }, { p: 'tuft', x: '48%' }, { p: 'tuft', x: '97%', size: 0.8 }],
  free: [{ p: 'hills' }, ...FAR_TREES, { p: 'cloud', x: '80%', top: '44%', size: 0.4 }, { p: 'birds', x: '64%', top: '50%', size: 0.42 },
    { p: 'tree', x: '13%', size: 0.88 }, { p: 'sign', x: '88%' }, { p: 'bush', x: '70%', size: 0.75 }, { p: 'tuft', x: '58%' },
    { p: 'tuft', x: '4%' }, BENCH_AT],
};
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// scene: { kind: 'meet', me, friends: [look], label } or { kind: 'free', me, ask, label };
// notes: what I say (SpeechNotes), after the hellos
export default function DayScene({ scene, notes = [], onTap }) {
  const { me, kind } = scene;
  const n = kind === 'meet' ? scene.friends.length : 0;
  const cast = kind === 'meet'
    ? [[me, [pose(me, 'standing/Walking'), pose(me, 'standing/RoboDance'), pose(me, 'standing/Resting')]],
      ...scene.friends.map((f, i) => [f, i ? [pose(f, 'standing/Resting')] : [pose(f, 'standing/Resting'), pose(f, 'standing/RoboDance')]])]
    : [[me, [pose(me, 'sitting/ClosedLeg')]]];
  const ready = usePeeps(['face/EyesClosed', ...cast.flatMap(([look, poses]) => poses.flatMap((p) => piecesOf(look, p)))]);
  // where people stand (centres), all on the one line, face to face: me on the left, the friends together
  // on the right, close enough to meet; on a free day, on the bench
  const meAt = kind === 'free' ? 37 : !n ? 46 : n === 1 ? 30 : n === 2 ? 24 : 18;
  const at = (i) => (n === 1 ? 66 : n === 2 ? 58 + i * 18 : 48 + i * 16);
  const lift = kind === 'free' ? SEAT / FULL : 0;
  const head = lift + headOf(cast[0][1]);
  // I speak once the hellos are done (straight away with reduced motion)
  const [talk, setTalk] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTalk(true), reduced() ? 0 : kind === 'meet' && n ? 4100 : 900);
    return () => clearTimeout(t);
  }, [kind, n]);
  const said = kind === 'free' ? [{ key: 'ask', text: scene.ask, onClick: onTap }, ...notes] : notes;

  return (
    <div className={`ds ds-${kind}${ready ? ' ready' : ''}`} style={{ '--horizon': `${HORIZON}px` }}>
      <div className="ds-world" aria-hidden="true">
        {BACKDROP[kind].map(({ p, x, size = 1, top, far }, i) => (p === 'hills' ? <Hills key={i} />
          : top ? <Prop key={i} kind={p} x={x} size={size} className="ds-sky" style={{ top }} />
            : far ? <Prop key={i} kind={p} x={x} size={size * (1 - far / HORIZON)} className="ds-far" style={{ '--far': `${far}px` }} />
              : <Prop key={i} kind={p} x={x} size={size} />))}
        <Ground />
      </div>
      <button className="ds-tap" onClick={onTap} aria-label={scene.label} />
      {ready && kind === 'meet' && (
        <>
          {scene.friends.map((look, i) => (
            <Person key={i} look={look} poses={cast[i + 1][1]} flip className={`ds-friend${i ? '' : ' ds-greeter'}`}
              style={{ '--x': `${at(i)}%`, '--blink': `${1.1 + 0.9 * i}s` }} />
          ))}
          {/* walking in facing right, then a hand out to say hi, then standing easy */}
          <Person look={me} poses={cast[0][1]} className="ds-me" style={{ '--x': `${meAt}%`, '--blink': '2.4s' }} />
          {n > 0 && <span className="ds-say" style={{ '--x': `${at(0)}%` }}>หวัดดี!</span>}
        </>
      )}
      {ready && kind === 'free' && (
        <Person look={me} poses={cast[0][1]} className="ds-sitter" style={{ '--x': `${meAt}%`, '--lift': lift, '--blink': '1.6s' }} />
      )}
      {ready && talk && said.length > 0 && (
        <div className="ds-note" style={{ '--x': `${meAt}%`, '--head': head }}><SpeechNotes notes={said} /></div>
      )}
    </div>
  );
}
