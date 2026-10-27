import { useEffect, useState } from 'react';
import Peep from './Peep';
import Icon from './icons';
import SpeechNotes from './SpeechNotes';
import { Ground, Hills, Prop } from './scenery';
import { POSE_BOX, piecesOf, usePeeps } from './peeps';
import { PLACE_CATS } from './data';

// The home page's stage: today as a little scene of Open Peeps (Peep.jsx), in place of the calendar, drawn
// straight on the page (no card) in a park at life size (scenery.jsx), which reaches on up behind the header.
// I'm always the one on the left, and my notes (what used to float over my picture) are what I say.
// A day out: the friends going wait on the right, I walk in from the left (a step bounce), stop by them, the
// first of them holds out a hand and says hi, the day's stops pop up over us, then I say my notes.
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

// Seen as the people are drawn, from eye height: the horizon (the hills) is at a standing person's eye
// level, HORIZON px over the front of the ground, and anything standing d px further back (higher up the
// page) is smaller by as much as the ground there is nearer the horizon. So everyone's eyes stay on it, and
// the people and the park sit in one space.
const HORIZON = 185;
const far = (d) => 1 - d / HORIZON;

// a person `d` px back from the front, in one pose or swapping between `poses` (CSS); looking left with `flip`
function Person({ look, poses, flip, d = 0, className = '', style }) {
  const [x, y, w, h] = boxOf(poses);
  return (
    <div className={`ds-person ${className}`} style={{ aspectRatio: `${w} / ${h}`, height: `calc(var(--tall) * ${(h / FULL) * far(d)})`, '--d': `${d}px`, ...style }}>
      <i className="ds-shadow" />
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

// the park round us: { p: prop, x: centre, d: px back from the front (see HORIZON), size: of life size } or,
// in the sky, { p, x, top: off the top of the whole backdrop (header and all), size }. Nothing may reach past
// the top of the page (a crop there clashes with the browser's bar). A day out: the tree behind me on the
// left, the bench behind the friends. A free day: the bench (I sit on it) under the tree, a signpost
// pointing two ways. Small trees far off on the hills
const FAR_TREES = [{ p: 'tree', x: '58%', d: 166, size: 0.9 }, { p: 'tree', x: '63%', d: 168, size: 0.7 }];
const BENCH_AT = { p: 'bench', x: '40%', d: 8 };
const SEAT = 960; // the middle of the bench's seat, off its front legs' ground, in its units (scenery.jsx)
const BACKDROP = {
  meet: [{ p: 'hills' }, ...FAR_TREES, { p: 'cloud', x: '88%', top: '44%', size: 0.4 }, { p: 'birds', x: '46%', top: '50%', size: 0.42 },
    { p: 'tree', x: '9%', d: 40 }, { p: 'bush', x: '22%', d: 34, size: 0.7 }, { p: 'tuft', x: '40%', d: 48 }, { p: 'bench', x: '84%', d: 26 },
    { p: 'tuft', x: '64%', d: 60, size: 0.8 }, { p: 'tuft', x: '98%', d: 30 }],
  free: [{ p: 'hills' }, ...FAR_TREES, { p: 'cloud', x: '80%', top: '44%', size: 0.4 }, { p: 'birds', x: '64%', top: '50%', size: 0.42 },
    { p: 'tree', x: '13%', d: 40 }, { p: 'sign', x: '88%', d: 30 }, { p: 'bush', x: '70%', d: 34, size: 0.8 }, { p: 'tuft', x: '58%', d: 50 },
    { p: 'tuft', x: '4%', d: 30 }, BENCH_AT],
};
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// scene: { kind: 'meet', me, friends: [look], stops: [{ cat, time, name }], label } or { kind: 'free', me, ask, label };
// notes: what I say (SpeechNotes), after the hellos
export default function DayScene({ scene, notes = [], onTap }) {
  const { me, kind } = scene;
  const n = kind === 'meet' ? scene.friends.length : 0;
  const cast = kind === 'meet'
    ? [[me, [pose(me, 'standing/Walking'), pose(me, 'standing/RoboDance'), pose(me, 'standing/Resting')]],
      ...scene.friends.map((f, i) => [f, i ? [pose(f, 'standing/Resting')] : [pose(f, 'standing/Resting'), pose(f, 'standing/RoboDance')]])]
    : [[me, [pose(me, 'sitting/ClosedLeg')]]];
  const ready = usePeeps(['face/EyesClosed', ...cast.flatMap(([look, poses]) => poses.flatMap((p) => piecesOf(look, p)))]);
  // where people stand (centres): me on the left at the front, the friends together on the right a step
  // further back, close enough to meet; on a free day, on the bench
  const meAt = kind === 'free' ? 37 : !n ? 46 : n === 1 ? 30 : n === 2 ? 24 : 18;
  const at = (i) => (n === 1 ? 66 : n === 2 ? 58 + i * 18 : 48 + i * 16);
  const meD = kind === 'free' ? BENCH_AT.d : 0;
  const friendD = (i) => 14 + (i % 2) * 6;
  const lift = kind === 'free' ? SEAT / FULL : 0;
  const head = (lift + headOf(cast[0][1])) * far(meD);
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
        <Ground />
        {BACKDROP[kind].map(({ p, x, d = 0, size = 1, top }, i) => (p === 'hills' ? <Hills key={i} />
          : top ? <Prop key={i} kind={p} x={x} size={size} className="ds-sky" style={{ top }} />
            : <Prop key={i} kind={p} x={x} d={d} size={size * far(d)} className={d > 100 ? 'ds-far' : ''} />))}
      </div>
      <button className="ds-tap" onClick={onTap} aria-label={scene.label} />
      {ready && kind === 'meet' && (
        <>
          {scene.friends.map((look, i) => (
            <Person key={i} look={look} poses={cast[i + 1][1]} flip d={friendD(i)} className={`ds-friend${i ? '' : ' ds-greeter'}`}
              style={{ '--x': `${at(i)}%`, '--blink': `${1.1 + 0.9 * i}s` }} />
          ))}
          {/* in front of them: walking in facing right, then a hand out to say hi, then standing easy */}
          <Person look={me} poses={cast[0][1]} className="ds-me" style={{ '--x': `${meAt}%`, '--blink': '2.4s' }} />
          {n > 0 && <span className="ds-say" style={{ '--x': `${at(0)}%`, '--d': `${friendD(0)}px`, '--s': far(friendD(0)) }}>หวัดดี!</span>}
          <div className="ds-stops">
            {scene.stops.map((s, i) => (
              <span key={i} className="ds-stop" style={{ '--i': i }}>
                <span className="ds-stop-icon" style={{ background: PLACE_CATS[s.cat]?.bg, color: PLACE_CATS[s.cat]?.color }}><Icon name={s.cat} size={13} /></span>
                {s.time && <b>{s.time}</b>}<span className="ds-stop-name">{s.name}</span>
              </span>
            ))}
          </div>
        </>
      )}
      {ready && kind === 'free' && (
        <Person look={me} poses={cast[0][1]} d={meD} className="ds-sitter" style={{ '--x': `${meAt}%`, '--lift': lift * far(meD), '--blink': '1.6s' }} />
      )}
      {ready && talk && said.length > 0 && (
        <div className="ds-note" style={{ '--x': `${meAt}%`, '--d': `${meD}px`, '--head': head }}><SpeechNotes notes={said} /></div>
      )}
    </div>
  );
}
