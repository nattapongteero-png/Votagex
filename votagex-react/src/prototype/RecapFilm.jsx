import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, Easing, Html5Audio, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { iris } from '@remotion/transitions/iris';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BEAT, CUT, FPS, T, blocksFor, queryOf, quotesOf, shotsFor } from './recapShots';

// A trip's recap cut like a launch film (after mtioon's), 9:16 at 1080 wide, every beat on the sound's grid
// (recapShots). A pastel ground; a mascot (a map pin with eyes) pops up and the trip bursts out of it as
// glossy 3D pills (where, when, who, how much); big words land a beat at a time while quotes from the trip
// float round them and a search bar types the trip in; a white card sets its name over a tilted conveyor of
// its photos; a real map (MapLibre, free OpenFreeMap tiles) draws the route with the mascot riding the head
// of the line, a callout pill at each stop placed where it covers nothing; each photo as a tilted card with
// its note and who took it; the numbers as full-screen colour blocks opening one from another in circles;
// the name with the mascot to close. Cuts: a parallax swipe (the old shot falls back as the new one comes
// over it) and iris circles, both on a spring. Shots are laid out 1080 wide and zoomed to the player's frame,
// which is the screen's size (see Shot).

maplibregl.setWorkerUrl(workerUrl);
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

const DISPLAY = "'Kanit', 'IBM Plex Sans Thai', sans-serif";
const UI = "'IBM Plex Sans Thai', sans-serif";
const INK = '#1B2A4A';
const INK_2 = '#5B6478';
const C = { orange: '#FF6B2C', blue: '#2F7BF5', purple: '#8B5CF6', pink: '#EC5FA0', yellow: '#F6C531', green: '#22B07D', black: '#1B1D24', white: '#FFFFFF' };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
const lerp = (f, a, b, from, to, easing = Easing.bezier(0.16, 1, 0.3, 1)) => interpolate(f, [a, b], [from, to], { ...clamp, easing });
const POP = { damping: 11, stiffness: 190, mass: 0.7 };
const sp = (f, at, config = POP) => spring({ frame: f - at, fps: FPS, config });
const baht = (n) => `฿${Math.round(n).toLocaleString('en-US')}`;
const graphemes = (s) => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s || '')].map((x) => x.segment);
const cut = (s, n) => (graphemes(s).length > n ? `${graphemes(s).slice(0, n).join('')}…` : s);
const float = (f, seed, amp = 8) => Math.sin((f + seed * 13) / 16) * amp;
const THAI = /[฀-๿]/;

/* ---------------- pieces ---------------- */

// the soft pastel ground, its light drifting slowly
const Pastel = ({ f }) => (
  <AbsoluteFill style={{ background: `radial-gradient(70% 45% at ${18 + Math.sin(f / 50) * 6}% 8%, #FFE0CF, transparent 70%),
    radial-gradient(70% 50% at ${88 - Math.sin(f / 60) * 5}% 58%, #E6E1FF, transparent 72%), radial-gradient(60% 35% at 25% 98%, #FFE6D8, transparent 70%), #FBF9FB` }} />
);

