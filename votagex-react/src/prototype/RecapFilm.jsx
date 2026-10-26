import { AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { TURN, shotsFor } from './recapShots';

// A trip's recap as an old diary opened again (Remotion), 9:16 at 1080 wide. The book lies on a desk under a
// lamp: the band slips off, the cover opens, and each page is an entry written in blue ink as we watch: who
// went, the route doodled with a pen, every photo taped in with its caption, the receipt glued beside the sums.
// The last page says see you next time, the cover swings shut and a sticky note lands on it.

const INK = '#22377E';
const RED_INK = '#B83A26';
const PAPER = '#F7F0E1';
const HAND = "'Mali', 'IBM Plex Sans Thai', cursive";
const TH = "'IBM Plex Sans Thai', sans-serif";
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const OUT = Easing.bezier(0.16, 1, 0.3, 1);
const lerp = (f, a, b, from, to, easing = OUT) => interpolate(f, [a, b], [from, to], { ...clamp, easing });
const graphemes = (s) => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s || '')].map((x) => x.segment);
const baht = (n) => `฿${Math.round(n).toLocaleString('en-US')}`;

/* ---------------- pen and paper ---------------- */

// handwriting that writes itself at the pace of a pen
function Write({ f, at = 0, text, speed = 0.75, style }) {
  const g = graphemes(text);
  const n = Math.max(0, Math.min(g.length, Math.floor((f - at) * speed)));
  return <span style={{ fontFamily: HAND, color: INK, whiteSpace: 'pre-wrap', ...style }}>{g.slice(0, n).join('')}</span>;
}

// a stroke drawn by pen: any SVG path, revealed along its length
const Ink = ({ f, at, len = 24, d, color = INK, width = 6 }) => (
  <path d={d} pathLength="1" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
    strokeDasharray="1" strokeDashoffset={1 - lerp(f, at, at + len, 0, 1, Easing.inOut(Easing.quad))} />
);

const Tape = ({ x, y, r, w = 190 }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: 58, transform: `rotate(${r}deg)`, background: 'rgba(250,232,170,.78)',
    boxShadow: '0 2px 4px rgba(0,0,0,.08)', clipPath: 'polygon(2% 8%, 98% 0, 100% 92%, 0 100%)' }} />
);

const HEART = 'M50 82 C 18 60, 8 40, 22 26 C 34 14, 48 22, 50 34 C 52 22, 66 14, 78 26 C 92 40, 82 60, 50 82 Z';
const STAR = 'M50 10 L61 40 L92 41 L67 60 L76 90 L50 72 L24 90 L33 60 L8 41 L39 40 Z';
const SUN = 'M70 50 A20 20 0 1 1 69.9 46 M50 4 V18 M50 82 V96 M4 50 H18 M82 50 H96 M17 17 L27 27 M73 73 L83 83 M83 17 L73 27 M27 73 L17 83';

// the page itself: cream paper, blue rules, a red margin, the spine's shadow, a page number
function Paper({ children, n, back = false }) {
  return (
    <AbsoluteFill style={{ background: PAPER, overflow: 'hidden', borderRadius: back ? '24px 4px 4px 24px' : '4px 24px 24px 4px' }}>
      <AbsoluteFill style={{ background: 'repeating-linear-gradient(180deg, transparent 0 79px, rgba(34,55,126,.13) 79px 81px)', backgroundPosition: '0 230px' }} />
      {!back && <div style={{ position: 'absolute', top: 0, bottom: 0, left: 118, width: 3, background: 'rgba(184,58,38,.28)' }} />}
      <AbsoluteFill style={{ background: back
        ? 'linear-gradient(270deg, rgba(60,40,20,.22), transparent 70px)'
        : 'linear-gradient(90deg, rgba(60,40,20,.28), rgba(60,40,20,.06) 50px, transparent 110px)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(130% 90% at 60% 40%, transparent 60%, rgba(120,90,50,.16))' }} />
      {!back && children}
      {!back && n != null && <span style={{ position: 'absolute', bottom: 36, right: 56, fontFamily: HAND, fontSize: 34, color: 'rgba(34,55,126,.5)' }}>{n}</span>}
    </AbsoluteFill>
  );
}

