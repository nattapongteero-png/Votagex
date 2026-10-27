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

// a person, in one pose or swapping between `poses` (CSS); looking left with `flip`
function Person({ look, poses, flip, className = '', style }) {
  const [x, y, w, h] = boxOf(poses);
  return (
    <div className={`ds-person ${className}`} style={{ aspectRatio: `${w} / ${h}`, height: `calc(var(--tall) * ${h / FULL})`, ...style }}>
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

// the park round us: [prop, centre, size (life size = 1), height off the top for things in the sky (of the
// whole backdrop, header and all)]. A day out: the tree over me on the left, the bench behind the friends.
// A free day: the bench under the tree (I sit on it), a signpost pointing two ways
const BENCH_AT = ['40%', 1];
const BACKDROP = {
  meet: [['hills', '50%'], ['cloud', '88%', 0.4, '40%'], ['birds', '50%', 0.42, '44%'],
    ['tree', '8%', 1], ['bench', '86%', 1], ['bush', '17%', 0.65], ['tuft', '50%', 0.9], ['tuft', '97%', 0.8]],
  free: [['hills', '50%'], ['cloud', '78%', 0.4, '40%'], ['birds', '62%', 0.42, '46%'],
    ['tree', '13%', 1], ['sign', '88%', 1.05], ['bench', ...BENCH_AT], ['bush', '68%', 0.8], ['tuft', '58%', 0.9], ['tuft', '97%', 0.8]],
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
  // where people stand (centres): me on the left, the friends together on the right, close enough to meet
  const meAt = kind === 'free' ? 37 : !n ? 46 : n === 1 ? 30 : n === 2 ? 24 : 18;
  const at = (i) => (n === 1 ? 66 : n === 2 ? 58 + i * 18 : 48 + i * 16);
  // the bench's seat, off the ground (720 in its own units, scenery.jsx), for sitting on it
  const lift = kind === 'free' ? (720 * BENCH_AT[1]) / FULL : 0;
  const head = lift + headOf(cast[0][1]);
  // I speak once the hellos are done (straight away with reduced motion)
  const [talk, setTalk] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTalk(true), reduced() ? 0 : kind === 'meet' && n ? 4100 : 900);
    return () => clearTimeout(t);
  }, [kind, n]);
  const said = kind === 'free' ? [{ key: 'ask', text: scene.ask, onClick: onTap }, ...notes] : notes;

  return (
    <div className={`ds ds-${kind}${ready ? ' ready' : ''}`}>
      <div className="ds-world" aria-hidden="true">
        {BACKDROP[kind].map(([prop, x, size, top], i) => (prop === 'hills' ? <Hills key={i} />
          : <Prop key={i} kind={prop} x={x} size={size} className={top ? 'ds-sky' : ''} style={top ? { top } : undefined} />))}
        <Ground />
      </div>
      <button className="ds-tap" onClick={onTap} aria-label={scene.label} />
      {ready && kind === 'meet' && (
        <>
          {/* walking in facing right, then a hand out to say hi, then standing easy */}
          <Person look={me} poses={cast[0][1]} className="ds-me" style={{ '--x': `${meAt}%`, '--blink': '2.4s' }} />
          {scene.friends.map((look, i) => (
            <Person key={i} look={look} poses={cast[i + 1][1]} flip className={`ds-friend${i ? '' : ' ds-greeter'}`}
              style={{ '--x': `${at(i)}%`, '--blink': `${1.1 + 0.9 * i}s` }} />
          ))}
          {n > 0 && <span className="ds-say" style={{ '--x': `${at(0)}%` }}>หวัดดี!</span>}
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
        <Person look={me} poses={cast[0][1]} className="ds-sitter" style={{ '--x': `${meAt}%`, '--lift': lift, '--blink': '1.6s' }} />
      )}
      {ready && talk && said.length > 0 && (
        <div className="ds-note" style={{ '--x': `${meAt}%`, '--head': head }}><SpeechNotes notes={said} /></div>
      )}
    </div>
  );
}