// a glossy 3D pill, built like a token: a lit face with a gloss band across its top, a solid side of the
// same colour stacked under it for its thickness, a contact shadow and a coloured glow on the ground. Text
// sits in the middle of the face: IBM Plex Sans Thai centres Thai on its line, but figures ride high by
// about 0.06 em, so a pill with no Thai in it is nudged down by that much
function Pill({ bg = C.blue, fg = '#fff', size = 40, avatar, dot, wrap = false, style, children }) {
  const white = bg === C.white;
  const side = white ? '#D5D9E2' : `color-mix(in srgb, ${bg} 70%, black)`;
  const depth = Math.round(size * 0.2);
  const text = typeof children === 'string' ? children : '';
  const nudge = text && !THAI.test(text) ? 0.06 : 0.01;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: size * 0.32, minHeight: size * 2.05, padding: wrap ? `${size * 0.5}px ${size * 0.8}px` : `0 ${size * 0.78}px`,
      borderRadius: wrap ? size * 0.95 : 999, whiteSpace: wrap ? 'normal' : 'nowrap', maxWidth: wrap ? 860 : undefined, boxSizing: 'border-box',
      color: fg, fontFamily: UI, fontWeight: 700, fontSize: size, lineHeight: 1.3,
      background: white ? 'linear-gradient(180deg, #FFFFFF 0%, #F6F7FA 60%, #ECEEF3 100%)' : `linear-gradient(180deg, color-mix(in srgb, ${bg} 70%, white) 0%, ${bg} 46%, color-mix(in srgb, ${bg} 90%, black) 100%)`,
      boxShadow: [
        `inset 0 ${size * 0.05}px 0 rgba(255,255,255,${white ? 1 : 0.5})`, `inset 0 ${-size * 0.08}px ${size * 0.12}px rgba(0,0,0,${white ? 0.04 : 0.12})`,
        ...Array.from({ length: depth }, (_, i) => `0 ${i + 1}px 0 ${side}`),
        `0 ${depth + size * 0.12}px ${size * 0.22}px rgba(27,42,74,.22)`, `0 ${depth + size * 0.5}px ${size * 1.1}px color-mix(in srgb, ${white ? INK : bg} 30%, transparent)`,
      ].join(', '), ...style }}>
      <i style={{ position: 'absolute', left: size * 0.5, right: size * 0.5, top: size * 0.12, height: size * 0.62, borderRadius: 999, pointerEvents: 'none',
        background: `linear-gradient(180deg, rgba(255,255,255,${white ? 0.9 : 0.42}), rgba(255,255,255,0))` }} />
      {avatar && <Img src={avatar} style={{ position: 'relative', width: size * 1.4, height: size * 1.4, borderRadius: '50%', background: '#fff', marginLeft: -size * 0.5, flexShrink: 0, boxShadow: `0 0 0 ${size * 0.08}px rgba(255,255,255,.85)` }} />}
      {dot && <i style={{ position: 'relative', width: size * 0.42, height: size * 0.42, borderRadius: '50%', border: `${size * 0.1}px solid currentColor`, flexShrink: 0 }} />}
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: size * 0.3, translate: `0 ${nudge}em`, textShadow: white ? 'none' : '0 1px 0 rgba(0,0,0,.12)' }}>{children}</span>
    </div>
  );
}

// something placed on the frame that pops in on its beat, tilted a little in 3D, bobbing gently
function Pop({ f, at, x, y, r = 0, from, seed = 0, bob = 8, tilt = 14, children }) {
  const p = sp(f, at);
  if (f < at - 1) return null;
  const k = Math.min(1, p);
  const px = from ? from[0] + (x - from[0]) * k : x;
  const py = (from ? from[1] + (y - from[1]) * k : y) + float(f, seed, bob);
  return (
    <div style={{ position: 'absolute', left: px, top: py, zIndex: 3,
      transform: `translate(-50%, -50%) perspective(900px) rotateX(${tilt}deg) rotate(${r * k}deg) scale(${Math.max(0, p)})` }}>{children}</div>
  );
}

// the mascot: a map pin with eyes, glossy, blinking now and then; `look` moves its eyes (-1 to 1)
function Mascot({ f, size = 300, blink = [44, 120, 190], look = 0 }) {
  const shut = blink.some((b) => f >= b && f < b + 5) ? 0.12 : 1;
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 100 120" style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <radialGradient id="rc-pin" cx=".38" cy=".3" r=".8"><stop offset="0" stopColor="#FFA36B" /><stop offset=".5" stopColor="#FF6B2C" /><stop offset="1" stopColor="#D9400F" /></radialGradient>
      </defs>
      <ellipse cx="50" cy="117" rx="18" ry="4" fill="rgba(27,42,74,.16)" />
      <path d="M50 114 C50 114 11 72 11 44 A39 39 0 1 1 89 44 C89 72 50 114 50 114 Z" fill="url(#rc-pin)" />
      <path d="M50 110 C50 110 18 74 16 48" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="33" cy="22" rx="14" ry="7.5" fill="rgba(255,255,255,.42)" transform="rotate(-26 33 22)" />
      <ellipse cx="25" cy="58" rx="7" ry="4.5" fill="rgba(255,90,110,.35)" />
      <ellipse cx="75" cy="58" rx="7" ry="4.5" fill="rgba(255,90,110,.35)" />
      {[37, 63].map((x) => (
        <g key={x} transform={`translate(${x + look * 3} 45) scale(1 ${shut})`}>
          <ellipse rx="8.5" ry="11.5" fill="#15161B" />
          <circle cx="2.6" cy="-4.2" r="3" fill="#fff" />
        </g>
      ))}
    </svg>
  );
}

const Ink = ({ size, weight = 800, color = INK, style, children }) => (
  <div style={{ fontFamily: DISPLAY, fontWeight: weight, fontSize: size, lineHeight: 1.18, color, letterSpacing: -size * 0.015, whiteSpace: 'nowrap', ...style }}>{children}</div>
);