/* ---------------- the pages ---------------- */

function CoverFace({ d, f }) {
  const sheen = ((f * 1.2) % 160) - 30;
  return (
    <AbsoluteFill style={{ borderRadius: '10px 28px 28px 10px', overflow: 'hidden', background: '#2F4B3F',
      boxShadow: 'inset 0 0 0 14px rgba(0,0,0,.08), inset 18px 0 30px rgba(0,0,0,.35)' }}>
      <AbsoluteFill style={{ opacity: 0.35, background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 2px, transparent 2px 5px), repeating-linear-gradient(90deg, rgba(0,0,0,.08) 0 2px, transparent 2px 6px)' }} />
      <div style={{ position: 'absolute', inset: 70, border: '3px solid rgba(214,180,110,.6)', borderRadius: 18 }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 100px' }}>
        <div style={{ fontFamily: TH, fontSize: 40, letterSpacing: 12, color: 'rgba(214,180,110,.85)' }}>TRAVEL DIARY</div>
        <div style={{ fontFamily: HAND, fontSize: Math.min(140, 980 / Math.max(5, graphemes(d.title).length)), fontWeight: 600, lineHeight: 1.3, marginTop: 30, whiteSpace: 'nowrap',
          backgroundImage: `linear-gradient(100deg, #b8914a 0%, #b8914a ${sheen}%, #f6e2a6 ${sheen + 10}%, #b8914a ${sheen + 22}%)`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.35))' }}>{d.title}</div>
        <div style={{ fontFamily: TH, fontSize: 40, letterSpacing: 6, color: 'rgba(214,180,110,.75)', marginTop: 26 }}>{d.dateCode}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// the inside of the cover: endpaper
const Endpaper = () => (
  <AbsoluteFill style={{ borderRadius: '28px 10px 10px 28px', overflow: 'hidden', background: '#E9DCC3',
    backgroundImage: 'radial-gradient(rgba(47,75,63,.35) 3px, transparent 4px), radial-gradient(rgba(47,75,63,.2) 3px, transparent 4px)',
    backgroundSize: '60px 60px', backgroundPosition: '0 0, 30px 30px' }} />
);

function Intro({ d, f }) {
  return (
    <Paper n={1}>
      <div style={{ position: 'absolute', top: 110, left: 160, right: 70 }}>
        <Write f={f} at={4} text={d.dateLong} speed={1.2} style={{ fontSize: 42, color: RED_INK }} />
      </div>
      <div style={{ position: 'absolute', top: 230, left: 160, right: 70, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Write f={f} at={16} text="วันนี้ไป" speed={0.9} style={{ fontSize: 58, lineHeight: '80px' }} />
        <Write f={f} at={26} text={d.title} speed={0.7} style={{ fontSize: 104, lineHeight: '160px', fontWeight: 600 }} />
        <Write f={f} at={48} text={d.crew.length > 1 ? 'กับแก๊งนี้' : 'คนเดียว'} speed={0.9} style={{ fontSize: 58, lineHeight: '80px' }} />
      </div>
      <div style={{ position: 'absolute', top: 760, left: 160, display: 'flex', gap: 34, flexWrap: 'wrap', width: 700 }}>
        {d.crew.map((c, i) => {
          const p = lerp(f, 56 + i * 8, 70 + i * 8, 0, 1);
          return (
            <div key={c.id} style={{ position: 'relative', width: 170, padding: '14px 14px 46px', background: '#fff', boxShadow: '0 6px 14px rgba(0,0,0,.14)',
              opacity: p, transform: `rotate(${(i % 2 ? 5 : -6) * p}deg) translateY(${(1 - p) * -40}px) scale(${1.3 - 0.3 * p})` }}>
              <Img src={c.avatar} style={{ width: '100%', aspectRatio: '1', background: '#EEF0F2', display: 'block' }} />
              <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontFamily: HAND, fontSize: 30, color: INK }}>{c.name}</div>
            </div>
          );
        })}
      </div>
      <svg width="200" height="200" viewBox="0 0 100 100" style={{ position: 'absolute', right: 60, top: 170 }}>
        <Ink f={f} at={70} len={30} d={SUN} color={RED_INK} width={4} />
      </svg>
    </Paper>
  );
}

// the route, doodled: a wobbly pen line through numbered circles, the time and name written beside each
function Route({ d, f, dur, pageH }) {
  const box = { x: 260, y: 400, w: 500, h: Math.max(500, pageH - 760) };
  const la = d.stops.map((s) => s.lat); const ln = d.stops.map((s) => s.lng);
  const k = Math.min(box.w / Math.max(Math.max(...ln) - Math.min(...ln), 1e-4), box.h / Math.max(Math.max(...la) - Math.min(...la), 1e-4));
  const cx = (Math.max(...ln) + Math.min(...ln)) / 2; const cy = (Math.max(...la) + Math.min(...la)) / 2;
  const pts = d.stops.map((s) => ({ x: box.x + box.w / 2 + (s.lng - cx) * k, y: box.y + box.h / 2 - (s.lat - cy) * k }));
  const drawFrom = 30; const drawTo = dur - TURN - 16;
  const seg = pts.slice(1).map((p, i) => {
    const a = pts[i];
    const mx = (a.x + p.x) / 2 + (random(`mx${i}`) - 0.5) * 140; const my = (a.y + p.y) / 2 + (random(`my${i}`) - 0.5) * 140;
    return `M${a.x},${a.y} Q${mx},${my} ${p.x},${p.y}`;
  });
  const per = seg.length ? (drawTo - drawFrom) / seg.length : 0;
  return (
    <Paper n={2}>
      <div style={{ position: 'absolute', top: 110, left: 160, right: 60 }}>
        <Write f={f} at={4} text="เส้นทางวันนั้น" speed={0.8} style={{ fontSize: 72, fontWeight: 600 }} />
      </div>
      <svg width="1080" height={pageH} style={{ position: 'absolute', inset: 0 }}>
        {seg.map((p, i) => <Ink key={i} f={f} at={drawFrom + i * per} len={per} d={p} width={6} />)}
        {pts.map((p, i) => <Ink key={`c${i}`} f={f} at={drawFrom + Math.max(0, i * per - 6)} len={10} d={`M${p.x + 32},${p.y} A32 32 0 1 1 ${p.x + 31.9},${p.y - 4}`} color={RED_INK} width={5} />)}
      </svg>
      {pts.map((p, i) => {
        const at = drawFrom + i * per;
        const s = d.stops[i];
        const toLeft = i % 2 === 1;
        return (
          <div key={s.id}>
            <span style={{ position: 'absolute', left: p.x - 30, top: p.y - 30, width: 60, textAlign: 'center', fontFamily: HAND, fontSize: 38, lineHeight: '56px', color: RED_INK, opacity: f > at + 4 ? 1 : 0 }}>{i + 1}</span>
            <div style={{ position: 'absolute', top: p.y - 46, width: 380, textAlign: toLeft ? 'right' : 'left', transform: `rotate(${toLeft ? 2 : -2}deg)`,
              ...(toLeft ? { left: p.x - 46 - 380 } : { left: p.x + 46 }) }}>
              <Write f={f} at={at + 4} text={s.time || ''} speed={1.2} style={{ fontSize: 34, color: RED_INK, display: 'block' }} />
              <Write f={f} at={at + 8} text={s.name} speed={1.1} style={{ fontSize: 44, lineHeight: '56px', display: 'block' }} />
            </div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', bottom: 130, left: 160 }}>
        <Write f={f} at={drawTo - 6} text={`รวม ~${d.stats.km.toFixed(1)} กม.`} speed={1} style={{ fontSize: 50 }} />
      </div>
    </Paper>
  );
}

function PhotoPage({ d, f, i, n }) {
  const ph = d.photos[i];
  const side = i % 2 ? 1 : -1;
  const drop = lerp(f, 4, 26, 0, 1, Easing.out(Easing.back(1.4)));
  const doodle = [HEART, STAR, SUN][i % 3];
  const signAt = 28 + graphemes(ph.text).length / 0.85 + 4;
  return (
    <Paper n={n}>
      <div style={{ position: 'absolute', top: 100, right: 70 }}>
        <Write f={f} at={2} text={ph.date} speed={1.3} style={{ fontSize: 38, color: RED_INK }} />
      </div>
      <div style={{ position: 'absolute', left: 170, top: 200, width: 700, padding: 24, background: '#fff', boxShadow: '0 12px 26px rgba(0,0,0,.18)',
        opacity: Math.min(1, drop * 1.5), transform: `rotate(${side * 3 + (1 - drop) * side * 8}deg) scale(${1.15 - 0.15 * drop})` }}>
        <div style={{ width: '100%', aspectRatio: '1 / 0.92', overflow: 'hidden', background: '#ddd' }}>
          <Img src={ph.src} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            transform: `scale(${lerp(f, 0, 105, 1.12, 1.02, Easing.linear)})`, filter: 'sepia(.12) saturate(1.05)' }} />
        </div>
        <Tape x={-50} y={-24} r={-28} />
        <Tape x={560} y={-22} r={24} />
      </div>
      <div style={{ position: 'absolute', left: 160, right: 80, top: 940 }}>
        <Write f={f} at={28} text={ph.text} speed={0.85} style={{ fontSize: 56, lineHeight: '80px' }} />
      </div>
      <div style={{ position: 'absolute', right: 90, top: 1230 }}>
        <Write f={f} at={signAt} text={`— ${ph.by}`} speed={1} style={{ fontSize: 46, color: RED_INK }} />
      </div>
      <svg width="150" height="150" viewBox="0 0 100 100" style={{ position: 'absolute', left: 150, top: 1200, transform: `rotate(${side * 10}deg)` }}>
        <Ink f={f} at={signAt + 4} len={18} d={doodle} color={RED_INK} width={5} />
      </svg>
    </Paper>
  );
}

function Spend({ d, f, n }) {
  const zig = Array.from({ length: 25 }, (_, i) => `${100 - (i / 24) * 100}% ${i % 2 ? '100%' : 'calc(100% - 18px)'}`).join(', '); // torn edge, right to left
  const glue = lerp(f, 4, 24, 0, 1, Easing.out(Easing.back(1.3)));
  const totalAt = 34 + d.spend.cats.length * 12;
  const totalTop = 860 + d.spend.cats.length * 80 + 30;
  return (
    <Paper n={n}>
      <div style={{ position: 'absolute', top: 110, left: 160 }}>
        <Write f={f} at={2} text="ค่าใช้จ่าย" speed={0.9} style={{ fontSize: 72, fontWeight: 600 }} />
      </div>
      <div style={{ position: 'absolute', left: 220, top: 290, width: 460, padding: '40px 40px 60px', background: '#FFFEFA', fontFamily: TH, color: '#2b2622',
        clipPath: `polygon(0 0, 100% 0, ${zig})`,
        opacity: Math.min(1, glue * 1.5), transform: `rotate(${-4 + (1 - glue) * 10}deg) scale(${1.2 - 0.2 * glue})` }}>
        <div style={{ textAlign: 'center', fontSize: 34, fontWeight: 700, letterSpacing: 6 }}>RECEIPT</div>
        <div style={{ borderTop: '3px dashed rgba(0,0,0,.25)', margin: '20px 0' }} />
        {d.spend.cats.map((c) => (
          <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 34, lineHeight: '58px' }}><span>{c.label}</span><span>{baht(c.amount)}</span></div>
        ))}
        {!d.spend.cats.length && <div style={{ fontSize: 30, opacity: 0.6 }}>ไม่ได้จดไว้</div>}
      </div>
      {glue > 0.6 && <Tape x={350} y={262} r={-6} />}
      <div style={{ position: 'absolute', left: 160, right: 80, top: 860, display: 'flex', flexDirection: 'column' }}>
        {d.spend.cats.map((c, i) => (
          <Write key={c.label} f={f} at={30 + i * 12} text={`${c.label} ${baht(c.amount)}`} speed={1.3} style={{ fontSize: 46, lineHeight: '80px' }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 160, top: totalTop, width: 760 }}>
        <svg width="600" height="190" viewBox="0 0 600 190" style={{ position: 'absolute', left: -50, top: -40 }}>
          <Ink f={f} at={totalAt + 14} len={18} d="M40 100 C 40 20, 560 10, 560 90 C 560 170, 60 175, 30 105 C 20 75, 90 40, 160 34" color={RED_INK} width={5} />
        </svg>
        <Write f={f} at={totalAt} text={`รวม ${baht(d.spend.total)}`} speed={0.8} style={{ fontSize: 76, fontWeight: 600, color: RED_INK, display: 'block' }} />
        {d.spend.total > 0 && (
          <Write f={f} at={totalAt + 22} text={`คนละ ~${baht(d.spend.total / Math.max(1, d.crew.length))}`} speed={1.1} style={{ fontSize: 46, display: 'block', marginTop: 30 }} />
        )}
      </div>
    </Paper>
  );
}

function End({ d, f, n }) {
  return (
    <Paper n={n}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 110px 0 170px' }}>
        <Write f={f} at={6} text="ไว้ไปด้วยกันอีกนะ" speed={0.55} style={{ fontSize: 100, lineHeight: '150px', fontWeight: 600 }} />
        <svg width="220" height="220" viewBox="0 0 100 100" style={{ marginTop: 20 }}>
          <Ink f={f} at={42} len={24} d={HEART} color={RED_INK} width={5} />
        </svg>
        <Write f={f} at={56} text={d.crew.map((c) => c.name).join(' · ')} speed={1} style={{ fontSize: 46, color: RED_INK }} />
      </AbsoluteFill>
    </Paper>
  );
}

/* ---------------- the book on the desk ---------------- */

function PageView({ d, page, f, index, pageH }) {
  if (page.key === 'intro') return <Intro d={d} f={f} />;
  if (page.key === 'route') return <Route d={d} f={f} dur={page.dur} pageH={pageH} />;
  if (page.key === 'spend') return <Spend d={d} f={f} n={index} />;
  if (page.key === 'end') return <End d={d} f={f} n={index} />;
  if (page.photo != null) return <PhotoPage d={d} f={f} i={page.photo} n={index} />;
  return <Paper />;
}

export default function RecapFilm(d) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pages = shotsFor(d);
  const last = pages[pages.length - 1];
  const found = pages.findIndex((p) => f < p.from + p.dur);
  const idx = found < 0 ? pages.length - 1 : found;
  const cur = pages[idx];
  const local = f - cur.from;
  const turning = idx < pages.length - 1 && local > cur.dur - TURN;
  const t = turning ? interpolate(local, [cur.dur - TURN, cur.dur], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }) : 0;
  const next = pages[idx + 1];

  const pageW = 940; const pageH = Math.min(1700, height - 360);
  const left = (width - pageW) / 2 + 40; const top = (height - pageH) / 2 + 30;
  const close = lerp(f, last.from + 110, last.from + 140, 0, 1, Easing.inOut(Easing.cubic)); // the cover swings shut
  const note = lerp(f, last.from + 146, last.from + 160, 0, 1, Easing.out(Easing.back(1.6)));
  // the camera: leans in as the band slips off, breathes while reading, pulls back once the book is shut
  const cam = f < 40 ? lerp(f, 0, 40, 0.86, 1, Easing.inOut(Easing.quad)) : close > 0 ? 1 - close * 0.1 : 1 + Math.sin(f / 50) * 0.008;
  const bandOff = lerp(f, 16, 40, 0, 1, Easing.in(Easing.quad));
  const coverAngle = (idx === 0 ? -180 * t : -180) + 180 * close;

  // one leaf of the book, hinged on the spine; its back shows once it's past upright
  const leaf = (content, angle, z, back) => (
    <div style={{ position: 'absolute', left, top, width: pageW, height: pageH, transformOrigin: '0 50%', transform: `rotateY(${angle}deg)`,
      transformStyle: 'preserve-3d', zIndex: z }}>
      <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
        {content}
        <AbsoluteFill style={{ background: '#000', opacity: Math.abs(Math.sin((angle * Math.PI) / 180)) * 0.3 }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
        {back}
        <AbsoluteFill style={{ background: '#000', opacity: Math.abs(Math.sin((angle * Math.PI) / 180)) * 0.3 }} />
      </div>
    </div>
  );
  const view = (p, i) => <PageView d={d} page={p} f={f - p.from} index={i} pageH={pageH} />;

  return (
    <AbsoluteFill style={{ background: '#24170F', overflow: 'hidden' }}>
      {/* the desk: dark wood under a warm lamp */}
      <AbsoluteFill style={{ background: 'repeating-linear-gradient(94deg, rgba(255,255,255,.025) 0 3px, transparent 3px 22px, rgba(0,0,0,.08) 22px 24px, transparent 24px 61px)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(70% 55% at 30% 18%, rgba(255,196,120,.42), transparent 70%)' }} />
      {/* a pen lying on the desk */}
      <div style={{ position: 'absolute', right: -80, bottom: 120, width: 600, height: 30, borderRadius: 15, background: 'linear-gradient(180deg, #2a3866, #0d1530)',
        boxShadow: '0 18px 22px rgba(0,0,0,.45)', transform: `rotate(-30deg) translateX(${close * -40}px)` }} />
      <AbsoluteFill style={{ transform: `scale(${cam})`, perspective: 2600 }}>
        {/* the rest of the book under the pages: the back cover and the edges of the pages */}
        <div style={{ position: 'absolute', left: left - 6, top: top + 10, width: pageW + 24, height: pageH + 16, borderRadius: '10px 30px 30px 10px', background: '#243B31', boxShadow: '0 40px 70px rgba(0,0,0,.55)' }} />
        {[4, 3, 2, 1].map((k) => (
          <div key={k} style={{ position: 'absolute', left, top: top + k * 2.5, width: pageW + k * 3, height: pageH, borderRadius: '4px 24px 24px 4px', background: k % 2 ? '#EDE3CD' : '#E4D8BE' }} />
        ))}
        {/* the open page, or the next one already lying under the page that's turning */}
        {leaf(idx === 0 || turning ? view(next || cur, idx + 1) : view(cur, idx), 0, 1, null)}
        {/* the page turning over to the left */}
        {idx > 0 && turning && leaf(view(cur, idx), -180 * t, 3, <Paper back />)}
        {/* the cover: shut at first, open flat to the left (out of sight), swinging back over at the end */}
        {coverAngle > -179 && leaf(<CoverFace d={d} f={f} />, coverAngle, 5, <Endpaper />)}
        {/* the elastic band, slipping off the cover */}
        {bandOff < 1 && (
          <div style={{ position: 'absolute', left: left + pageW - 130 + bandOff * 300, top: top - 24, width: 36, height: pageH + 48, borderRadius: 12,
            background: 'linear-gradient(90deg, #6b1d1d, #b23a3a 50%, #6b1d1d)', boxShadow: '0 8px 14px rgba(0,0,0,.4)', zIndex: 6, opacity: 1 - bandOff * 0.8,
            transform: `rotate(${bandOff * 16}deg)` }} />
        )}
        {/* a sticky note on the shut book */}
        {note > 0 && (
          <div style={{ position: 'absolute', left: left + pageW - 500, top: top + pageH - 560, width: 430, padding: '44px 40px', background: '#FFE27A', zIndex: 7,
            boxShadow: '0 14px 24px rgba(0,0,0,.35)', transform: `rotate(${10 - note * 5}deg) scale(${2 - note})`, opacity: note }}>
            <div style={{ fontFamily: HAND, fontSize: 60, lineHeight: '84px', color: INK }}>ไปอีกนะ ♡</div>
            <div style={{ fontFamily: HAND, fontSize: 40, lineHeight: '60px', color: RED_INK, marginTop: 14 }}>{d.ago}</div>
          </div>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(120% 90% at 45% 35%, transparent 55%, rgba(0,0,0,.6))' }} />
    </AbsoluteFill>
  );
}
