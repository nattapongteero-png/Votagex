import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FPS, shotsFor } from './recapShots';

// A trip's recap cut like a product launch film (Remotion), 9:16 at 1080 wide. Big words land one beat at a
// time on a pale ground; the photos are rounded cards that spring in and then open out to fill the screen;
// who went pop in as faces, the route draws itself on a card with its stops as chips, the numbers count up a
// beat each on black, and the trip's name closes over a wall of its photos.

const FONT = "'IBM Plex Sans Thai', sans-serif";
const INK = '#111318';
const PALE = '#F3F1EC';
const ACCENT = '#2B78C5';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const lerp = (f, a, b, from, to, easing = Easing.bezier(0.22, 1, 0.36, 1)) => interpolate(f, [a, b], [from, to], { ...clamp, easing });
const SMOOTH = { damping: 200 };
const POP = { damping: 13, stiffness: 170, mass: 0.8 };
const sp = (f, at, config = SMOOTH) => spring({ frame: f - at, fps: FPS, config });
const baht = (n) => `฿${Math.round(n).toLocaleString('en-US')}`;
const label = (color) => ({ fontFamily: FONT, fontSize: 40, fontWeight: 500, color, letterSpacing: 0.5 });

// a word (or short line) landing on the beat: springs up out of a blur, and leaves upward when its beat ends
function Beat({ f, from, to = Infinity, size = 170, color = INK, weight = 700, style, children }) {
  if (f < from - 1 || f > to + 10) return null;
  const inP = sp(f, from, POP);
  const outP = Number.isFinite(to) ? lerp(f, to, to + 9, 0, 1, Easing.in(Easing.cubic)) : 0;
  return (
    <div style={{ fontFamily: FONT, fontSize: size, fontWeight: weight, lineHeight: 1.2, letterSpacing: -size * 0.025, color, textAlign: 'center',
      opacity: Math.min(1, inP * 1.4) * (1 - outP), filter: `blur(${(1 - Math.min(1, inP)) * 12 + outP * 10}px)`,
      transform: `translateY(${(1 - inP) * 90 - outP * 90}px) scale(${0.92 + 0.08 * Math.min(1.05, inP)})`, ...style }}>{children}</div>
  );
}