// a word landing on its beat: a quick overshoot in scale
const Word = ({ f, at, children, style }) => {
  const p = sp(f, at, { damping: 12, stiffness: 230, mass: 0.6 });
  if (f < at) return null;
  return <span style={{ display: 'inline-block', transform: `scale(${0.6 + 0.4 * p})`, opacity: Math.min(1, p * 3), ...style }}>{children}</span>;
};

/* ---------------- shots ---------------- */

// the mascot pops up and the trip bursts out of it as pills, laid round it in a ring
function Hook({ d, f, H }) {
  const cx = 540; const cy = H * 0.43;
  const chips = [
    { dx: -250, dy: -500, r: -7, bg: C.blue, dot: true, t: cut(d.stops[0]?.name || d.title, 14) },
    { dx: 270, dy: -420, r: 6, bg: C.black, t: d.dateCode },
    { dx: -320, dy: -60, r: -5, bg: C.purple, avatar: d.crew[0]?.avatar, t: d.crew[0]?.name },
    { dx: 330, dy: 20, r: 7, bg: C.pink, t: `${d.stats.photos} ภาพ` },
    { dx: -250, dy: 470, r: 5, bg: C.yellow, fg: INK, t: d.spend.total > 0 ? baht(d.spend.total) : `${d.stats.days} วัน` },
    { dx: 270, dy: 530, r: -6, bg: C.orange, t: `${d.stats.km.toFixed(1)} กม.` },
  ].filter((c) => c.t);
  const look = interpolate(f, [T.hook.chips, T.hook.chips + 10, T.hook.chips + 20, T.hook.chips + 30], [0, -1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Pastel f={f} />
      <Pop f={f} at={T.hook.mascot - 5} x={cx} y={cy} bob={6} tilt={0}><Mascot f={f} size={360} look={look} /></Pop>
      <div style={{ position: 'absolute', left: 0, right: 0, top: cy + 260, textAlign: 'center', opacity: lerp(f, T.hook.title, T.hook.title + 8, 0, 1), translate: `0 ${lerp(f, T.hook.title, T.hook.title + 10, 24, 0)}px` }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 56, color: INK }}>{d.title}</div>
        <div style={{ fontFamily: UI, fontWeight: 500, fontSize: 36, color: INK_2, marginTop: 2 }}>{d.ago}</div>
      </div>
      {chips.map((c, i) => (
        <Pop key={i} f={f} at={T.hook.chips + i * T.hook.chipStep} x={cx + c.dx} y={cy + c.dy} r={c.r} from={[cx, cy]} seed={i}>
          <Pill bg={c.bg} fg={c.fg} dot={c.dot} avatar={c.avatar}>{c.t}</Pill>
        </Pop>
      ))}
    </AbsoluteFill>
  );
}

