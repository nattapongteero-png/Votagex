import { XF, shotsFor } from './recapShots';
import { AbsoluteFill, Easing, Img, Sequence, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// A trip's recap as a short film (Remotion), 9:16 at 1080 wide, the height following the screen.
// Shots: a VHS rewind back to the day → the title cut into the cover → a boarding pass that gets stamped →
// the route inked on a paper map → the photos tossed down as polaroids → a receipt printing the numbers →
// a wall of photos pulling back to "see you next trip". Film grain, vignette and light leaks over all of it.

const PAPER = '#F3EBDD';
const INK = '#1C1917';
const RED = '#E4572E';
const OUT = Easing.bezier(0.16, 1, 0.3, 1);
const IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
const TH = "'IBM Plex Sans Thai', sans-serif";
const HAND = "'Mali', 'IBM Plex Sans Thai', cursive";
const DISPLAY = "'Anton', 'IBM Plex Sans Thai', sans-serif";

const graphemes = (s) => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s || '')].map((x) => x.segment);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const lerp = (f, a, b, from, to, easing = OUT) => interpolate(f, [a, b], [from, to], { ...clamp, easing });
const baht = (n) => `฿${Math.round(n).toLocaleString('en-US')}`;

/* ---------------- shared bits ---------------- */

// each shot whips in from the side (with motion blur) and pushes out the other way
function Shot({ dur, first, last, dir = 1, children }) {
  const f = useCurrentFrame();
  const inP = first ? 0 : lerp(f, 0, XF, 1, 0, IN_OUT);
  const outP = last ? 0 : lerp(f, dur - XF, dur, 0, 1, IN_OUT);
  const x = (inP * dir - outP * dir) * 100;
  const blur = (inP + outP) * 28;
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}%) scale(${1 + (inP + outP) * 0.08})`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined, overflow: 'hidden' }}>
      {children}
    </AbsoluteFill>
  );
}

function Grain() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.22 }}>
      <svg width="100%" height="100%">
        <filter id="rc-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(f / 2) % 9} stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#rc-grain)" />
      </svg>
    </AbsoluteFill>
  );
}

// warm light washing across at every cut
function LightLeaks({ cuts }) {
  const f = useCurrentFrame();
  const near = cuts.map((c) => Math.max(0, 1 - Math.abs(f - c) / 22)).reduce((a, b) => Math.max(a, b), 0);
  const x = (f * 7) % 140 - 20;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: near * 0.85,
      background: `radial-gradient(60% 40% at ${x}% 30%, rgba(255,150,60,.9), transparent 70%), radial-gradient(50% 35% at ${100 - x}% 80%, rgba(255,60,90,.6), transparent 70%)` }} />
  );
}

const Vignette = () => <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,.55))' }} />;

// text that rises letter by letter out of a slot (Thai split by grapheme so marks stay on their letters)
function Rise({ text, at = 0, step = 1.6, style }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', overflow: 'hidden', paddingTop: '0.18em', paddingBottom: '0.12em', ...style }}>
      {graphemes(text).map((g, i) => {
        const p = spring({ frame: f - at - i * step, fps, config: { damping: 16, mass: 0.7 } });
        return <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${(1 - p) * 110}%) rotate(${(1 - p) * 8}deg)` }}>{g}</span>;
      })}
    </span>
  );
}

// handwriting that writes itself out
function Typed({ text, at = 0, speed = 1.3, style }) {
  const f = useCurrentFrame();
  const g = graphemes(text);
  const n = Math.max(0, Math.min(g.length, Math.floor((f - at) * speed)));
  return <span style={style}>{g.slice(0, n).join('')}<span style={{ opacity: n < g.length && (f % 16) < 9 ? 1 : 0 }}>|</span></span>;
}

const Count = ({ to, at, len = 30, fmt = (n) => Math.round(n) }) => {
  const f = useCurrentFrame();
  return <>{fmt(lerp(f, at, at + len, 0, to, Easing.out(Easing.cubic)))}</>;
};

/* ---------------- 1. rewind to the day, then the title cut in ---------------- */

