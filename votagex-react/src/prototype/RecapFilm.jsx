import { AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { LEADER, shotsFor } from './recapShots';

// A trip's recap cut as a movie trailer (Remotion), 9:16 at 1080 wide. The film leader counts down 3-2-1, a
// studio card glows up, then the title over the cover; the crew are the cast, the stops the locations (pins
// drop on a dark map as the route draws), each photo a scene opened by a clapperboard and played with a
// subtitle and an old camera's date stamp; the spend is the budget, rolling up; end credits, then "ภาค 2".
// Grain, a flicker and a light leak at each cut run over everything.

const DISPLAY = "'Kanit', 'IBM Plex Sans Thai', sans-serif";
const EN = "'Anton', 'Kanit', sans-serif";
const TH = "'IBM Plex Sans Thai', sans-serif";
const GOLD = '#F5C451';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const OUT = Easing.bezier(0.16, 1, 0.3, 1);
const lerp = (f, a, b, from, to, easing = OUT) => interpolate(f, [a, b], [from, to], { ...clamp, easing });
const graphemes = (s) => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s || '')].map((x) => x.segment);
const baht = (n) => `฿${Math.round(n).toLocaleString('en-US')}`;
const FADE = 'linear-gradient(180deg, transparent 14%, #000 26%, #000 78%, transparent 90%)'; // credits fade out under the bars and buttons
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E\")";