// big words a beat at a time, the trip's name typing itself in; quotes from the trip float round them, then
// a search bar types the trip and its send button is pressed
function Say({ d, f, H }) {
  const S = T.say;
  const name = graphemes(d.title);
  const typedName = Math.max(0, Math.min(name.length, Math.floor((f - S.name) / S.nameStep) + 1));
  const q = graphemes(queryOf(d));
  const typed = Math.max(0, Math.min(q.length, Math.floor((f - S.query) / S.queryStep) + 1));
  const press = f >= S.press && f < S.press + 5 ? 0.86 : 1;
  const spots = [
    { x: 290, y: H * 0.2, r: -7, bg: C.orange },
    { x: 800, y: H * 0.25, r: 6, bg: C.blue },
    { x: 280, y: H * 0.53, r: -5, bg: C.pink },
  ];
  const nameSize = Math.min(150, 1450 / Math.max(5, name.length + 4)); // the line is "เราไป" and the name together
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Pastel f={f + 96} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: H * 0.32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Ink size={128}><Word f={f} at={S.words[0]}>วันนี้</Word> <Word f={f} at={S.words[1]}>{d.ago.replace(/^วันนี้/, '')}</Word></Ink>
        <Ink size={nameSize}>
          <Word f={f} at={S.went}>เราไป</Word>
          {f >= S.name && <span>{name.map((g, i) => <span key={i} style={{ color: i < typedName ? INK : 'rgba(27,42,74,.14)' }}>{g}</span>)}</span>}
        </Ink>
      </div>
      {quotesOf(d).map((t, i) => (
        <Pop key={i} f={f} at={S.quotes + i * S.quoteStep} x={spots[i].x} y={spots[i].y} r={spots[i].r} seed={i + 3} bob={6}>
          <Pill bg={spots[i].bg} size={34}>“{cut(t, 16)}”</Pill>
        </Pop>
      ))}
      <Pop f={f} at={S.bar} x={540} y={H * 0.67} tilt={0} bob={0}>
        <div style={{ width: 880, height: 124, borderRadius: 62, background: 'linear-gradient(180deg, #fff, #F7F8FB)', display: 'flex', alignItems: 'center', gap: 22, padding: '0 20px 0 28px',
          boxShadow: '0 1px 0 #E2E5EC, 0 2px 0 #E2E5EC, 0 3px 0 #E2E5EC, 0 4px 0 #E2E5EC, 0 26px 50px rgba(27,42,74,.16)', fontFamily: UI, fontSize: 40, fontWeight: 500, color: INK }}>
          <span style={{ width: 58, flexShrink: 0 }}><Mascot f={f} size={52} blink={[]} /></span>
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', translate: '0 0.01em' }}>{q.slice(0, typed).join('')}<span style={{ opacity: Math.floor(f / 8) % 2 ? 0 : 1, color: C.orange }}>|</span></span>
          <span style={{ width: 86, height: 86, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, transform: `scale(${press})`,
            background: typed >= q.length ? `linear-gradient(180deg, color-mix(in srgb, ${C.blue} 70%, white), ${C.blue})` : '#E6E9F0',
            boxShadow: typed >= q.length ? `0 4px 0 color-mix(in srgb, ${C.blue} 70%, black), 0 10px 18px rgba(47,123,245,.35)` : 'none' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </span>
        </div>
      </Pop>
    </AbsoluteFill>
  );
}

// one lane of the conveyor: its photos and pills, drawn once (it never changes), only moved
const Lane = memo(function Lane({ items }) {
  return [...items, ...items, ...items, ...items].map((t, j) => (t.src
    ? <Img key={j} src={t.src} style={{ width: 300, height: 220, objectFit: 'cover', borderRadius: 30, boxShadow: '0 6px 0 #fff, 0 22px 34px rgba(27,42,74,.2)', flexShrink: 0 }} />
    : <Pill key={j} bg={t.bg} fg={t.fg} avatar={t.avatar} size={44}>{t.t}</Pill>));
});

// a white card with the trip's name over a tilted conveyor of its photos and pills; the mascot peeks in
function Brief({ d, f, H }) {
  const card = sp(f, T.brief.card, { damping: 18, stiffness: 120 });
  const lanes = useMemo(() => {
    const tokens = [
      ...d.photos.map((p) => ({ src: p.src })),
      ...d.stops.map((s, i) => ({ t: s.name, bg: [C.blue, C.purple, C.pink, C.orange][i % 4] })),
      ...d.crew.map((c) => ({ t: c.name, avatar: c.avatar, bg: C.white, fg: INK })),
    ];
    return [0, 1, 2].map((k) => tokens.filter((_, j) => j % 3 === k));
  }, [d]);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Pastel f={f + 192} />
      <div style={{ position: 'absolute', left: -200, right: -200, top: H * 0.5, height: H * 0.7, perspective: 1600 }}>
        <div style={{ position: 'absolute', inset: 0, transform: 'rotateX(52deg) rotateZ(-24deg)', transformOrigin: '50% 30%' }}>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{ position: 'absolute', left: 0, top: k * 300, display: 'flex', gap: 44, alignItems: 'center', translate: `${-600 + ((f * (5 + k)) % 600) - k * 180}px 0px` }}>
              <Lane items={lanes[k]} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 60, right: 60, top: H * 0.18, padding: '72px 64px', borderRadius: 64, background: '#fff',
        boxShadow: '0 1px 0 #ECEEF3, 0 2px 0 #ECEEF3, 0 3px 0 #ECEEF3, 0 4px 0 #ECEEF3, 0 5px 0 #ECEEF3, 0 6px 0 #ECEEF3, 0 44px 90px rgba(27,42,74,.16)',
        transform: `translateY(${(1 - card) * 260}px) rotate(${(1 - card) * 4}deg)` }}>
        <Ink size={Math.min(130, 1500 / Math.max(5, graphemes(d.title).length))}><Word f={f} at={T.brief.title}>{d.title}</Word></Ink>
        <div style={{ fontFamily: UI, fontSize: 40, fontWeight: 500, color: INK_2, marginTop: 18, opacity: lerp(f, T.brief.sub, T.brief.sub + 8, 0, 1), translate: `0 ${lerp(f, T.brief.sub, T.brief.sub + 10, 20, 0)}px` }}>
          {[d.dateFull, `${d.stats.days} วัน`, d.stats.stops && `${d.stats.stops} ที่`, d.crew.length > 1 && `${d.crew.length} คน`].filter(Boolean).join(' · ')}
        </div>
      </div>
      <Pop f={f} at={T.brief.mascot} x={980} y={H * 0.18 - 8} r={12} tilt={0} bob={5} seed={2}><Mascot f={f + 20} size={150} look={-0.8} /></Pop>
    </AbsoluteFill>
  );
}