// a photo as a card: rounded, shadowed, anywhere on the frame and any size, up to filling it
const Card = ({ src, x, y, w, h, r = 0, radius = 44, o = 1, z = 0, drift = 1 }) => (
  <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: radius, overflow: 'hidden', opacity: o, zIndex: z,
    transform: `rotate(${r}deg)`, boxShadow: radius > 2 ? '0 30px 70px rgba(17,19,24,.22)' : 'none', background: '#ddd' }}>
    {src && <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${drift})` }} />}
  </div>
);

/* ---------------- shots ---------------- */

// "one year ago" / "we went" / the trip's name, then its photos fly in around the name and the cover opens up
function Intro({ d, f, H }) {
  const pics = [d.cover, ...d.photos.map((p) => p.src).filter((s) => s !== d.cover)].filter(Boolean).slice(0, 5);
  const spots = [[0, 0, 0], [-300, -560, -9], [310, -500, 8], [-320, 560, 7], [300, 600, -8]];
  const open = lerp(f, 84, 110, 0, 1, Easing.bezier(0.65, 0, 0.35, 1));
  const cy = H / 2;
  const size = Math.min(170, 1500 / Math.max(5, [...d.title].length));
  return (
    <AbsoluteFill style={{ background: PALE, overflow: 'hidden' }}>
      {pics.map((src, i) => {
        const [dx, dy, r] = spots[i];
        const p = sp(f, 50 + i * 4, POP);
        if (i === 0) {
          // the cover sits behind the name, then opens out to the whole frame
          const w = lerp(f, 50, 66, 300, 400) + (1080 - 400) * open; const h = lerp(f, 50, 66, 380, 500) + (H - 500) * open;
          return <Card key={i} src={src} x={540} y={cy} w={w} h={h} r={(1 - open) * -3} radius={44 * (1 - open)} o={Math.min(1, p * 1.5)} />;
        }
        const away = lerp(f, 80, 96, 0, 1, Easing.in(Easing.cubic));
        return <Card key={i} src={src} x={540 + dx * (1.6 - 0.6 * p) * (1 + away)} y={cy + dy * (1.6 - 0.6 * p) * (1 + away)} w={300} h={380} r={r * p} o={Math.min(1, p * 1.5) * (1 - away)} />;
      })}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 70px', zIndex: 2 }}>
        <Beat f={f} from={2} to={20} size={150}>{d.ago}</Beat>
        <div style={{ position: 'absolute' }}><Beat f={f} from={28} to={40} size={170}>เราไป</Beat></div>
        <div style={{ position: 'absolute', left: 70, right: 70 }}>
          <Beat f={f} from={50} to={80} size={size} color={f > 52 ? '#fff' : INK} style={{ textShadow: f > 52 ? '0 6px 30px rgba(0,0,0,.35)' : 'none' }}>{d.title}</Beat>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// the cover, full screen, with the trip's name and date
function Cover({ d, f, dur }) {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {d.cover && <Img src={d.cover} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${lerp(f, 0, dur, 1, 1.08, Easing.linear)})` }} />}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.3), transparent 28%, transparent 50%, rgba(0,0,0,.65))' }} />
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 420, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 26 }}>
        <Beat f={f} from={6} size={Math.min(150, 1400 / Math.max(5, [...d.title].length))} color="#fff" style={{ textAlign: 'left' }}>{d.title}</Beat>
        <div style={{ display: 'flex', gap: 16, opacity: sp(f, 16), transform: `translateY(${(1 - sp(f, 16)) * 30}px)` }}>
          {[d.dateFull, `${d.stats.days} วัน`].map((t) => (
            <span key={t} style={{ ...label('#fff'), padding: '14px 30px', borderRadius: 999, background: 'rgba(255,255,255,.18)', border: '2px solid rgba(255,255,255,.35)', backdropFilter: 'blur(20px)' }}>{t}</span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Crew({ d, f }) {
  const faces = d.crew.slice(0, 5);
  const av = faces.length > 3 ? 220 : 280;
  return (
    <AbsoluteFill style={{ background: PALE, alignItems: 'center', justifyContent: 'center', gap: 80 }}>
      <div style={{ display: 'flex' }}>
        {faces.map((c, i) => {
          const p = sp(f, 4 + i * 5, POP);
          return <Img key={c.id} src={c.avatar} style={{ width: av, height: av, borderRadius: '50%', background: '#fff', marginLeft: i ? -av * 0.22 : 0,
            border: `10px solid ${PALE}`, boxShadow: '0 24px 50px rgba(17,19,24,.16)', transform: `scale(${p}) translateY(${(1 - p) * 40}px)`, zIndex: faces.length - i }} />;
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '0 70px' }}>
        <Beat f={f} from={20} size={56} weight={500} color="rgba(17,19,24,.55)">ไปด้วยกัน {d.crew.length} คน</Beat>
        <Beat f={f} from={26} size={d.crew.length > 3 ? 84 : 120}>{d.crew.map((c) => c.name).join(' · ')}</Beat>
      </div>
    </AbsoluteFill>
  );
}

// the route drawn on a card, its stops popping in as chips underneath
function Route({ d, f, H }) {
  const card = sp(f, 4);
  const box = { x: 90, y: 90, w: 720, h: 620 };
  const la = d.stops.map((s) => s.lat); const ln = d.stops.map((s) => s.lng);
  const k = Math.min(box.w / Math.max(Math.max(...ln) - Math.min(...ln), 1e-4), box.h / Math.max(Math.max(...la) - Math.min(...la), 1e-4));
  const cx = (Math.max(...ln) + Math.min(...ln)) / 2; const cy = (Math.max(...la) + Math.min(...la)) / 2;
  const pts = d.stops.map((s) => ({ x: box.x + box.w / 2 + (s.lng - cx) * k, y: box.y + box.h / 2 - (s.lat - cy) * k }));
  const path = pts.map((p, i) => (i ? `Q${(pts[i - 1].x + p.x) / 2 + (i % 2 ? 60 : -60)},${(pts[i - 1].y + p.y) / 2 + (i % 2 ? -40 : 40)} ${p.x},${p.y}` : `M${p.x},${p.y}`)).join(' ');
  const per = 12;
  const drawn = lerp(f, 18, 18 + Math.max(1, pts.length - 1) * per, 0, 1, Easing.inOut(Easing.quad));
  const top = Math.max(330, H / 2 - 760);
  return (
    <AbsoluteFill style={{ background: PALE }}>
      <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50 }}>
        <Beat f={f} from={0} size={96}>{d.stats.km.toFixed(1)} กม.</Beat>
        <div style={{ width: 900, height: 800, borderRadius: 60, background: '#fff', boxShadow: '0 40px 90px rgba(17,19,24,.12)', overflow: 'hidden', position: 'relative',
          opacity: card, transform: `translateY(${(1 - card) * 160}px) scale(${0.94 + 0.06 * card})`,
          backgroundImage: 'radial-gradient(rgba(17,19,24,.08) 3px, transparent 3px)', backgroundSize: '44px 44px' }}>
          <svg width="900" height="800" style={{ position: 'absolute', inset: 0 }}>
            <path d={path} pathLength="1" fill="none" stroke={ACCENT} strokeWidth="12" strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - drawn} />
          </svg>
          {pts.map((p, i) => {
            const s = sp(f, 16 + i * per, POP);
            return <div key={i} style={{ position: 'absolute', left: p.x - 34, top: p.y - 34, width: 68, height: 68, borderRadius: '50%', background: i ? '#fff' : ACCENT,
              border: `8px solid ${ACCENT}`, display: 'grid', placeItems: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 30, color: i ? ACCENT : '#fff', transform: `scale(${s})` }}>{i + 1}</div>;
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18, width: 960 }}>
          {d.stops.slice(0, 6).map((s, i) => {
            const p = sp(f, 22 + i * per, POP);
            return <span key={s.id} style={{ ...label(INK), fontWeight: 600, padding: '16px 32px', borderRadius: 999, background: '#fff', boxShadow: '0 10px 24px rgba(17,19,24,.08)',
              transform: `scale(${p})`, opacity: Math.min(1, p * 2) }}>{i + 1}. {s.name}</span>;
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// a photo springs in as a card, then opens out to fill the screen; its note lands at the bottom
function PhotoShot({ d, f, dur, i, H }) {
  const ph = d.photos[i];
  const inP = sp(f, 0, POP);
  const open = lerp(f, 16, 36, 0, 1, Easing.bezier(0.65, 0, 0.35, 1));
  const w = 760 + (1080 - 760) * open; const h = 980 + (H - 980) * open;
  const side = i % 2 ? 1 : -1;
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Card src={ph.src} x={540} y={H / 2 + (1 - inP) * 300} w={w} h={h} r={side * 5 * (1 - open) * inP} radius={56 * (1 - open)} o={Math.min(1, inP * 2)}
        drift={lerp(f, 0, dur, 1.12, 1.02, Easing.linear)} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.3), transparent 25%, transparent 52%, rgba(0,0,0,.7))', opacity: open }} />
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 420, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 20 }}>
        {ph.text && <Beat f={f} from={34} to={dur - 8} size={ph.text.length > 40 ? 58 : 68} weight={600} color="#fff" style={{ textAlign: 'left', lineHeight: 1.4 }}>{ph.text}</Beat>}
        <Beat f={f} from={40} to={dur - 8} size={40} weight={500} color="rgba(255,255,255,.75)" style={{ textAlign: 'left' }}>{[ph.by, ph.date].filter(Boolean).join(' · ')}</Beat>
      </div>
    </AbsoluteFill>
  );
}

// the trip in numbers, a beat each, counting up
function Numbers({ d, f }) {
  const each = d.spend.total / Math.max(1, d.crew.length);
  const rows = [
    { n: d.stats.stops, fmt: (v) => Math.round(v), unit: 'ที่ที่ไปด้วยกัน' },
    { n: d.stats.photos, fmt: (v) => Math.round(v), unit: 'ภาพที่เก็บไว้' },
    each > 0 && { n: each, fmt: baht, unit: d.crew.length > 1 ? 'ต่อคน' : 'ที่ใช้ไป' },
  ].filter(Boolean);
  const beat = 40;
  return (
    <AbsoluteFill style={{ background: INK, alignItems: 'center', justifyContent: 'center' }}>
      {rows.map((r, i) => {
        const from = 4 + i * beat; const last = i === rows.length - 1;
        return (
          <div key={r.unit} style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Beat f={f} from={from} to={last ? Infinity : from + beat - 8} size={260} color="#fff" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {r.fmt(lerp(f, from, from + 26, 0, r.n, Easing.out(Easing.cubic)))}
            </Beat>
            <Beat f={f} from={from + 4} to={last ? Infinity : from + beat - 8} size={52} weight={500} color="rgba(255,255,255,.6)">{r.unit}</Beat>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// the photos as a tilted wall, pulling back, then the trip's name over a pale veil
function End({ d, f, H }) {
  const pics = d.photos.length ? d.photos.map((p) => p.src) : [d.cover].filter(Boolean);
  const pull = lerp(f, 0, 60, 1.7, 1, Easing.out(Easing.cubic));
  const veil = lerp(f, 34, 56, 0, 0.88, Easing.inOut(Easing.quad));
  const tile = 300; const gap = 26;
  return (
    <AbsoluteFill style={{ background: PALE, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 4 * (tile + gap), display: 'flex', flexWrap: 'wrap', gap,
        transform: `translate(-50%, -50%) rotate(-10deg) scale(${pull}) translateY(${-f * 1.2}px)` }}>
        {Array.from({ length: 4 * Math.ceil((H * 1.6) / (tile * 1.25 + gap)) }, (_, j) => (
          <Img key={j} src={pics[j % pics.length]} style={{ width: tile, height: tile * 1.25, objectFit: 'cover', borderRadius: 30 }} />
        ))}
      </div>
      <AbsoluteFill style={{ background: PALE, opacity: veil }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 70px' }}>
        <Beat f={f} from={48} size={Math.min(150, 1400 / Math.max(5, [...d.title].length))}>{d.title}</Beat>
        <Beat f={f} from={56} size={44} weight={500} color="rgba(17,19,24,.55)" style={{ marginTop: 16 }}>{d.dateFull} · {d.ago}</Beat>
        <div style={{ position: 'absolute', bottom: 420 }}>
          <Beat f={f} from={68} size={34} weight={700} color="rgba(17,19,24,.4)" style={{ fontFamily: "'Anton', sans-serif", letterSpacing: 10 }}>VOTAGEX</Beat>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ---------------- the cut ---------------- */

export default function RecapFilm(d) {
  const f = useCurrentFrame();
  const { height: H } = useVideoConfig();
  const shots = shotsFor(d);
  const found = shots.findIndex((s) => f < s.from + s.dur);
  const shot = shots[found < 0 ? shots.length - 1 : found];
  const p = { d, f: f - shot.from, dur: shot.dur, H };
  // a quick dip between shots, except into the cover, which carries straight on from the intro's card
  const dip = shot.key === 'cover' ? 0 : lerp(p.f, 0, 6, 1, 0, Easing.linear);
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      {shot.key === 'intro' && <Intro {...p} />}
      {shot.key === 'cover' && <Cover {...p} />}
      {shot.key === 'crew' && <Crew {...p} />}
      {shot.key === 'route' && <Route {...p} />}
      {shot.photo != null && <PhotoShot {...p} i={shot.photo} />}
      {shot.key === 'numbers' && <Numbers {...p} />}
      {shot.key === 'end' && <End {...p} />}
      {dip > 0 && <AbsoluteFill style={{ background: shot.light ? PALE : INK, opacity: dip }} />}
    </AbsoluteFill>
  );
}