// a line of display type whose letters rise into place one after another
function Rise({ f, at, text, step = 2, style }) {
  return (
    <span style={{ display: 'inline-block', whiteSpace: 'nowrap', ...style }}>
      {graphemes(text).map((g, i) => {
        const p = lerp(f, at + i * step, at + i * step + 16, 0, 1);
        return <span key={i} style={{ display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 70}px)`, filter: `blur(${(1 - p) * 8}px)` }}>{g}</span>;
      })}
    </span>
  );
}

// a small all-caps tag with lines either side, as on a title card
const Tag = ({ children, o = 1, color = 'rgba(255,255,255,.75)', size = 38 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 26, opacity: o, fontFamily: EN, fontSize: size, letterSpacing: size * 0.4, color }}>
    <i style={{ width: 70, height: 3, background: color }} />{children}<i style={{ width: 70, height: 3, background: color }} />
  </div>
);

// the sun-ray burst behind the studio card and the sequel card
const Rays = ({ f, o }) => (
  <div style={{ position: 'absolute', left: '50%', top: '50%', width: 2600, height: 2600, margin: '-1300px 0 0 -1300px', opacity: o,
    background: `repeating-conic-gradient(from ${f * 0.35}deg, rgba(245,196,81,.2) 0deg 3deg, transparent 3deg 11deg)`,
    WebkitMaskImage: 'radial-gradient(circle, #000 0, rgba(0,0,0,.6) 25%, transparent 55%)', maskImage: 'radial-gradient(circle, #000 0, rgba(0,0,0,.6) 25%, transparent 55%)' }} />
);

/* ---------------- shots ---------------- */

// film leader 3-2-1 with the sweeping hand, then the studio card
function Open({ f }) {
  if (f < LEADER) {
    const n = 3 - Math.floor(f / 20);
    const sweep = ((f % 20) / 20) * 360;
    return (
      <AbsoluteFill style={{ background: '#262422', alignItems: 'center', justifyContent: 'center', filter: `brightness(${0.85 + random(`fl${f}`) * 0.2})` }}>
        {n > 0 && <>
          <div style={{ position: 'absolute', width: 1400, height: 1400, borderRadius: '50%', background: `conic-gradient(rgba(255,255,255,.16) 0 ${sweep}deg, transparent ${sweep}deg)` }} />
          <div style={{ position: 'absolute', width: 820, height: 820, borderRadius: '50%', border: '7px solid rgba(236,230,220,.85)' }} />
          <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', border: '5px solid rgba(236,230,220,.6)' }} />
          <i style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 4, background: 'rgba(236,230,220,.5)' }} />
          <i style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 4, background: 'rgba(236,230,220,.5)' }} />
          <span style={{ position: 'relative', fontFamily: EN, fontSize: 560, lineHeight: 1, color: '#EEE8DC' }}>{n}</span>
        </>}
        {[0, 1].map((k) => <i key={k} style={{ position: 'absolute', top: 0, bottom: 0, width: 3, left: `${random(`sc${k}${Math.floor(f / 3)}`) * 100}%`, background: 'rgba(255,255,255,.25)' }} />)}
        {n <= 0 && <AbsoluteFill style={{ background: '#000' }} />}
      </AbsoluteFill>
    );
  }
  const s = f - LEADER;
  const o = lerp(s, 0, 18, 0, 1) * lerp(s, 70, 84, 1, 0, Easing.linear);
  return (
    <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Rays f={s} o={o} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: o, transform: `scale(${lerp(s, 0, 84, 0.94, 1.04, Easing.linear)})` }}>
        <span style={{ fontFamily: EN, fontSize: 190, lineHeight: 1.1, letterSpacing: lerp(s, 0, 40, 70, 22), color: 'transparent',
          backgroundImage: `linear-gradient(100deg, #b8914a 0%, #f6e2a6 ${lerp(s, 0, 70, -20, 120, Easing.linear)}%, #b8914a ${lerp(s, 0, 70, 0, 140, Easing.linear)}%)`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>VOTAGEX</span>
        <span style={{ fontFamily: EN, fontSize: 58, letterSpacing: 40, color: 'rgba(245,226,166,.85)', marginTop: 4 }}>PICTURES</span>
        <span style={{ fontFamily: DISPLAY, fontSize: 46, fontWeight: 600, color: '#fff', marginTop: 70, opacity: lerp(s, 30, 48, 0, 1) }}>ภูมิใจเสนอ</span>
      </div>
    </AbsoluteFill>
  );
}

function Title({ d, f, dur }) {
  const len = graphemes(d.title).length;
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      {d.cover && <Img src={d.cover} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        transform: `scale(${lerp(f, 0, dur, 1.22, 1.04, Easing.linear)})`, opacity: lerp(f, 0, 20, 0, 0.75) }} />}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.15) 40%, rgba(0,0,0,.7))' }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 34, padding: '0 60px' }}>
        <Tag o={lerp(f, 6, 22, 0, 1)}>A TRIP BY {d.crew.length > 1 ? 'US' : 'ME'}</Tag>
        <Rise f={f} at={14} text={d.title} step={Math.max(1, 16 / len)}
          style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: Math.min(210, 1700 / Math.max(4, len)), lineHeight: 1.25, color: '#fff', textShadow: '0 8px 40px rgba(0,0,0,.5)' }} />
        <div style={{ fontFamily: EN, fontSize: 64, letterSpacing: 18, color: GOLD, opacity: lerp(f, 40, 56, 0, 1), transform: `translateY(${lerp(f, 40, 60, 30, 0)}px)` }}>{d.dateCode}</div>
        <div style={{ marginTop: 30, padding: '14px 40px', borderRadius: 999, border: '3px solid rgba(255,255,255,.6)', fontFamily: DISPLAY, fontWeight: 600, fontSize: 44, color: '#fff',
          opacity: lerp(f, 56, 70, 0, 1) }}>{d.ago}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Cast({ d, f }) {
  const rowH = Math.min(300, 1300 / d.crew.length);
  const av = Math.min(240, rowH - 40);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 40%, #1A2440, #0A0E1A)', overflow: 'hidden' }}>
      <span style={{ position: 'absolute', top: '50%', left: 0, marginTop: -330, whiteSpace: 'nowrap', fontFamily: EN, fontSize: 660, lineHeight: 1, color: 'transparent',
        WebkitTextStroke: '3px rgba(255,255,255,.07)', transform: `translateX(${-f * 3}px)` }}>STARRING STARRING</span>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 60 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: lerp(f, 0, 14, 0, 1) }}>
          <Tag size={34}>STARRING</Tag>
          <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 96, color: '#fff' }}>นำแสดงโดย</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: 880 }}>
          {d.crew.map((c, i) => {
            const p = lerp(f, 16 + i * 14, 40 + i * 14, 0, 1);
            const side = i % 2 ? 1 : -1;
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 40, height: rowH - 20, flexDirection: side > 0 ? 'row-reverse' : 'row',
                opacity: p, transform: `translateX(${(1 - p) * side * 300}px)` }}>
                <Img src={c.avatar} style={{ width: av, height: av, borderRadius: '50%', background: '#fff', border: `8px solid ${GOLD}`, flexShrink: 0 }} />
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: Math.min(130, av * 0.6), color: '#fff' }}>{c.name}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// the stops as locations: pins drop on a dark map as the route draws between them
function Locations({ d, f, dur, H }) {
  const box = { x: 170, y: 640, w: 740, h: Math.max(640, H - 1320) };
  const la = d.stops.map((s) => s.lat); const ln = d.stops.map((s) => s.lng);
  const k = Math.min(box.w / Math.max(Math.max(...ln) - Math.min(...ln), 1e-4), box.h / Math.max(Math.max(...la) - Math.min(...la), 1e-4));
  const cx = (Math.max(...ln) + Math.min(...ln)) / 2; const cy = (Math.max(...la) + Math.min(...la)) / 2;
  const pts = d.stops.map((s) => ({ x: box.x + box.w / 2 + (s.lng - cx) * k, y: box.y + box.h / 2 - (s.lat - cy) * k }));
  const from = 22; const to = dur - 30;
  const per = pts.length > 1 ? (to - from) / (pts.length - 1) : 0;
  const path = pts.map((p, i) => (i ? `Q${(pts[i - 1].x + p.x) / 2 + (random(`q${i}`) - 0.5) * 120},${(pts[i - 1].y + p.y) / 2 + (random(`r${i}`) - 0.5) * 120} ${p.x},${p.y}` : `M${p.x},${p.y}`)).join(' ');
  const drawn = lerp(f, from, to, 0, 1, Easing.inOut(Easing.quad));
  return (
    <AbsoluteFill style={{ background: '#0B1626', overflow: 'hidden' }}>
      <AbsoluteFill style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.05) 2px, transparent 2px)',
        backgroundSize: '90px 90px', backgroundPosition: `${-f}px ${-f * 0.5}px` }} />
      <div style={{ position: 'absolute', top: 360, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: lerp(f, 0, 14, 0, 1) }}>
        <Tag size={34}>LOCATIONS</Tag>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 96, color: '#fff' }}>ถ่ายทำ ณ</span>
      </div>
      <svg width="1080" height={H} style={{ position: 'absolute', inset: 0 }}>
        <path d={path} pathLength="1" fill="none" stroke={GOLD} strokeWidth="18" strokeLinecap="round" opacity=".18" strokeDasharray="1" strokeDashoffset={1 - drawn} />
        <path d={path} pathLength="1" fill="none" stroke={GOLD} strokeWidth="6" strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - drawn} />
      </svg>
      {pts.map((p, i) => {
        const at = from + i * per;
        const drop = lerp(f, at - 4, at + 10, 0, 1, Easing.out(Easing.back(2)));
        const s = d.stops[i];
        const toLeft = p.x + 420 > 1040 || (i % 2 === 1 && p.x - 420 > 40);
        return (
          <div key={s.id} style={{ opacity: Math.min(1, drop * 2) }}>
            <div style={{ position: 'absolute', left: p.x - 34, top: p.y - 34, width: 68, height: 68, borderRadius: '50%', background: GOLD, display: 'grid', placeItems: 'center',
              fontFamily: EN, fontSize: 38, color: '#0B1626', boxShadow: `0 0 0 ${12 * (1 - drop) + 8}px rgba(245,196,81,${0.25 * drop})`, transform: `translateY(${(1 - drop) * -80}px) scale(${drop})` }}>{i + 1}</div>
            <div style={{ position: 'absolute', top: p.y - 36, maxWidth: 380, padding: '10px 22px', borderRadius: 12, background: 'rgba(255,255,255,.94)', color: '#0B1626',
              fontFamily: DISPLAY, fontWeight: 600, fontSize: 38, lineHeight: '52px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              transform: `translateX(${(1 - drop) * (toLeft ? 30 : -30)}px)`, ...(toLeft ? { right: 1080 - p.x + 54 } : { left: p.x + 54 }) }}>{s.name}</div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 330, textAlign: 'center', fontFamily: EN, fontSize: 56, letterSpacing: 10, color: '#fff', opacity: lerp(f, to - 6, to + 8, 0, 1) }}>
        {d.stops.length} LOCATIONS · {d.stats.km.toFixed(1)} KM
      </div>
    </AbsoluteFill>
  );
}

// a photo as a scene: the clapperboard snaps shut, a white frame, then the shot with its subtitle
function Scene({ d, f, i, dur, H }) {
  const ph = d.photos[i];
  const side = i % 2 ? 1 : -1;
  const CLAP = 17;
  if (f < CLAP + 2) {
    const shut = lerp(f, 5, CLAP, -26, 0, Easing.in(Easing.cubic));
    const p = lerp(f, 0, 7, 0, 1);
    const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '4px solid rgba(255,255,255,.75)', padding: '18px 0' };
    return (
      <AbsoluteFill style={{ background: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 840, opacity: p, transform: `translateY(${(1 - p) * 80}px) rotate(-3deg)` }}>
          <div style={{ height: 110, transformOrigin: '0 100%', transform: `rotate(${shut}deg)`, borderRadius: '10px 10px 0 0',
            background: 'repeating-linear-gradient(-55deg, #111 0 60px, #f2f2f2 60px 120px)' }} />
          <div style={{ height: 30, background: 'repeating-linear-gradient(55deg, #111 0 60px, #f2f2f2 60px 120px)' }} />
          <div style={{ background: '#161616', padding: '20px 44px 30px', borderRadius: '0 0 18px 18px', color: '#fff', fontFamily: EN }}>
            <div style={{ ...row, borderTop: 0 }}><span style={{ fontSize: 36, opacity: 0.6 }}>PROD.</span><span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 52 }}>{d.title}</span></div>
            <div style={row}><span style={{ fontSize: 36, opacity: 0.6 }}>SCENE</span><span style={{ fontSize: 150, lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ fontSize: 36, opacity: 0.6 }}>TAKE</span><span style={{ fontSize: 150, lineHeight: 1 }}>1</span></div>
            <div style={row}><span style={{ fontSize: 36, opacity: 0.6 }}>DATE</span><span style={{ fontSize: 56, letterSpacing: 6 }}>{ph.stamp}</span></div>
          </div>
        </div>
        {f >= CLAP && <AbsoluteFill style={{ background: '#fff' }} />}
      </AbsoluteFill>
    );
  }
  const g = graphemes(ph.text).length;
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <Img src={ph.src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        transform: `scale(${lerp(f, CLAP, dur, 1.2, 1.05, Easing.linear)}) translateX(${lerp(f, CLAP, dur, side * 30, side * -30, Easing.linear)}px)` }} />
      <AbsoluteFill style={{ background: '#fff', opacity: lerp(f, CLAP + 2, CLAP + 9, 0.9, 0) }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.35), transparent 22%, transparent 55%, rgba(0,0,0,.7))' }} />
      <div style={{ position: 'absolute', right: 70, top: 330, fontFamily: EN, fontSize: 58, letterSpacing: 6, color: '#FF9E3D',
        textShadow: '0 0 12px rgba(255,120,30,.8)', opacity: 0.9 }}>{ph.stamp}</div>
      {ph.text && (
        <div style={{ position: 'absolute', left: 70, right: 70, bottom: Math.max(380, H * 0.17), textAlign: 'center', opacity: lerp(f, 32, 40, 0, 1) }}>
          {ph.by && <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 40, color: '#FFD84D', textShadow: '0 2px 6px #000', marginBottom: 10 }}>{ph.by}</div>}
          <div style={{ fontFamily: TH, fontWeight: 600, fontSize: g > 40 ? 50 : 58, lineHeight: 1.45, color: '#fff',
            textShadow: '0 0 10px rgba(0,0,0,.9), 0 3px 3px #000' }}>{ph.text}</div>
        </div>
      )}
    </AbsoluteFill>
  );
}