// where each stop's callout goes: around its pin, wherever it covers the fewest pins and other callouts,
// kept inside the frame
function placeCallouts(pins, names, H) {
  const size = 38; const h = size * 2.05;
  const placed = [];
  return pins.map((p, i) => {
    const w = graphemes(names[i]).length * size * 0.56 + size * 4.2;
    const tries = [[0, -150], [0, 150], [-(w / 2 + 70), -110], [w / 2 + 70, -110], [-(w / 2 + 70), 110], [w / 2 + 70, 110], [0, -260], [0, 260]];
    let best = null;
    tries.forEach(([dx, dy], k) => {
      const x = Math.max(40 + w / 2, Math.min(1040 - w / 2, p.x + dx)); const y = Math.max(H * 0.25, Math.min(H * 0.74, p.y + dy));
      const r = { l: x - w / 2 - 12, r: x + w / 2 + 12, t: y - h / 2 - 12, b: y + h / 2 + 12 };
      const hitsPin = pins.filter((q) => q.x > r.l - 40 && q.x < r.r + 40 && q.y > r.t - 40 && q.y < r.b + 40).length;
      const hitsCall = placed.filter((o) => o.l < r.r && o.r > r.l && o.t < r.b && o.b > r.t).length;
      const cost = hitsCall * 100 + hitsPin * 40 + k;
      if (!best || cost < best.cost) best = { cost, x, y, r };
    });
    placed.push(best.r);
    return { x: best.x, y: best.y, i };
  });
}

