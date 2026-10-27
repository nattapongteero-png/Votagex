import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { CUT, FPS, shotsFor } from './recapShots';

// A trip's recap cut like a product launch film (Remotion), 9:16 at 1080 wide, in the app's own type and
// colours: Kanit for display, IBM Plex Sans Thai for the rest, navy ink, one blue accent. Type is set flush
// left and comes in by masks (wipes), numbers roll like an odometer, lines draw, faces and pins pop; nothing
// just fades in. It opens on "how long ago" with the trip's photos already moving under it, pushes through
// the trip's name into the cover, then who went, the route drawn across the screen, each photo with its note
// and who took it, the trip in three numbers stacking up, and the name set on a panel over a wall of photos.
// Shots are laid out with TransitionSeries: a slide between shots of a kind, a zoom where the film changes key.

const DISPLAY = "'Kanit', 'IBM Plex Sans Thai', sans-serif";
const UI = "'IBM Plex Sans Thai', sans-serif";
const INK = '#1B2A4A';
const INK_2 = '#4B5878';
const PALE = '#F9FAFB';
const ACCENT = '#2B78C5';
const LEFT = 80;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
const lerp = (f, a, b, from, to, easing = Easing.bezier(0.16, 1, 0.3, 1)) => interpolate(f, [a, b], [from, to], { ...clamp, easing });
const POP = { damping: 13, stiffness: 170, mass: 0.8 };
const sp = (f, at, config = { damping: 200 }) => spring({ frame: f - at, fps: FPS, config });
const baht = (n) => `฿${Math.round(n).toLocaleString('en-US')}`;
const ui = (size, color = INK_2, weight = 500) => ({ fontFamily: UI, fontSize: size, fontWeight: weight, color, lineHeight: 1.4 });
const display = (size, color = INK, weight = 700) => ({ fontFamily: DISPLAY, fontSize: size, fontWeight: weight, color, lineHeight: 1.2, letterSpacing: -size * 0.01 });

// type revealed by a mask: from the left (a sideways wipe) or from below; `out` always wipes it away
// sideways, so no tone marks are left hanging above a half-cleared line
function Wipe({ f, at, out, from = 'left', dur = 14, style, children }) {
  const p = lerp(f, at, at + dur, 0, 1, IN_OUT);
  const q = out == null ? 0 : lerp(f, out, out + dur, 0, 1, IN_OUT);
  if (p <= 0 || q >= 1) return null;
  const clip = from === 'left' ? `inset(-40% ${(1 - p) * 100}% -40% ${q * 100}%)` : `inset(${(1 - p) * 100}% -10% -10% ${q * 100}%)`;
  const move = from === 'left' ? `${(1 - p) * -50 + q * 50}px 0px` : `${q * 50}px ${(1 - p) * 60}px`;
  return <div style={{ clipPath: clip, translate: move, ...style }}>{children}</div>;
}

// a number rolling up digit by digit like an odometer; anything that isn't a digit stays put
function Odo({ f, at, text, dur = 36, style }) {
  let k = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', ...style }}>
      {[...text].map((c, i) => {
        if (!/\d/.test(c)) return <span key={i} style={{ lineHeight: '1.15em' }}>{c}</span>;
        const p = lerp(f, at + k * 3, at + dur + k * 3, 0, 1);
        k += 1;
        const roll = (Number(c) + 10) * p;
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block', height: '1.15em', lineHeight: '1.15em', overflow: 'hidden' }}>
            <span style={{ visibility: 'hidden' }}>{c}</span>{/* sizes the cell to its own digit, so a 1 doesn't sit in a 0's width */}
            <span style={{ position: 'absolute', left: '50%', top: 0, display: 'block', textAlign: 'center', translate: `-50% ${-roll * 1.15}em` }}>
              {Array.from({ length: 21 }, (_, n) => <span key={n} style={{ display: 'block', height: '1.15em' }}>{n % 10}</span>)}
            </span>
          </span>
        );
      })}
    </div>
  );
}

// an accent rule drawn out from the left
const Rule = ({ f, at, w = 140, color = ACCENT }) => (
  <i style={{ display: 'block', height: 12, borderRadius: 6, background: color, width: lerp(f, at, at + 16, 0, w, IN_OUT) }} />
);