function RewindTitle({ d }) {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const back = Math.round(lerp(f, 6, 40, 0, d.daysAgo, Easing.in(Easing.quad)));
  const rewinding = f < 44;
  const flash = lerp(f, 42, 44, 0, 1, Easing.linear) * lerp(f, 44, 56, 1, 0, Easing.linear);
  const zoom = lerp(f, 44, 105, 1.25, 1.04, Easing.out(Easing.quad));
  const jitter = rewinding ? (random(`j${f}`) - 0.5) * 14 : 0;
  const title = graphemes(d.title);
  const fs = Math.max(118, Math.min(250, 1500 / Math.max(4, title.length)));
  return (
    <AbsoluteFill style={{ background: '#050505' }}>
      {!rewinding && (
        <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
          {d.cover && <Img src={d.cover} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.15) contrast(1.05)' }} />}
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.35), transparent 35%, transparent 50%, rgba(0,0,0,.75))' }} />
        </AbsoluteFill>
      )}
      {rewinding && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', color: '#fff', transform: `translateY(${jitter}px)`,
          background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 3px, transparent 3px 7px)' }}>
          <div style={{ position: 'absolute', top: 300, left: 80, fontFamily: DISPLAY, fontSize: 64, letterSpacing: 4, opacity: f % 14 < 8 ? 1 : 0.25 }}>◀◀ REWIND</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 300, lineHeight: 1, textShadow: `${jitter * 0.6}px 0 #ff2a55, ${-jitter * 0.6}px 0 #00e1ff` }}>-{back}</div>
          <div style={{ fontFamily: TH, fontSize: 64, fontWeight: 600, marginTop: 10, opacity: 0.85 }}>วัน</div>
          <div style={{ position: 'absolute', bottom: 320, fontFamily: DISPLAY, fontSize: 56, letterSpacing: 6, opacity: 0.7 }}>{d.dateCode}</div>
        </AbsoluteFill>
      )}
      {!rewinding && (
        <AbsoluteFill style={{ justifyContent: 'flex-end', padding: `0 70px ${height * 0.16}px`, color: '#fff' }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 52, letterSpacing: 6, opacity: lerp(f, 50, 62, 0, 1) }}>▶ PLAY · {d.dateCode}</div>
          <Rise text={d.label} at={52} step={1} style={{ fontFamily: TH, fontSize: 60, fontWeight: 600, marginTop: 18 }} />
          <Rise text={d.title} at={58} step={1.4} style={{ fontFamily: TH, fontSize: fs, fontWeight: 700, lineHeight: 1.15, letterSpacing: -2 }} />
          <div style={{ height: 8, background: RED, marginTop: 20, width: `${lerp(f, 70, 95, 0, 100)}%`, borderRadius: 4 }} />
          <div style={{ display: 'flex', marginTop: 34 }}>
            {d.crew.map((c, i) => {
              const p = spring({ frame: f - 78 - i * 4, fps, config: { damping: 11 } });
              return <Img key={c.id} src={c.avatar} style={{ width: 120, height: 120, borderRadius: 60, background: '#fff', border: '6px solid #fff', marginLeft: i ? -26 : 0, transform: `scale(${p})` }} />;
            })}
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
    </AbsoluteFill>
  );
}

/* ---------------- 2. boarding pass, stamped ---------------- */