// the route on a real map: the line draws with the mascot riding its head, each stop pops a pin and a
// callout pill on a leader line; the distance lands as a pill when the line arrives
function RouteMap({ d, f, H, z, dur }) { // z: the shot's zoom
  const M = T.map;
  const box = useRef(null);
  const [pins, setPins] = useState(null);
  const [route, setRoute] = useState(null); // the route through the stops, on screen: points and the length along it
  const [ready, setReady] = useState(false); // the first frame of tiles has drawn
  useEffect(() => {
    const lng = d.stops.map((s) => s.lng); const lat = d.stops.map((s) => s.lat);
    const m = new maplibregl.Map({
      // the map draws 1080 wide, shown at phone size, so at under half its CSS size
      container: box.current, style: MAP_STYLE, interactive: false, attributionControl: false, fadeDuration: 0, pixelRatio: 0.6,
      bounds: [[Math.min(...lng), Math.min(...lat)], [Math.max(...lng), Math.max(...lat)]],
      fitBoundsOptions: { padding: { top: H * 0.3, bottom: H * 0.32, left: 230, right: 230 }, maxZoom: 15 },
    });
    // the camera never moves, so the route is projected to the screen once and drawn over the map as SVG;
    // each frame only reveals more of it (projecting and re-uploading a line every frame was too slow on phones)
    m.on('load', () => {
      const projected = d.stops.map((s) => m.project([s.lng, s.lat]));
      setPins(projected);
      if (d.stops.length > 1) {
        // straight legs from stop to stop with rounded joins: a curve overshoots where the trip doubles back
        const pts = projected;
        const at = [0];
        pts.slice(1).forEach((q, i) => at.push(at[i] + Math.hypot(q.x - pts[i].x, q.y - pts[i].y)));
        setRoute({ pts, at, d: `M${pts.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' L')}` });
      }
      m.once('idle', () => setReady(true));
    });
    return () => m.remove(); // in the app the player unmounts this shot; free the WebGL context
  }, [d.stops, H]);
  const last = M.start + Math.max(0, d.stops.length - 1) * M.per;
  const drawn = lerp(f, M.start, Math.max(M.start + 1, last), 0, 1, IN_OUT);
  // the mascot rides the head of the line: the point that far along the route
  const tip = (() => {
    if (!route) return pins?.[0];
    const want = drawn * route.at[route.at.length - 1];
    const k = Math.max(1, route.at.findIndex((v) => v >= want));
    const u = (want - route.at[k - 1]) / Math.max(1e-6, route.at[k] - route.at[k - 1]);
    return { x: route.pts[k - 1].x + (route.pts[k].x - route.pts[k - 1].x) * u, y: route.pts[k - 1].y + (route.pts[k].y - route.pts[k - 1].y) * u };
  })();
  const calls = useMemo(() => (pins ? placeCallouts(pins, d.stops.map((s) => `${s.name} ${s.time || ''}`), H) : []), [pins, d.stops, H]);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Pastel f={f + 280} />
      <div style={{ position: 'absolute', inset: 0, scale: lerp(f, 0, dur, 1, 1.06, Easing.linear) }}>
        {/* out of the shot's zoom and scaled down instead, so the map measures a plain 1080 box in any browser
            (a canvas is kept at its own drawing size, not its CSS size, so scaling costs it no memory) */}
        <div ref={box} style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: H, zoom: 1 / z, transform: `scale(${z})`, transformOrigin: '0 0', opacity: ready ? 1 : 0 }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(251,249,251,.96), rgba(251,249,251,0) 22%, rgba(251,249,251,0) 74%, rgba(251,249,251,.96))' }} />
        {route && (
          <svg width="1080" height={H} viewBox={`0 0 1080 ${H}`} style={{ position: 'absolute', inset: 0, opacity: ready ? 1 : 0 }}>
            <path d={route.d} pathLength="1" fill="none" stroke="#fff" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - drawn} />
            <path d={route.d} pathLength="1" fill="none" stroke={C.orange} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - drawn} />
          </svg>
        )}
        {pins && (
          <svg width="1080" height={H} viewBox={`0 0 1080 ${H}`} style={{ position: 'absolute', inset: 0 }}>
            {calls.map((c) => {
              const p = pins[c.i]; const at = M.start + c.i * M.per;
              const k = lerp(f, at + 4, at + 12, 0, 1, IN_OUT);
              return <line key={c.i} x1={p.x} y1={p.y} x2={p.x + (c.x - p.x) * k} y2={p.y + (c.y - p.y) * k} stroke={INK} strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" opacity=".7" />;
            })}
          </svg>
        )}
        {pins && pins.map((p, i) => (
          <Pop key={i} f={f} at={M.start + i * M.per - 2} x={p.x} y={p.y} tilt={0} bob={0}>
            <div style={{ width: 66, height: 66, borderRadius: '50%', display: 'grid', placeItems: 'center', fontFamily: UI, fontWeight: 700, fontSize: 32, color: '#fff',
              background: `radial-gradient(circle at 38% 30%, #FFA36B, ${C.orange} 60%, #D9400F)`, boxShadow: '0 0 0 6px #fff, 0 3px 0 6px #E4E6EC, 0 12px 20px rgba(255,107,44,.35)' }}>
              <span style={{ translate: '0 0.06em' }}>{i + 1}</span>
            </div>
          </Pop>
        ))}
        {calls.map((c) => {
          const s = d.stops[c.i];
          return (
            <Pop key={c.i} f={f} at={M.start + c.i * M.per + 8} x={c.x} y={c.y} r={c.i % 2 ? 3 : -3} seed={c.i} bob={4} tilt={10}>
              <Pill bg={C.white} fg={INK} size={38}>
                <span style={{ color: C.orange }}>{c.i + 1}</span>{cut(s.name, 16)}{s.time && <span style={{ color: INK_2, fontWeight: 500 }}>{s.time}</span>}
              </Pill>
            </Pop>
          );
        })}
        {tip && drawn < 1 && (
          <div style={{ position: 'absolute', left: tip.x, top: tip.y, transform: `translate(-50%, -100%) rotate(${Math.sin(f / 3) * 6}deg)`, zIndex: 4 }}><Mascot f={f} size={110} blink={[]} /></div>
        )}
      </div>
      <Pop f={f} at={M.title} x={540} y={H * 0.17} tilt={0} bob={4}><Pill bg={C.black} size={46}>เส้นทาง</Pill></Pop>
      <Pop f={f} at={M.start + d.stops.length * M.per} x={540} y={H * 0.81} r={-4} bob={6}>
        <Pill bg={C.orange} size={72}>{d.stats.km.toFixed(1)} กม.</Pill>
      </Pop>
      <div style={{ position: 'absolute', left: 40, bottom: 300, fontFamily: UI, fontSize: 22, color: 'rgba(27,42,74,.45)' }}>© OpenFreeMap © OpenMapTiles © OpenStreetMap</div>
    </AbsoluteFill>
  );
}