function Budget({ d, f }) {
  const t = d.spend.total;
  const max = Math.max(1, ...d.spend.cats.map((c) => c.amount));
  const each = t / Math.max(1, d.crew.length);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(110% 70% at 50% 35%, #231B0C, #070605)', alignItems: 'center', justifyContent: 'center', gap: 50 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: lerp(f, 0, 14, 0, 1) }}>
        <Tag size={34} color="rgba(245,196,81,.85)">BUDGET</Tag>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 96, color: '#fff' }}>ทุนสร้าง</span>
      </div>
      <span style={{ fontFamily: EN, fontSize: Math.min(250, 1500 / Math.max(4, baht(t).length)), lineHeight: 1.1, color: 'transparent',
        backgroundImage: 'linear-gradient(180deg, #FCE8B0, #F5C451 55%, #B8862A)', WebkitBackgroundClip: 'text', backgroundClip: 'text',
        filter: 'drop-shadow(0 10px 30px rgba(245,196,81,.35))' }}>{baht(lerp(f, 12, 62, 0, t, Easing.out(Easing.cubic)))}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26, width: 820 }}>
        {d.spend.cats.slice(0, 5).map((c, i) => {
          const p = lerp(f, 50 + i * 8, 76 + i * 8, 0, 1);
          return (
            <div key={c.label} style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: Math.min(1, p * 2) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: DISPLAY, fontWeight: 600, fontSize: 42, color: '#fff' }}>
                <span>{c.label}</span><span style={{ fontFamily: EN, letterSpacing: 2 }}>{baht(c.amount)}</span>
              </div>
              <i style={{ height: 14, borderRadius: 7, width: `${(c.amount / max) * 100 * p}%`, background: c.color }} />
            </div>
          );
        })}
        {!d.spend.cats.length && <span style={{ textAlign: 'center', fontFamily: DISPLAY, fontSize: 44, color: 'rgba(255,255,255,.6)' }}>ไม่ได้จดไว้</span>}
      </div>
      {t > 0 && d.crew.length > 1 && (
        <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 58, color: '#fff', opacity: lerp(f, 92, 106, 0, 1), transform: `scale(${lerp(f, 92, 106, 1.3, 1, Easing.out(Easing.back(2)))})` }}>
          คนละ ~{baht(each)}
        </span>
      )}
    </AbsoluteFill>
  );
}