function Ticket({ d }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spring({ frame: f - 6, fps, config: { damping: 15, mass: 1.1 } });
  const stampAt = 62;
  const stamp = spring({ frame: f - stampAt, fps, config: { damping: 9, stiffness: 220 } });
  const hit = f >= stampAt + 3 && f < stampAt + 12 ? (random(`s${f}`) - 0.5) * 22 : 0;
  const trip = lerp(f, 24, 60, 0, 1, IN_OUT);
  return (
    <AbsoluteFill style={{ background: '#0F766E', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(-45deg, rgba(255,255,255,.04) 0 40px, transparent 40px 80px)' }} />
      <div style={{ position: 'absolute', top: 150, fontFamily: DISPLAY, fontSize: 90, letterSpacing: 10, color: 'rgba(255,255,255,.14)', whiteSpace: 'nowrap', transform: `translateX(${200 - f * 3}px)` }}>
        BOARDING · BOARDING · BOARDING · BOARDING
      </div>
      <div style={{ width: 900, background: PAPER, borderRadius: 40, color: INK, boxShadow: '0 40px 80px rgba(0,0,0,.35)', overflow: 'hidden',
        transform: `translate(${hit}px, ${(1 - inP) * 1400 + hit * 0.5}px) rotate(${-14 + inP * 10}deg)` }}>
        <div style={{ background: INK, color: PAPER, padding: '34px 50px', display: 'flex', justifyContent: 'space-between', fontFamily: DISPLAY, fontSize: 40, letterSpacing: 5 }}>
          <span>BOARDING PASS</span><span>VOTAGEX</span>
        </div>
        <div style={{ padding: '50px 50px 30px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ flex: '0 0 auto' }}>
            <div style={{ fontFamily: TH, fontSize: 30, opacity: 0.55 }}>จาก</div>
            <div style={{ fontFamily: TH, fontSize: 64, fontWeight: 700 }}>{d.from}</div>
          </div>
          <div style={{ flex: 1, position: 'relative', height: 60 }}>
            <div style={{ position: 'absolute', top: 29, left: 0, right: 0, borderTop: `5px dashed ${INK}`, opacity: 0.35 }} />
            <div style={{ position: 'absolute', top: 0, left: `calc(${trip * 100}% - ${trip * 60}px)`, fontSize: 52, lineHeight: '60px' }}>{d.kind === 'outing' ? '🚗' : '✈️'}</div>
          </div>
          <div style={{ flex: '0 1 auto', minWidth: 0, textAlign: 'right' }}>
            <div style={{ fontFamily: TH, fontSize: 30, opacity: 0.55 }}>ถึง</div>
            <div style={{ fontFamily: TH, fontSize: 64, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.to}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 20, padding: '10px 50px 44px', fontFamily: TH }}>
          {[['วันที่', d.dateShort], ['กี่วัน', `${d.stats.days} วัน`], ['ลูกเรือ', `${d.crew.length} คน`]].map(([k, v]) => (
            <div key={k}><div style={{ fontSize: 28, opacity: 0.55 }}>{k}</div><div style={{ fontSize: 44, fontWeight: 700 }}>{v}</div></div>
          ))}
        </div>
        <div style={{ borderTop: `4px dashed rgba(28,25,23,.25)`, margin: '0 30px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: -60, top: -30, width: 60, height: 60, borderRadius: 30, background: '#0F766E' }} />
          <span style={{ position: 'absolute', right: -60, top: -30, width: 60, height: 60, borderRadius: 30, background: '#0F766E' }} />
        </div>
        <div style={{ padding: '36px 50px 46px', display: 'flex', alignItems: 'center', gap: 30 }}>
          <div style={{ display: 'flex', gap: 5, height: 110, alignItems: 'stretch' }}>
            {Array.from({ length: 34 }, (_, i) => <span key={i} style={{ width: 3 + Math.floor(random(`b${i}`) * 9), background: INK }} />)}
          </div>
          <div style={{ display: 'flex' }}>
            {d.crew.slice(0, 4).map((c, i) => <Img key={c.id} src={c.avatar} style={{ width: 90, height: 90, borderRadius: 45, background: '#fff', border: `4px solid ${PAPER}`, marginLeft: i ? -22 : 0 }} />)}
          </div>
        </div>
        <div style={{ position: 'absolute', right: 70, top: 300, padding: '18px 34px', border: `10px double ${RED}`, borderRadius: 24, color: RED,
          fontFamily: TH, fontWeight: 700, fontSize: 84, lineHeight: 1.1, textAlign: 'center', mixBlendMode: 'multiply',
          opacity: f < stampAt ? 0 : 0.92, transform: `rotate(-14deg) scale(${f < stampAt ? 3 : 3 - stamp * 2})` }}>
          ไปมาแล้ว
          <div style={{ fontFamily: DISPLAY, fontSize: 40, letterSpacing: 4, fontWeight: 400 }}>{d.dateCode}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- 3. the route, inked on a paper map ---------------- */

// smooth line through the stops (Catmull-Rom), sampled so we know how far along each point is
function routeOf(pts) {
  if (pts.length < 2) return { line: pts.map((p) => ({ ...p, at: 0 })), len: 0, stopAt: pts.map(() => 0) };
  const line = [];
  const stopAt = [0];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[i + 2] || p2;
    for (let s = 0; s < 28; s++) {
      const t = s / 28; const t2 = t * t; const t3 = t2 * t;
      const c = (a, b, cc, dd) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - dd) * t2 + (-a + 3 * b - 3 * cc + dd) * t3);
      line.push({ x: c(p0.x, p1.x, p2.x, p3.x), y: c(p0.y, p1.y, p2.y, p3.y) });
    }
    stopAt.push(line.length);
  }
  line.push(pts[pts.length - 1]);
  let len = 0;
  line.forEach((p, i) => { if (i) len += Math.hypot(p.x - line[i - 1].x, p.y - line[i - 1].y); p.at = len; });
  return { line, len, stopAt: stopAt.map((k) => line[Math.min(k, line.length - 1)].at) };
}

function RouteMap({ d, dur }) {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const box = { x: 150, y: 600, w: width - 300, h: height - 1100 };
  const lat = d.stops.map((s) => s.lat); const lng = d.stops.map((s) => s.lng);
  const minLa = Math.min(...lat); const maxLa = Math.max(...lat); const minLn = Math.min(...lng); const maxLn = Math.max(...lng);
  const k = Math.min(box.w / Math.max(maxLn - minLn, 1e-4), box.h / Math.max(maxLa - minLa, 1e-4));
  const pts = d.stops.map((s) => ({
    x: box.x + box.w / 2 + (s.lng - (minLn + maxLn) / 2) * k,
    y: box.y + box.h / 2 - (s.lat - (minLa + maxLa) / 2) * k,
  }));
  const { line, len, stopAt } = routeOf(pts);
  const drawEnd = dur - 40;
  const drawn = lerp(f, 18, drawEnd, 0, len, IN_OUT);
  const head = line.find((p) => p.at >= drawn) || line[line.length - 1];
  const path = line.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const cam = lerp(f, 0, dur, 1.08, 1, Easing.out(Easing.quad));
  return (
    <AbsoluteFill style={{ background: PAPER, color: INK }}>
      <AbsoluteFill style={{ transform: `scale(${cam})` }}>
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: 24 }, (_, i) => <line key={`v${i}`} x1={i * 60} y1={0} x2={i * 60} y2={height} stroke="rgba(28,25,23,.06)" strokeWidth="2" />)}
          {Array.from({ length: 40 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * 60} x2={width} y2={i * 60} stroke="rgba(28,25,23,.06)" strokeWidth="2" />)}
          {Array.from({ length: 7 }, (_, r) => {
            const cx = width * (0.25 + random(`cx${r % 2}`) * 0.5); const cy = height * (0.35 + random(`cy${r % 2}`) * 0.3);
            const rr = 120 + r * 70;
            const ring = Array.from({ length: 40 }, (_, a) => {
              const t = (a / 40) * Math.PI * 2; const w = rr * (1 + (random(`w${r}-${a % 13}`) - 0.5) * 0.18);
              return `${a ? 'L' : 'M'}${cx + Math.cos(t) * w * 1.3},${cy + Math.sin(t) * w}`;
            }).join(' ');
            return <path key={r} d={`${ring}Z`} fill="none" stroke="rgba(15,118,110,.16)" strokeWidth="3" />;
          })}
          <path d={path} fill="none" stroke="#fff" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len - drawn} />
          <path d={path} fill="none" stroke={RED} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len - drawn} />
          {len > 0 && <circle cx={head.x} cy={head.y} r={22 + Math.sin(f / 3) * 4} fill={RED} stroke="#fff" strokeWidth="8" />}
        </svg>
        {pts.map((p, i) => {
          const at = len ? 18 + (stopAt[i] / len) * (drawEnd - 18) * 0.92 : 18;
          const pop = spring({ frame: f - at, fps, config: { damping: 10, stiffness: 180 } });
          const s = d.stops[i];
          const right = pts.length > 1 ? i % 2 === 0 : true; // labels alternate sides so neighbours don't cover each other
          return (
            <div key={s.id} style={{ position: 'absolute', left: p.x, top: p.y, transform: `scale(${pop})`, transformOrigin: '0 0' }}>
              <div style={{ position: 'absolute', left: -38, top: -38, width: 76, height: 76, borderRadius: 38, background: INK, color: PAPER,
                display: 'grid', placeItems: 'center', fontFamily: DISPLAY, fontSize: 44, border: '6px solid #fff' }}>{i + 1}</div>
              <div style={{ position: 'absolute', top: -46, [right ? 'left' : 'right']: 54, background: '#fff', borderRadius: 22, padding: '12px 24px',
                boxShadow: '0 10px 24px rgba(0,0,0,.14)', whiteSpace: 'nowrap', transform: `rotate(${right ? -3 : 3}deg)` }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 32, color: RED, letterSpacing: 2 }}>{s.time || '—'}</div>
                <div style={{ fontFamily: TH, fontSize: 40, fontWeight: 700, maxWidth: 440, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
      <div style={{ position: 'absolute', top: 250, left: 80, right: 80 }}>
        <Rise text="เส้นทางวันนั้น" at={4} style={{ fontFamily: TH, fontSize: 96, fontWeight: 700, letterSpacing: -1 }} />
        <div style={{ fontFamily: DISPLAY, fontSize: 64, color: RED, letterSpacing: 2 }}>
          <Count to={d.stats.km} at={18} len={drawEnd - 18} fmt={(n) => n.toFixed(1)} /> KM · {d.stops.length} STOPS
        </div>
      </div>
      <svg width="170" height="170" viewBox="-50 -50 100 100" style={{ position: 'absolute', right: 70, bottom: 150, transform: `rotate(${Math.sin(f / 12) * 12}deg)` }}>
        <circle r="46" fill="none" stroke={INK} strokeWidth="3" opacity=".4" />
        <path d="M0-40 8 0 0 40-8 0Z" fill={INK} opacity=".75" /><path d="M0-40 8 0H-8Z" fill={RED} />
        <text y="-20" textAnchor="middle" fontFamily="Anton" fontSize="14" fill={PAPER}>N</text>
      </svg>
    </AbsoluteFill>
  );
}

/* ---------------- 4. photos tossed down as polaroids ---------------- */

function Polaroids({ d }) {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const each = 62;
  const cardW = Math.min(820, width - 180);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(90% 70% at 50% 40%, #3a2f28, #14100e)' }}>
      <AbsoluteFill style={{ opacity: 0.35, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 2px, transparent 2px 14px)' }} />
      <AbsoluteFill style={{ transform: `scale(${lerp(f, 0, 40 + d.photos.length * each, 1.06, 0.98, Easing.linear)})` }}>
        {d.photos.map((ph, i) => {
          const at = 10 + i * each;
          const p = spring({ frame: f - at, fps, config: { damping: 14, mass: 1.2 } });
          const side = i % 2 ? 1 : -1;
          const rot = side * (4 + random(`r${i}`) * 6);
          const newer = Math.max(0, Math.min(1, (f - at - each) / 20));
          const buried = d.photos.slice(i + 1).filter((_, j) => f > 10 + (i + 1 + j) * each).length;
          return (
            <div key={i} style={{ position: 'absolute', left: (width - cardW) / 2 + side * 26 * (i % 3), top: height * 0.13 + (i % 2) * 30, width: cardW,
              padding: '34px 34px 0', background: '#FBFAF7', borderRadius: 10,
              boxShadow: `0 ${20 + p * 30}px ${40 + p * 50}px rgba(0,0,0,${0.25 + p * 0.25})`,
              filter: `brightness(${1 - Math.min(buried, 3) * 0.12})`,
              transform: `translate(${(1 - p) * side * 1100}px, ${(1 - p) * 500}px) rotate(${rot + (1 - p) * side * 40}deg) scale(${1 - newer * 0.04 * Math.min(buried, 3)})` }}>
              <div style={{ width: '100%', aspectRatio: '1 / 1.08', overflow: 'hidden', background: '#ddd' }}>
                <Img src={ph.src} style={{ width: '100%', height: '100%', objectFit: 'cover',
                  transform: `scale(${lerp(f, at, at + each * 2, 1.2, 1.02, Easing.linear)})`, filter: 'saturate(1.1) contrast(1.04) sepia(.08)' }} />
              </div>
              <div style={{ minHeight: 220, padding: '22px 6px 26px', color: '#2b2622' }}>
                <Typed text={ph.text} at={at + 16} style={{ fontFamily: HAND, fontSize: 50, lineHeight: 1.45 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, opacity: lerp(f, at + 20, at + 30, 0, 1) }}>
                  {ph.avatar && <Img src={ph.avatar} style={{ width: 56, height: 56, borderRadius: 28, background: '#eee' }} />}
                  <span style={{ fontFamily: HAND, fontSize: 38, opacity: 0.7 }}>— {ph.by}</span>
                </div>
              </div>
              <div style={{ position: 'absolute', top: -26, left: '50%', width: 200, height: 54, marginLeft: -100, background: 'rgba(255,236,170,.75)', transform: `rotate(${-rot * 0.6}deg)` }} />
            </div>
          );
        })}
      </AbsoluteFill>
      <div style={{ position: 'absolute', right: 70, bottom: 240, fontFamily: DISPLAY, fontSize: 60, letterSpacing: 4, color: 'rgba(255,255,255,.85)' }}>
        {String(Math.min(d.photos.length, Math.max(1, Math.floor((f - 10) / each) + 1))).padStart(2, '0')} / {String(d.photos.length).padStart(2, '0')}
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- 5. the receipt prints out, stickers slap on ---------------- */

function Receipt({ d }) {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const lines = [
    ...d.spend.cats.map((c) => ({ k: c.label, v: baht(c.amount), color: c.color })),
  ];
  const print = lerp(f, 8, 70, 0, 1, Easing.out(Easing.quad));
  const zig = Array.from({ length: 31 }, (_, i) => `${(i / 30) * 100}% ${i % 2 ? 100 : 'calc(100% - 22px)'}`).join(', ');
  const stickers = [
    { n: d.stats.days, u: 'วัน', bg: '#FF6B4A', x: 0.03, y: 0.66, r: -14 },
    { n: d.stats.stops, u: 'จุดที่แวะ', bg: '#4F46E5', x: 0.27, y: 0.72, r: 8 },
    { n: d.stats.photos, u: 'รูป', bg: '#16A34A', x: 0.51, y: 0.65, r: -6 },
    { n: d.crew.length, u: 'คน', bg: '#0EA5E9', x: 0.74, y: 0.71, r: 12 },
  ];
  return (
    <AbsoluteFill style={{ background: '#E4A42A' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 20% 10%, rgba(255,255,255,.25), transparent 50%)' }} />
      <div style={{ position: 'absolute', top: 120, left: 80, fontFamily: DISPLAY, fontSize: 120, lineHeight: 1, color: INK, letterSpacing: 2, opacity: 0.12 }}>
        TOTAL<br />TOTAL<br />TOTAL
      </div>
      <div style={{ position: 'absolute', left: (width - 820) / 2, top: height * 0.17, width: 820, height: 44, borderRadius: 22, background: INK, zIndex: 2 }} />
      <div style={{ position: 'absolute', left: (width - 740) / 2, top: height * 0.17 + 22, width: 740, overflow: 'hidden', height: height * 0.47 }}>
        <div style={{ background: '#FFFDF7', color: INK, padding: '60px 56px 80px', clipPath: `polygon(0 0, 100% 0, ${zig}, 0 100%)`,
          transform: `translateY(${(print - 1) * 100}%)`, boxShadow: '0 20px 40px rgba(0,0,0,.2)', fontFamily: TH }}>
          <div style={{ textAlign: 'center', fontFamily: DISPLAY, fontSize: 52, letterSpacing: 6 }}>VOTAGEX</div>
          <div style={{ textAlign: 'center', fontSize: 34, opacity: 0.6 }}>{d.title} · {d.dateShort}</div>
          <div style={{ borderTop: `4px dashed rgba(28,25,23,.3)`, margin: '30px 0' }} />
          {lines.map((l, i) => (
            <div key={l.k} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 42, lineHeight: '74px', opacity: lerp(f, 40 + i * 9, 48 + i * 9, 0, 1) }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: l.color }} />
              <span style={{ flex: 1 }}>{l.k}</span><span style={{ fontWeight: 700 }}>{l.v}</span>
            </div>
          ))}
          {!lines.length && <div style={{ fontSize: 40, opacity: 0.6, textAlign: 'center' }}>ไม่ได้จดรายจ่ายไว้</div>}
          <div style={{ borderTop: `4px dashed rgba(28,25,23,.3)`, margin: '30px 0 20px' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 44, fontWeight: 700 }}>รวม</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 120, lineHeight: 1.1 }}><Count to={d.spend.total} at={70} len={40} fmt={baht} /></span>
          </div>
          {d.spend.total > 0 && <div style={{ textAlign: 'right', fontSize: 38, opacity: 0.65 }}>คนละ ~{baht(d.spend.total / Math.max(1, d.crew.length))}</div>}
          <div style={{ display: 'flex', gap: 4, height: 80, justifyContent: 'center', marginTop: 40 }}>
            {Array.from({ length: 46 }, (_, i) => <span key={i} style={{ width: 2 + Math.floor(random(`rb${i}`) * 7), background: INK }} />)}
          </div>
        </div>
      </div>
      {stickers.map((s, i) => {
        const p = spring({ frame: f - 92 - i * 9, fps, config: { damping: 8, stiffness: 200 } });
        return (
          <div key={s.u} style={{ position: 'absolute', left: width * s.x, top: height * s.y, width: 250, height: 250, borderRadius: 125, background: s.bg,
            color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '10px solid #fff',
            boxShadow: '0 16px 30px rgba(0,0,0,.25)', transform: `scale(${p}) rotate(${s.r + (1 - p) * 60}deg)`, zIndex: 3 }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 104, lineHeight: 1 }}>{s.n}</span>
            <span style={{ fontFamily: TH, fontSize: 40, fontWeight: 700 }}>{s.u}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* ---------------- 6. a wall of the trip pulls back: see you next trip ---------------- */

function Outro({ d }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const srcs = d.photos.length ? d.photos.map((p) => p.src) : [d.cover].filter(Boolean);
  const cols = 4; const rows = Math.ceil(height / 300) + 3; const tile = 330;
  const pull = lerp(f, 0, 70, 2.8, 1, Easing.inOut(Easing.cubic));
  const dark = lerp(f, 45, 75, 0, 0.62);
  return (
    <AbsoluteFill style={{ background: INK, color: '#fff' }}>
      <AbsoluteFill style={{ transform: `scale(${pull}) rotate(-8deg)`, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${tile}px)`, gap: 16, transform: `translateY(${-f * 1.2}px)` }}>
          {Array.from({ length: cols * rows }, (_, i) => {
            const src = srcs[(i * 7 + Math.floor(i / cols)) % Math.max(1, srcs.length)];
            return <div key={i} style={{ width: tile, height: tile * 1.2, borderRadius: 18, background: '#333', overflow: 'hidden' }}>
              {src && <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: i % 3 ? 'grayscale(.4)' : undefined }} />}
            </div>;
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `rgba(10,8,6,${dark})` }} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 60px' }}>
        <Typed text="ไว้ไปด้วยกันอีกนะ" at={60} speed={0.8} style={{ fontFamily: HAND, fontSize: Math.min(150, width / 7.5), fontWeight: 600, lineHeight: 1.3, color: '#FFE7A3' }} />
        <div style={{ fontFamily: TH, fontSize: 60, fontWeight: 700, marginTop: 24, opacity: lerp(f, 82, 96, 0, 1), transform: `translateY(${lerp(f, 82, 96, 30, 0)}px)` }}>{d.title}</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 40, letterSpacing: 14, marginTop: 30, opacity: lerp(f, 96, 110, 0, 0.7) }}>VOTAGEX</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

const SCENES = { rewind: RewindTitle, ticket: Ticket, route: RouteMap, photos: Polaroids, receipt: Receipt, outro: Outro };

export default function RecapFilm(d) {
  const shots = shotsFor(d);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {shots.map((s, i) => {
        const Scene = SCENES[s.key];
        return (
          <Sequence key={s.key} from={s.from} durationInFrames={s.dur}>
            <Shot dur={s.dur} first={i === 0} last={i === shots.length - 1} dir={i % 2 ? -1 : 1}><Scene d={d} dur={s.dur} /></Shot>
          </Sequence>
        );
      })}
      <LightLeaks cuts={shots.slice(1).map((s) => s.from + XF / 2)} />
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
}
