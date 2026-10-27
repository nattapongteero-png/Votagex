import Peep from './Peep';
import Icon from './icons';
import { POSE_BOX, piecesOf, usePeeps } from './peeps';
import { PLACE_CATS } from './data';

// The home page's stage: today as a little scene of Open Peeps (Peep.jsx), in place of the calendar.
// A day out: the friends going wait on the left, I walk in from the right (a step bounce), stop and turn to
// them, the first of them holds out a hand and says hi, and the day's stops pop up over us with their times.
// A day with nothing on: I'm sitting about, my head tilting now and then, wondering where to go.
// It plays once as it shows (CSS, under three seconds) and then only breathes and blinks; tap it for the plan,
// or for ideas on a free day.

const FULL = 3000; // a standing person's height in the library's units, feet to above the hair
// a person's box: `poses` share one, so swapping between them keeps the head where it was; feet on the bottom
const boxOf = (poses) => {
  const bs = poses.map((p) => POSE_BOX[p]);
  const x0 = Math.min(...bs.map((b) => b[0])) - 40; const x1 = Math.max(...bs.map((b) => b[0] + b[2])) + 40;
  const foot = Math.max(...bs.map((b) => b[1] + b[3])) + 12;
  const h = poses[0].startsWith('sitting') ? foot + 60 : FULL;
  return [x0, foot - h, x1 - x0, h];
};

// a person, in one pose or swapping from `poses[0]` to `poses[1]` (CSS, at --swap); looking left with `flip`
function Person({ look, poses, flip, className = '', style }) {
  const [x, y, w, h] = boxOf(poses);
  return (
    <div className={`ds-person ${className}`} style={{ aspectRatio: `${w} / ${h}`, height: `calc(var(--tall) * ${h / FULL})`, ...style }}>
      <i className="ds-shadow" />
      {poses.map((pose, i) => (
        <svg key={pose} className={poses.length > 1 ? `ds-pose ds-pose-${i}` : 'ds-pose'} viewBox={`${x} ${y} ${w} ${h}`}
          style={(Array.isArray(flip) ? flip[i] : flip) ? { transform: 'scaleX(-1)' } : undefined}>
          <Peep look={look} pose={pose} blink />
        </svg>
      ))}
    </div>
  );
}

const pose = (look, kind) => `${kind}${look.tone || 'BW'}`;

// scene: { kind: 'meet', me, friends: [look], stops: [{ cat, time, name }], label } or { kind: 'free', me, ask, label }
export default function DayScene({ scene, onTap }) {
  const { me } = scene;
  const cast = scene.kind === 'meet'
    ? [[me, [pose(me, 'standing/Walking'), pose(me, 'standing/RoboDance'), pose(me, 'standing/Resting')]],
      ...scene.friends.map((f, i) => [f, i ? [pose(f, 'standing/Resting')] : [pose(f, 'standing/Resting'), pose(f, 'standing/RoboDance')]])]
    : [[me, [pose(me, 'sitting/OneLegUp')]]];
  const ready = usePeeps(['face/EyesClosed', ...cast.flatMap(([look, poses]) => poses.flatMap((p) => piecesOf(look, p)))]);
  const n = scene.kind === 'meet' ? scene.friends.length : 0;
  // where people stand (centres): the friends together on the left, me on the right, close enough to meet
  const at = (i) => (n === 1 ? 30 : n === 2 ? 22 + i * 18 : 14 + i * 14);
  return (
    <button className={`ds ds-${scene.kind}${ready ? ' ready' : ''}`} onClick={onTap} aria-label={scene.label}>
      {ready && scene.kind === 'meet' && (
        <>
          {scene.friends.map((look, i) => (
            <Person key={i} look={look} poses={cast[i + 1][1]} className={`ds-friend${i ? '' : ' ds-greeter'}`}
              style={{ '--x': `${at(i)}%`, '--blink': `${1.1 + 0.9 * i}s` }} />
          ))}
          {/* walking in facing left, then turned to them: a hand out to say hi, then standing easy */}
          <Person look={me} poses={cast[0][1]} flip={[false, true, true]} className="ds-me" style={{ '--x': `${!n ? 50 : n === 1 ? 66 : 70}%`, '--blink': '2.4s' }} />
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
      {ready && scene.kind === 'free' && (
        <>
          <Person look={me} poses={cast[0][1]} className="ds-sitter" style={{ '--x': '42%', '--blink': '1.6s' }} />
          <span className="ds-think">{scene.ask}</span>
        </>
      )}
    </button>
  );
}