// a photo as a tilted card, its date, note and who took it popping on as pills round it
function PhotoShot({ d, f, dur, i, H }) {
  const ph = d.photos[i];
  const side = i % 2 ? 1 : -1;
  const p = sp(f, 0, { damping: 16, stiffness: 120 });
  const colours = [C.purple, C.blue, C.pink, C.green];
  const top = H * 0.17; const h = H * 0.52;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Pastel f={f + 380 + i * 96} />
      <div style={{ position: 'absolute', left: 110, top, width: 860, height: h, perspective: 1800 }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 60, overflow: 'hidden', boxShadow: '0 0 0 10px #fff, 0 6px 0 10px #E9EBF0, 0 50px 90px rgba(27,42,74,.24)',
          transform: `translateY(${(1 - p) * 300}px) rotateY(${side * lerp(f, 0, dur, 16, 6, Easing.linear)}deg) rotateZ(${side * -2}deg)` }}>
          <Img src={ph.src} style={{ width: '100%', height: '100%', objectFit: 'cover', scale: lerp(f, 0, dur, 1.12, 1.02, Easing.linear) }} />
        </div>
      </div>
      <Pop f={f} at={T.photo.date} x={side > 0 ? 290 : 790} y={top} r={side * -6} seed={i}><Pill bg={C.black} size={36}>{ph.date}</Pill></Pop>
      {ph.text && (
        <Pop f={f} at={T.photo.text} x={540} y={top + h + 40} r={side * 2} seed={i + 1} bob={5} tilt={8}>
          <Pill bg={C.white} fg={INK} size={48} wrap>{ph.text}</Pill>
        </Pop>
      )}
      {ph.by && (
        <Pop f={f} at={T.photo.by} x={side > 0 ? 770 : 310} y={top + h + (ph.text ? 230 : 60)} r={side * 5} seed={i + 2}>
          <Pill bg={colours[i % colours.length]} avatar={ph.byAvatar} size={40}>{`${ph.by} ถ่าย`}</Pill>
        </Pop>
      )}
    </AbsoluteFill>
  );
}

// the tilted field of the trip's words behind a colour block: drawn once (it never changes), only moved
const WordField = memo(function WordField({ words, H }) {
  return Array.from({ length: Math.ceil((H + 800) / 86) }, (_, row) => (
    <div key={row} style={{ display: 'flex', gap: 22, marginLeft: (row % 2) * -120 }}>
      {Array.from({ length: 10 }, (_, j) => (
        <span key={j} style={{ padding: '10px 24px', borderRadius: 999, fontFamily: UI, fontWeight: 600, fontSize: 28, whiteSpace: 'nowrap',
          color: 'rgba(0,0,0,.32)', background: 'rgba(255,255,255,.16)' }}>{words[(row * 5 + j) % words.length]}</span>
      ))}
    </div>
  ));
});