// end credits roll up, then the sequel card
function Credits({ d, f, H }) {
  const shooters = [...new Set(d.photos.map((p) => p.by).filter(Boolean))];
  const blocks = [
    ['กำกับโดย', [d.crew.length > 1 ? 'ทุกคนในแก๊ง' : d.crew[0]?.name || 'ฉันเอง']],
    ['นำแสดงโดย', d.crew.map((c) => c.name)],
    shooters.length > 0 && ['ถ่ายภาพ', shooters],
    d.stops.length > 0 && ['สถานที่ถ่ายทำ', d.stops.map((s) => s.name)],
    d.spend.total > 0 && ['ทุนสร้าง', [baht(d.spend.total)]],
    ['ขอบคุณ', ['ทุกความทรงจำ']],
  ].filter(Boolean);
  const tall = blocks.reduce((t, [, names]) => t + 70 + names.length * 76 + 90, 0);
  const ROLL = 160;
  const y = lerp(f, 0, ROLL, H * 0.82, -tall, Easing.linear);
  const card = lerp(f, ROLL - 10, ROLL + 14, 0, 1);
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ WebkitMaskImage: FADE, maskImage: FADE }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, transform: `translateY(${y}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', gap: 90, opacity: 1 - card }}>
        {blocks.map(([role, names]) => (
          <div key={role} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: TH, fontSize: 38, lineHeight: '64px', color: 'rgba(255,255,255,.55)' }}>{role}</span>
            {names.map((n) => <span key={n} style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 54, lineHeight: '70px', color: '#fff' }}>{n}</span>)}
          </div>
        ))}
      </div>
      </AbsoluteFill>
      {card > 0 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: card }}>
          <Rays f={f} o={card} />
          <Tag size={40} color={GOLD} o={lerp(f, ROLL + 4, ROLL + 18, 0, 1)}>COMING SOON</Tag>
          <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 300, lineHeight: 1.2, color: '#fff', textShadow: '0 0 60px rgba(245,196,81,.45)',
            transform: `scale(${lerp(f, ROLL, ROLL + 30, 1.5, 1, Easing.out(Easing.cubic))})` }}>ภาค 2</span>
          <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 60, color: '#fff', opacity: lerp(f, ROLL + 30, ROLL + 46, 0, 1) }}>ไว้ไปด้วยกันอีกนะ</span>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

/* ---------------- the cut ---------------- */

function ShotView({ d, shot, f, H }) {
  if (shot.key === 'open') return <Open f={f} />;
  if (shot.key === 'title') return <Title d={d} f={f} dur={shot.dur} />;
  if (shot.key === 'cast') return <Cast d={d} f={f} />;
  if (shot.key === 'map') return <Locations d={d} f={f} dur={shot.dur} H={H} />;
  if (shot.key === 'budget') return <Budget d={d} f={f} />;
  if (shot.key === 'credits') return <Credits d={d} f={f} H={H} />;
  return <Scene d={d} f={f} i={shot.photo} dur={shot.dur} H={H} />;
}

export default function RecapFilm(d) {
  const f = useCurrentFrame();
  const { height: H } = useVideoConfig();
  const shots = shotsFor(d);
  const found = shots.findIndex((s) => f < s.from + s.dur);
  const shot = shots[found < 0 ? shots.length - 1 : found];
  const local = f - shot.from;
  // a warm light leak sweeps across each cut (scenes have their clapper flash instead)
  const leak = shot.key !== 'open' && shot.photo == null && local < 18 ? Math.sin((local / 18) * Math.PI) : 0;
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <ShotView d={d} shot={shot} f={local} H={H} />
      {leak > 0 && (
        <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: leak,
          background: `radial-gradient(60% 45% at ${lerp(local, 0, 18, -10, 110, Easing.linear)}% 40%, rgba(255,150,60,.85), rgba(255,80,60,.35) 45%, transparent 75%)` }} />
      )}
      <AbsoluteFill style={{ backgroundImage: GRAIN, backgroundSize: '240px 240px', opacity: 0.13, mixBlendMode: 'overlay',
        backgroundPosition: `${Math.floor(random(`gx${f}`) * 240)}px ${Math.floor(random(`gy${f}`) * 240)}px` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(120% 85% at 50% 50%, transparent 55%, rgba(0,0,0,.55))', opacity: 0.9 + random(`v${f}`) * 0.1 }} />
    </AbsoluteFill>
  );
}