/* ---------------- shots ---------------- */

// "how long ago" wipes in over the trip's photos already sliding past; "we went"; then the trip's name in
// ink fills with its cover and the camera pushes through the letters into the cover shot
function Intro({ d, f, H }) {
  const cy = H / 2;
  const size = Math.min(240, 1800 / Math.max(5, [...d.title].length));
  const inP = sp(f, 46, POP);
  const fill = lerp(f, 60, 74, 0, 1, Easing.inOut(Easing.quad));
  const zoom = interpolate(f, [78, 108], [1, 30], { ...clamp, easing: Easing.in(Easing.quad), output: 'perceptual-scale' });
  const full = lerp(f, 94, 108, 0, 1, Easing.linear);
  const at = `translate(540 ${cy + (1 - inP) * 80}) scale(${(0.92 + 0.08 * Math.min(1.05, inP)) * zoom}) translate(-540 ${-cy})`;
  const text = (props) => (
    <text x="540" y={cy} textAnchor="middle" dominantBaseline="central" transform={at}
      style={{ fontFamily: DISPLAY, fontSize: size, fontWeight: 800, letterSpacing: -size * 0.01 }} {...props}>{d.title}</text>
  );
  const pics = [...d.photos.map((p) => p.src), d.cover].filter(Boolean);
  const tile = 380; const gap = 28;
  return (
    <AbsoluteFill style={{ background: PALE, overflow: 'hidden' }}>
      {/* the trip's photos, already moving when the film starts, leaving as the name arrives */}
      <div style={{ position: 'absolute', top: H * 0.56, left: 0, display: 'flex', gap,
        translate: `${1080 * lerp(f, 0, 12, 0.25, 0) - f * 9}px ${lerp(f, 36, 50, 0, H * 0.5, Easing.in(Easing.cubic))}px` }}>
        {Array.from({ length: 8 }, (_, i) => (
          <Img key={i} src={pics[i % pics.length]} style={{ width: tile, height: tile * 1.25, objectFit: 'cover', borderRadius: 40, flexShrink: 0, rotate: `${(i % 2 ? 2 : -2)}deg` }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: LEFT, right: LEFT, top: H * 0.22 }}>
        {(d.ago.startsWith('วันนี้') ? ['วันนี้', d.ago.slice(6)] : [d.ago]).map((line, i) => (
          <Wipe key={line} f={f} at={-8 + i * 4} out={22 + i * 3} style={{ ...display(Math.min(200, 1700 / Math.max(4, [...line].length)), INK, 800), whiteSpace: 'nowrap' }}>{line}</Wipe>
        ))}
      </div>
      <div style={{ position: 'absolute', left: LEFT, right: LEFT, top: H * 0.24 }}>
        <Wipe f={f} at={28} out={40} from="up" style={display(220, INK, 800)}>เราไป</Wipe>
      </div>
      {f >= 45 && (
        <svg width="1080" height={H} style={{ position: 'absolute', inset: 0 }}>
          <defs><clipPath id="rc-title">{text({})}</clipPath></defs>
          {text({ fill: INK, opacity: Math.min(1, inP * 1.4) * (1 - fill) })}
          {d.cover && <image href={d.cover} width="1080" height={H} preserveAspectRatio="xMidYMid slice" clipPath="url(#rc-title)" opacity={fill} />}
        </svg>
      )}
      {d.cover && full > 0 && <Img src={d.cover} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: full }} />}
    </AbsoluteFill>
  );
}

// the cover: the date wipes up, a rule draws, the trip's size in a line; the photo punches in a step
function Cover({ d, f, dur }) {
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      {d.cover && <Img src={d.cover} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        scale: interpolate(f, [0, 56, 66, dur], [1, 1.03, 1.09, 1.11], { ...clamp, easing: [Easing.linear, IN_OUT, Easing.linear], output: 'perceptual-scale' }) }} />}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.28), transparent 26%, transparent 46%, rgba(0,0,0,.68))' }} />
      <div style={{ position: 'absolute', left: LEFT, right: LEFT, bottom: 420, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Rule f={f} at={20} color="#fff" />
        <Wipe f={f} at={4} from="up" style={display(150, '#fff', 700)}>{d.dateFull}</Wipe>
        <Wipe f={f} at={30} style={ui(48, 'rgba(255,255,255,.9)', 500)}>
          {[`${d.stats.days} วัน`, d.stats.stops && `${d.stats.stops} ที่`, d.crew.length > 1 && `${d.crew.length} คน`].filter(Boolean).join(' · ')}
        </Wipe>
      </div>
    </AbsoluteFill>
  );
}