// the numbers as full-screen colour blocks, each opening out of the last in a circle on its beat, over a
// tilted field of the trip's words; the number lands with a punch. Only the open block and the one it is
// opening over are drawn.
function Blocks({ d, f, H }) {
  const each = d.spend.total / Math.max(1, d.crew.length);
  const rows = [
    { bg: C.orange, big: `${d.stats.stops} ที่.` },
    { bg: C.purple, big: `${d.stats.photos} ภาพ.` },
    { bg: C.blue, big: `${Math.max(1, d.crew.length)} คน.` },
    { bg: C.yellow, fg: INK, big: baht(each), small: d.crew.length > 1 ? 'ต่อคน' : 'ที่ใช้ไป' },
  ].slice(0, blocksFor(d));
  const words = useMemo(() => [d.title, ...d.stops.map((s) => s.name), ...d.crew.map((c) => c.name), d.dateCode, `${d.stats.km.toFixed(1)} กม.`], [d]);
  const cur = Math.min(rows.length - 1, Math.floor((f + 6) / T.blocks.step));
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {rows.map((r, k) => {
        const t = f - k * T.blocks.step;
        if (t < -6 || k < cur - 1) return null;
        const open = k === 0 ? 1 : lerp(t, -6, 6, 0, 1, Easing.bezier(0.5, 0, 0.2, 1)); // fully open on the beat
        // in percent, which zoom can't get wrong: 70.72% of a circle's reference length reaches the corners
        return (
          <AbsoluteFill key={k} style={{ background: r.bg, clipPath: open < 1 ? `circle(${open * 70.72}% at 50% 50%)` : 'none', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: -600, top: -400, width: 2400, rotate: '-18deg', display: 'flex', flexDirection: 'column', gap: 26, translate: `${-(f * 3) % 400}px 0px` }}>
              <WordField words={words} H={H} />
            </div>
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
              <Ink size={r.big.length > 7 ? 190 : 230} color={r.fg || '#fff'} style={{ transform: `scale(${1.3 - 0.3 * sp(Math.max(0, t), 0, { damping: 13, stiffness: 220 })})`, textShadow: '0 10px 30px rgba(0,0,0,.18)' }}>{r.big}</Ink>
              {r.small && <Ink size={70} weight={700} color={r.fg || '#fff'}>{r.small}</Ink>}
            </AbsoluteFill>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

// the close: the mascot, a kicker, the trip's name and when, and who went as a pill
function End({ d, f }) {
  const E = T.end;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Pastel f={f + 640} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 18, padding: '0 60px', textAlign: 'center' }}>
        <div style={{ transform: `scale(${sp(f, E.mascot)})`, marginBottom: 30 }}><Mascot f={f} size={220} blink={[70]} /></div>
        <div style={{ fontFamily: UI, fontWeight: 600, fontSize: 30, letterSpacing: 8, color: INK_2, opacity: lerp(f, E.title, E.title + 8, 0, 1) }}>VOTAGEX · TRIP RECAP</div>
        <Ink size={Math.min(170, 1500 / Math.max(5, graphemes(d.title).length))}><Word f={f} at={E.title}>{d.title}</Word></Ink>
        <div style={{ fontFamily: UI, fontWeight: 500, fontSize: 42, color: INK_2, opacity: lerp(f, E.sub, E.sub + 8, 0, 1), translate: `0 ${lerp(f, E.sub, E.sub + 10, 18, 0)}px` }}>{d.dateFull} · {d.ago}</div>
        <div style={{ marginTop: 44, transform: `scale(${sp(f, E.crew)})` }}>
          <Pill bg={C.orange} size={42}>
            <span style={{ display: 'flex', marginLeft: -10 }}>{d.crew.slice(0, 4).map((c, i) => <Img key={c.id} src={c.avatar} style={{ width: 62, height: 62, borderRadius: '50%', background: '#fff', marginLeft: i ? -18 : 0, border: '3px solid #fff' }} />)}</span>
            {d.crew.map((c) => c.name).join(' · ')}
          </Pill>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ---------------- the cut ---------------- */

// a parallax swipe: the new shot comes over from the side (or from below), the old one moves a third as far
// while it falls back and dims, so the cut reads as one camera move rather than two pages sliding
function Swipe({ children, presentationDirection, presentationProgress: p, passedProps: { axis } }) {
  const { width } = useVideoConfig(); // cuts are outside the shots' zoom, in the frame's own pixels
  const along = axis === 'y' ? (v) => `0 ${v}%` : (v) => `${v}% 0`;
  return (
    <AbsoluteFill style={presentationDirection === 'entering'
      ? { translate: along((1 - p) * 100), boxShadow: `0 0 ${(80 * width) / 1080}px rgba(27,42,74,.18)` }
      : { translate: along(-p * 32), scale: 1 - 0.06 * p, filter: `brightness(${1 - 0.25 * p})` }}>
      {children}
    </AbsoluteFill>
  );
}

// one shot, reading its own frame (local to its sequence). It is laid out 1080 wide and zoomed to the frame:
// zoom lays it out at the screen's size, so its layers are drawn at the phone's real resolution, where a
// scaled-down 1080 frame is drawn at full size first (on Safari, over a gigabyte by the third shot)
function Shot({ d, shot }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const z = width / 1080; const H = height / z;
  const p = { d, f, dur: shot.dur, H, z };
  const body = shot.key === 'hook' ? <Hook {...p} />
    : shot.key === 'say' ? <Say {...p} />
    : shot.key === 'brief' ? <Brief {...p} />
    : shot.key === 'map' ? <RouteMap {...p} />
    : shot.key === 'blocks' ? <Blocks {...p} />
    : shot.key === 'end' ? <End {...p} />
    : <PhotoShot {...p} i={shot.photo} />;
  return <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: H, zoom: z }}>{body}</div>;
}

export default function RecapFilm(d) {
  const { width, height } = useVideoConfig();
  const shots = shotsFor(d);
  const present = {
    slide: { component: Swipe, props: { axis: 'x' } },
    rise: { component: Swipe, props: { axis: 'y' } },
    iris: iris({ width, height }),
  };
  const timing = springTiming({ config: { damping: 200 }, durationInFrames: CUT });
  return (
    <AbsoluteFill style={{ background: '#FBF9FB' }}>
      <TransitionSeries>
        {shots.flatMap((shot) => [
          shot.cut && <TransitionSeries.Transition key={`${shot.key}-cut`} presentation={present[shot.cut]} timing={timing} />,
          <TransitionSeries.Sequence key={shot.key} name={shot.key} durationInFrames={shot.dur} premountFor={shot.key === 'map' ? 6 * BEAT : 0}>
            <Shot d={d} shot={shot} />
          </TransitionSeries.Sequence>,
        ].filter(Boolean))}
      </TransitionSeries>
      {d.sound && <Html5Audio src={d.sound} />}
    </AbsoluteFill>
  );
}