// who went: the count rolls up, the faces slide in from the edge, each name wiping in under its face
function Crew({ d, f, H }) {
  const faces = d.crew.slice(0, 4);
  const av = faces.length > 2 ? 280 : 340; const step = av - 40;
  return (
    <AbsoluteFill style={{ background: PALE, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: LEFT, top: H * 0.24 }}>
        <Wipe f={f} at={0} style={ui(52, INK_2)}>ไปด้วยกัน</Wipe>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
          <Odo f={f} at={2} text={String(d.crew.length)} style={display(320, INK, 800)} />
          <Wipe f={f} at={12} from="up" style={display(120, INK, 700)}>คน</Wipe>
        </div>
        <Rule f={f} at={20} w={200} />
      </div>
      <div style={{ position: 'absolute', left: LEFT, top: H * 0.52, width: 1080 }}>
        {faces.map((c, i) => {
          const x = lerp(f, 16 + i * 6, 40 + i * 6, 1100, i * step, Easing.bezier(0.16, 1.2, 0.3, 1));
          return (
            <div key={c.id} style={{ position: 'absolute', left: 0, translate: `${x}px 0px`, zIndex: faces.length - i, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: av }}>
              <Img src={c.avatar} style={{ width: av, height: av, borderRadius: '50%', background: '#fff', border: `10px solid ${PALE}`, boxShadow: '0 24px 50px rgba(27,42,74,.14)' }} />
              <Wipe f={f} at={40 + i * 6} from="up" style={ui(44, INK, 600)}>{c.name}</Wipe>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// the route drawn across the top of the screen, pins popping as it reaches them; the places listed underneath,
// each wiping in as its pin lands (stops can sit too close together to name them beside their pins); the
// distance rolls up at the foot
function Route({ d, f, H }) {
  const box = { x: 170, y: H * 0.15, w: 740, h: H * 0.25 };
  const la = d.stops.map((s) => s.lat); const ln = d.stops.map((s) => s.lng);
  const k = Math.min(box.w / Math.max(Math.max(...ln) - Math.min(...ln), 1e-4), box.h / Math.max(Math.max(...la) - Math.min(...la), 1e-4));
  const cx = (Math.max(...ln) + Math.min(...ln)) / 2; const cy = (Math.max(...la) + Math.min(...la)) / 2;
  const pts = d.stops.map((s) => ({ x: box.x + box.w / 2 + (s.lng - cx) * k, y: box.y + box.h / 2 - (s.lat - cy) * k }));
  const path = pts.map((p, i) => (i ? `Q${(pts[i - 1].x + p.x) / 2 + (i % 2 ? 70 : -70)},${(pts[i - 1].y + p.y) / 2 + (i % 2 ? -50 : 50)} ${p.x},${p.y}` : `M${p.x},${p.y}`)).join(' ');
  const per = 14; const start = 8;
  const drawn = lerp(f, start, start + Math.max(1, pts.length - 1) * per, 0, 1, IN_OUT);
  const pin = (n, size) => ({ width: size, height: size, borderRadius: '50%', background: INK, display: 'grid', placeItems: 'center', flexShrink: 0, ...display(size * 0.5, '#fff', 700), lineHeight: 1 });
  return (
    <AbsoluteFill style={{ background: PALE, overflow: 'hidden' }}>
      <svg width="1080" height={H} style={{ position: 'absolute', inset: 0 }}>
        <path d={path} pathLength="1" fill="none" stroke={ACCENT} strokeWidth="14" strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - drawn} />
      </svg>
      {pts.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: p.x - 36, top: p.y - 36, ...pin(i + 1, 72), scale: sp(f, start + i * per - 2, POP) }}>{i + 1}</div>
      ))}
      <div style={{ position: 'absolute', left: LEFT, right: LEFT, top: H * 0.45, display: 'flex', flexDirection: 'column', gap: 26 }}>
        {d.stops.slice(0, 5).map((s, i) => (
          <Wipe key={s.id} f={f} at={start + i * per + 2} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <span style={pin(i + 1, 64)}>{i + 1}</span>
            <span style={{ ...ui(50, INK, 600), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
            {s.time && <span style={{ ...ui(40, INK_2), marginLeft: 'auto' }}>{s.time}</span>}
          </Wipe>
        ))}
      </div>
      <div style={{ position: 'absolute', left: LEFT, bottom: Math.max(400, H * 0.18) }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
          <Wipe f={f} at={start + pts.length * per} from="up" dur={10}><Odo f={f} at={start + pts.length * per} text={d.stats.km.toFixed(1)} dur={40} style={display(220, INK, 800)} /></Wipe>
          <Wipe f={f} at={start + pts.length * per + 10} from="up" style={display(90, INK, 700)}>กม.</Wipe>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// the first photo springs in as a card and opens out to fill the screen (the rest slide in already full);
// its note wipes in, then who took it, with their face
function PhotoShot({ d, f, dur, i, H }) {
  const ph = d.photos[i];
  const inP = i ? 1 : sp(f, 0, POP);
  const open = i ? 1 : lerp(f, 16, 36, 0, 1, IN_OUT);
  const w = 760 + (1080 - 760) * open; const h = 980 + (H - 980) * open;
  const side = i % 2 ? 1 : -1;
  const t0 = i ? 14 : 34;
  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 540 - w / 2, top: H / 2 - h / 2 + (1 - inP) * 300, width: w, height: h, borderRadius: 56 * (1 - open), overflow: 'hidden',
        opacity: Math.min(1, inP * 2), rotate: `${side * 5 * (1 - open) * inP}deg`, boxShadow: open < 1 ? '0 30px 70px rgba(0,0,0,.35)' : 'none' }}>
        <Img src={ph.src} style={{ width: '100%', height: '100%', objectFit: 'cover', scale: lerp(f, 0, dur, 1.12, 1.02, Easing.linear) }} />
      </div>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.28), transparent 24%, transparent 50%, rgba(0,0,0,.72))', opacity: open }} />
      <div style={{ position: 'absolute', left: LEFT, right: LEFT, bottom: 420, display: 'flex', flexDirection: 'column', gap: 30 }}>
        {ph.text && <Wipe f={f} at={t0} style={{ ...ui(ph.text.length > 40 ? 60 : 70, '#fff', 600), lineHeight: 1.35 }}>{ph.text}</Wipe>}
        <Wipe f={f} at={t0 + 22} style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          {ph.byAvatar && <Img src={ph.byAvatar} style={{ width: 84, height: 84, borderRadius: '50%', background: '#fff' }} />}
          <span style={ui(42, 'rgba(255,255,255,.85)', 500)}>{[ph.by, ph.date].filter(Boolean).join(' · ')}</span>
        </Wipe>
      </div>
    </AbsoluteFill>
  );
}

// the trip in three numbers, each rolling up and stacking under the last; the earlier ones step back
function Numbers({ d, f, H }) {
  const each = d.spend.total / Math.max(1, d.crew.length);
  const rows = [
    { text: String(d.stats.stops), unit: 'ที่ที่ไปด้วยกัน' },
    { text: String(d.stats.photos), unit: 'ภาพที่เก็บไว้' },
    each > 0 && { text: baht(each), unit: d.crew.length > 1 ? 'ต่อคน' : 'ที่ใช้ไป' },
  ].filter(Boolean);
  const beat = 36; const rowH = 360;
  const top = H / 2 - (rows.length * rowH) / 2;
  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}>
      {rows.map((r, i) => {
        const at = 4 + i * beat;
        const dim = i < rows.length - 1 ? lerp(f, at + beat, at + beat + 12, 1, 0.38, IN_OUT) : 1;
        return (
          <div key={r.unit} style={{ position: 'absolute', left: LEFT, top: top + i * rowH, opacity: dim }}>
            <Wipe f={f} at={at} from="up" dur={10}><Odo f={f} at={at} text={r.text} style={display(230, '#fff', 800)} /></Wipe>
            <Wipe f={f} at={at + 8} style={ui(48, 'rgba(255,255,255,.7)')}>{r.unit}</Wipe>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: LEFT, top: top + rows.length * rowH - 10 }}><Rule f={f} at={4 + (rows.length - 1) * beat + 30} w={220} /></div>
    </AbsoluteFill>
  );
}

// a tilted wall of the trip's photos pulling back; a panel wipes up over it and the name is set on it, then
// the faces of who went line up beside a drawn rule
function End({ d, f, H }) {
  const pics = d.photos.length ? d.photos.map((p) => p.src) : [d.cover].filter(Boolean);
  const tile = 300; const gap = 26;
  const panel = lerp(f, 36, 54, 0, 1, IN_OUT);
  return (
    <AbsoluteFill style={{ background: PALE, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 4 * (tile + gap), display: 'flex', flexWrap: 'wrap', gap,
        translate: `-50% calc(-50% - ${f * 1.4}px)`, rotate: '-10deg', scale: interpolate(f, [0, 60], [1.7, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1), output: 'perceptual-scale' }) }}>
        {Array.from({ length: 4 * Math.ceil((H * 1.7) / (tile * 1.25 + gap)) }, (_, j) => (
          <Img key={j} src={pics[j % pics.length]} style={{ width: tile, height: tile * 1.25, objectFit: 'cover', borderRadius: 30 }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.56, background: PALE, clipPath: `inset(${(1 - panel) * 100}% 0 0 0)` }} />
      <div style={{ position: 'absolute', left: LEFT, right: LEFT, top: H * 0.5, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Wipe f={f} at={52} from="up" style={display(Math.min(170, 1500 / Math.max(5, [...d.title].length)), INK, 800)}>{d.title}</Wipe>
        <Wipe f={f} at={62} style={ui(48, INK_2)}>{d.dateFull} · {d.ago}</Wipe>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: 30 }}>
          <Rule f={f} at={84} w={160} />
          <div style={{ display: 'flex' }}>
            {d.crew.slice(0, 5).map((c, i) => (
              <Img key={c.id} src={c.avatar} style={{ width: 96, height: 96, borderRadius: '50%', background: '#fff', border: `5px solid ${PALE}`, marginLeft: i ? -22 : 0, scale: sp(f, 92 + i * 4, POP) }} />
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- the cut ---------------- */

// the new shot settles in from close up and out of a blur, while the old one falls back and darkens
function Zoom({ children, presentationDirection, presentationProgress: p }) {
  const entering = presentationDirection === 'entering';
  return (
    <AbsoluteFill style={entering
      ? { opacity: p, scale: 1.14 - 0.14 * p, filter: `blur(${(1 - p) * 14}px)` }
      : { scale: 1 - 0.08 * p, filter: `brightness(${1 - 0.5 * p})` }}>
      {children}
    </AbsoluteFill>
  );
}
const PRESENT = { slide: slide({ direction: 'from-right' }), zoom: { component: Zoom, props: {} } };
const timing = linearTiming({ durationInFrames: CUT, easing: IN_OUT });

// one shot, reading its own frame (local to its sequence)
function Shot({ d, shot }) {
  const f = useCurrentFrame();
  const { height: H } = useVideoConfig();
  const p = { d, f, dur: shot.dur, H };
  if (shot.key === 'intro') return <Intro {...p} />;
  if (shot.key === 'cover') return <Cover {...p} />;
  if (shot.key === 'crew') return <Crew {...p} />;
  if (shot.key === 'route') return <Route {...p} />;
  if (shot.key === 'numbers') return <Numbers {...p} />;
  if (shot.key === 'end') return <End {...p} />;
  return <PhotoShot {...p} i={shot.photo} />;
}

export default function RecapFilm(d) {
  const shots = shotsFor(d);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <TransitionSeries>
        {shots.flatMap((shot) => [
          PRESENT[shot.cut] && <TransitionSeries.Transition key={`${shot.key}-cut`} presentation={PRESENT[shot.cut]} timing={timing} />,
          <TransitionSeries.Sequence key={shot.key} name={shot.key} durationInFrames={shot.dur}><Shot d={d} shot={shot} /></TransitionSeries.Sequence>,
        ].filter(Boolean))}
      </TransitionSeries>
    </AbsoluteFill>
  );
}
