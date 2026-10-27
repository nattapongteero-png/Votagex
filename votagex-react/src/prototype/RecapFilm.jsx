import { useEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { iris } from '@remotion/transitions/iris';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { lineString } from '@turf/helpers';
import bezierSpline from '@turf/bezier-spline';
import length from '@turf/length';
import lineSliceAlong from '@turf/line-slice-along';
import { BLOCK, CUT, FPS, blocksFor, shotsFor } from './recapShots';

// A trip's recap cut like a launch film (after mtioon's), 9:16 at 1080 wide. A pastel ground; a mascot (a
// map pin with eyes) pops up and the trip bursts out of it as glossy 3D pills (where, when, who, how much);
// big words land a beat at a time while quotes from the trip float round them and a search bar types the
// trip in; a white card sets its name over a tilted conveyor of its photos; a real map (MapLibre, free
// OpenFreeMap tiles) draws the route with the mascot riding the head of the line, a callout pill on a leader
// line at each stop; each photo as a tilted card with its note and who took it as pills; the numbers as
// full-screen colour blocks opening one from another in circles over a tilted field of the trip's words; the
// name with the mascot to close. Cuts: slides, a rise, and iris circles.

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
const POP = { damping: 11, stiffness: 180, mass: 0.7 };
const sp = (f, at, config = POP) => spring({ frame: f - at, fps: FPS, config });
const baht = (n) => `฿${Math.round(n).toLocaleString('en-US')}`;
const graphemes = (s) => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s || '')].map((x) => x.segment);
const cut = (s, n) => (graphemes(s).length > n ? `${graphemes(s).slice(0, n).join('')}…` : s);
const float = (f, seed, amp = 8) => Math.sin((f + seed * 13) / 16) * amp;

/* ---------------- pieces ---------------- */

// the soft pastel ground, its light drifting slowly
const Pastel = ({ f }) => (
  <AbsoluteFill style={{ background: `radial-gradient(70% 45% at ${18 + Math.sin(f / 50) * 6}% 8%, #FFE0CF, transparent 70%),
    radial-gradient(70% 50% at ${88 - Math.sin(f / 60) * 5}% 58%, #E6E1FF, transparent 72%), radial-gradient(60% 35% at 25% 98%, #FFE6D8, transparent 70%), #FBF9FB` }} />
);

// a glossy 3D pill: lit from above, a darker edge underneath for its thickness, a coloured glow below
function Pill({ bg = C.blue, fg = '#fff', size = 40, avatar, dot, wrap = false, style, children }) {
  const white = bg === C.white;
  const edge = white ? '#D9DCE3' : `color-mix(in srgb, ${bg} 72%, black)`;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.35, padding: `${size * 0.42}px ${size * 0.75}px`, borderRadius: wrap ? size * 0.9 : 999,
      whiteSpace: wrap ? 'normal' : 'nowrap', maxWidth: wrap ? 860 : undefined, color: fg, fontFamily: UI, fontWeight: 700, fontSize: size, lineHeight: 1.3,
      background: white ? 'linear-gradient(180deg, #FFFFFF, #F3F4F7)' : `linear-gradient(180deg, color-mix(in srgb, ${bg} 62%, white) 0%, ${bg} 42%, color-mix(in srgb, ${bg} 88%, black) 100%)`,
      boxShadow: `inset 0 ${size * 0.08}px 0 rgba(255,255,255,.55), 0 ${size * 0.16}px 0 ${edge}, 0 ${size * 0.5}px ${size * 0.9}px color-mix(in srgb, ${white ? INK : bg} 28%, transparent)`, ...style }}>
      {avatar && <Img src={avatar} style={{ width: size * 1.35, height: size * 1.35, borderRadius: '50%', background: '#fff', margin: `${-size * 0.25}px 0 ${-size * 0.25}px ${-size * 0.45}px`, flexShrink: 0 }} />}
      {dot && <i style={{ width: size * 0.42, height: size * 0.42, borderRadius: '50%', border: `${size * 0.1}px solid currentColor`, flexShrink: 0 }} />}
      {children}
    </div>
  );
}

// something placed on the frame that pops in on its beat, tilted a little in 3D, bobbing gently
function Pop({ f, at, x, y, r = 0, from, seed = 0, bob = 8, tilt = 14, children }) {
  const p = sp(f, at);
  if (f < at - 1) return null;
  const px = from ? from[0] + (x - from[0]) * Math.min(1, p) : x;
  const py = (from ? from[1] + (y - from[1]) * Math.min(1, p) : y) + float(f, seed, bob);
  return (
    <div style={{ position: 'absolute', left: px, top: py, zIndex: 3,
      transform: `translate(-50%, -50%) perspective(900px) rotateX(${tilt}deg) rotate(${r}deg) scale(${Math.max(0, p)})` }}>{children}</div>
  );
}

// the mascot: a map pin with eyes, glossy, blinking now and then
function Mascot({ f, size = 300, blink = [44, 120, 190] }) {
  const shut = blink.some((b) => f >= b && f < b + 5) ? 0.12 : 1;
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 100 120" style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id="rc-pin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF9A5C" /><stop offset=".55" stopColor="#FF6B2C" /><stop offset="1" stopColor="#E9481A" /></linearGradient>
      </defs>
      <ellipse cx="50" cy="117" rx="18" ry="4" fill="rgba(27,42,74,.14)" />
      <path d="M50 114 C50 114 11 72 11 44 A39 39 0 1 1 89 44 C89 72 50 114 50 114 Z" fill="url(#rc-pin)" />
      <path d="M50 114 C50 114 11 72 11 44 A39 39 0 1 1 89 44 C89 72 50 114 50 114 Z" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="1.5" />
      <ellipse cx="34" cy="22" rx="15" ry="8" fill="rgba(255,255,255,.35)" transform="rotate(-24 34 22)" />
      {[37, 63].map((x) => (
        <g key={x} transform={`translate(${x} 46) scale(1 ${shut})`}>
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
  const p = sp(f, at, { damping: 12, stiffness: 220, mass: 0.6 });
  if (f < at) return null;
  return <span style={{ display: 'inline-block', transform: `scale(${0.6 + 0.4 * p})`, opacity: Math.min(1, p * 3), ...style }}>{children}</span>;
};

/* ---------------- shots ---------------- */

// the mascot pops up and the trip bursts out of it as pills
function Hook({ d, f, H }) {
  const cx = 540; const cy = H * 0.42;
  const chips = [
    { dx: -270, dy: -520, r: -8, bg: C.blue, dot: true, t: cut(d.stops[0]?.name || d.title, 14) },
    { dx: 290, dy: -450, r: 7, bg: C.black, t: d.dateCode },
    { dx: -330, dy: -40, r: -6, bg: C.purple, avatar: d.crew[0]?.avatar, t: d.crew[0]?.name },
    { dx: 340, dy: 20, r: 8, bg: C.pink, t: `${d.stats.photos} ภาพ` },
    { dx: -260, dy: 420, r: 6, bg: C.yellow, fg: INK, t: d.spend.total > 0 ? baht(d.spend.total) : `${d.stats.days} วัน` },
    { dx: 280, dy: 470, r: -7, bg: C.orange, t: `${d.stats.km.toFixed(1)} กม.` },
  ].filter((c) => c.t);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Pastel f={f} />
      <Pop f={f} at={-6} x={cx} y={cy} bob={6} tilt={0}><Mascot f={f} size={360} /></Pop>
      <div style={{ position: 'absolute', left: 0, right: 0, top: cy + 270, textAlign: 'center', opacity: lerp(f, 10, 18, 0, 1) }}>
        <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 48, color: INK }}>{d.title}</div>
        <div style={{ fontFamily: UI, fontWeight: 500, fontSize: 34, color: INK_2, marginTop: 4 }}>{d.ago}</div>
      </div>
      {chips.map((c, i) => (
        <Pop key={i} f={f} at={6 + i * 4} x={cx + c.dx} y={cy + c.dy} r={c.r} from={[cx, cy]} seed={i}>
          <Pill bg={c.bg} fg={c.fg} dot={c.dot} avatar={c.avatar}>{c.t}</Pill>
        </Pop>
      ))}
    </AbsoluteFill>
  );
}

// big words a beat at a time, the trip's name typing itself in; quotes from the trip float round them, then
// a search bar types the trip and its send button is pressed
function Say({ d, f, H }) {
  const name = graphemes(d.title);
  const typedName = Math.max(0, Math.min(name.length, Math.floor((f - 24) / 1.6)));
  const query = `${d.title} · ${d.dateFull}`;
  const q = graphemes(query);
  const typed = Math.max(0, Math.min(q.length, Math.floor((f - 52) / 1.1)));
  const press = f >= 88 && f < 93 ? 0.88 : 1;
  const quotes = d.photos.map((p) => p.text).filter(Boolean);
  const qs = [
    { x: 300, y: H * 0.22, r: -7, bg: C.orange, t: quotes[0] },
    { x: 790, y: H * 0.26, r: 6, bg: C.blue, t: quotes[1] },
    { x: 230, y: H * 0.52, r: -5, bg: C.pink, t: quotes[2] },
    { x: 840, y: H * 0.5, r: 8, bg: C.yellow, fg: INK, t: d.crew.length > 1 ? `${d.crew.length} คน` : null },
  ].filter((c) => c.t);
  const nameSize = Math.min(150, 1450 / Math.max(5, name.length + 4)); // the line is "เราไป" and the name together
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Pastel f={f + 84} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: H * 0.31, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Ink size={128}><Word f={f} at={0}>วันนี้</Word> <Word f={f} at={7}>{d.ago.replace(/^วันนี้/, '')}</Word></Ink>
        <Ink size={nameSize}>
          <Word f={f} at={16}>เราไป</Word>
          {f >= 22 && <span>{name.map((g, i) => <span key={i} style={{ color: i < typedName ? INK : 'rgba(27,42,74,.16)' }}>{g}</span>)}</span>}
        </Ink>
      </div>
      {qs.map((c, i) => (
        <Pop key={i} f={f} at={32 + i * 5} x={c.x} y={c.y} r={c.r} seed={i + 3} bob={6}>
          <Pill bg={c.bg} fg={c.fg} size={34}>“{cut(c.t, 16)}”</Pill>
        </Pop>
      ))}
      <Pop f={f} at={46} x={540} y={H * 0.66} tilt={0} bob={0}>
        <div style={{ width: 860, height: 120, borderRadius: 60, background: '#fff', display: 'flex', alignItems: 'center', gap: 22, padding: '0 18px 0 30px',
          boxShadow: '0 2px 0 #E4E6EC, 0 24px 50px rgba(27,42,74,.14)', fontFamily: UI, fontSize: 40, fontWeight: 500, color: INK }}>
          <span style={{ width: 54, flexShrink: 0 }}><Mascot f={f} size={50} blink={[]} /></span>
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>{q.slice(0, typed).join('')}<span style={{ opacity: Math.floor(f / 8) % 2 ? 0 : 1, color: C.orange }}>|</span></span>
          <span style={{ width: 84, height: 84, borderRadius: '50%', background: typed >= q.length ? C.blue : '#E6E9F0', display: 'grid', placeItems: 'center', flexShrink: 0, transform: `scale(${press})` }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </span>
        </div>
      </Pop>
    </AbsoluteFill>
  );
}

// a white card with the trip's name over a tilted conveyor of its photos and pills; the mascot peeks in
function Brief({ d, f, H }) {
  const card = sp(f, 0, { damping: 200 });
  const tokens = [
    ...d.photos.map((p) => ({ src: p.src })),
    ...d.stops.map((s, i) => ({ t: s.name, bg: [C.blue, C.purple, C.pink, C.orange][i % 4] })),
    ...d.crew.map((c) => ({ t: c.name, avatar: c.avatar, bg: C.white, fg: INK })),
  ];
  const lane = (k) => tokens.filter((_, j) => j % 3 === k);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Pastel f={f + 184} />
      <div style={{ position: 'absolute', left: -200, right: -200, top: H * 0.5, height: H * 0.7, perspective: 1600 }}>
        <div style={{ position: 'absolute', inset: 0, transform: 'rotateX(52deg) rotateZ(-24deg)', transformOrigin: '50% 30%' }}>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{ position: 'absolute', left: 0, top: k * 300, display: 'flex', gap: 40, alignItems: 'center', translate: `${-600 + ((f * (5 + k)) % 600) - k * 180}px 0px` }}>
              {[...lane(k), ...lane(k), ...lane(k), ...lane(k)].map((t, j) => (t.src
                ? <Img key={j} src={t.src} style={{ width: 300, height: 220, objectFit: 'cover', borderRadius: 30, boxShadow: '0 20px 30px rgba(27,42,74,.18)', flexShrink: 0 }} />
                : <Pill key={j} bg={t.bg} fg={t.fg} avatar={t.avatar} size={44}>{t.t}</Pill>))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 50, right: 50, top: H * 0.17, padding: '70px 64px', borderRadius: 64, background: '#fff', boxShadow: '0 40px 90px rgba(27,42,74,.16)',
        transform: `translateY(${(1 - card) * 220}px)`, opacity: Math.min(1, card * 2) }}>
        <Ink size={Math.min(130, 1500 / Math.max(5, graphemes(d.title).length))}><Word f={f} at={6}>{d.title}</Word></Ink>
        <div style={{ fontFamily: UI, fontSize: 40, fontWeight: 500, color: INK_2, marginTop: 18, opacity: lerp(f, 14, 24, 0, 1), translate: `0 ${lerp(f, 14, 24, 20, 0)}px` }}>
          {[d.dateFull, `${d.stats.days} วัน`, d.stats.stops && `${d.stats.stops} ที่`, d.crew.length > 1 && `${d.crew.length} คน`].filter(Boolean).join(' · ')}
        </div>
      </div>
      <Pop f={f} at={26} x={170} y={H * 0.17 - 10} r={-12} tilt={0} bob={5} seed={2}><Mascot f={f + 20} size={150} /></Pop>
    </AbsoluteFill>
  );
}

// the route on a real map: the line draws with the mascot riding its head, each stop pops a pin and a
// callout pill on a leader line; the distance lands as a pill when the line arrives
function RouteMap({ d, f, H, dur }) {
  const box = useRef(null);
  const [map, setMap] = useState(null);
  const [pins, setPins] = useState(null);
  const [ready, setReady] = useState(false); // the first frame of tiles has drawn
  const route = useMemo(() => {
    const coords = d.stops.map((s) => [s.lng, s.lat]);
    if (coords.length < 2) return null;
    const line = bezierSpline(lineString(coords), { resolution: 10000, sharpness: 0.6 });
    return { line, km: length(line) };
  }, [d.stops]);
  useEffect(() => {
    const lng = d.stops.map((s) => s.lng); const lat = d.stops.map((s) => s.lat);
    const m = new maplibregl.Map({
      container: box.current, style: MAP_STYLE, interactive: false, attributionControl: false, fadeDuration: 0, pixelRatio: 1,
      bounds: [[Math.min(...lng), Math.min(...lat)], [Math.max(...lng), Math.max(...lat)]],
      fitBoundsOptions: { padding: { top: H * 0.3, bottom: H * 0.32, left: 230, right: 230 }, maxZoom: 15 },
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    m.on('load', () => {
      m.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'route-casing', type: 'line', source: 'route', paint: { 'line-color': '#fff', 'line-width': 22 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      m.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': C.orange, 'line-width': 12 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      setPins(d.stops.map((s) => m.project([s.lng, s.lat])));
      setMap(m);
      m.once('idle', () => setReady(true));
    });
    return () => m.remove(); // in the app the player unmounts this shot; free the WebGL context
  }, [d.stops, H]);
  const per = 16; const start = 14;
  const drawn = lerp(f, start, start + Math.max(1, d.stops.length - 1) * per, 0, 1, IN_OUT);
  const head = useMemo(() => (route && drawn > 0.001 ? lineSliceAlong(route.line, 0, route.km * drawn) : null), [route, drawn]);
  useEffect(() => {
    if (!map) return;
    map.getSource('route')?.setData(head || { type: 'FeatureCollection', features: [] });
  }, [map, head]);
  const tip = map && head ? map.project(head.geometry.coordinates[head.geometry.coordinates.length - 1]) : pins?.[0];
  // callouts above or below their pin, kept inside the frame and clear of one another
  const calls = (pins || []).map((p, i) => ({ x: Math.max(250, Math.min(830, p.x)), y: p.y + (i % 2 ? 150 : -150), i }));
  calls.forEach((c, i) => calls.slice(0, i).forEach((o) => { if (Math.abs(o.x - c.x) < 380 && Math.abs(o.y - c.y) < 100) c.y += c.y > o.y ? 100 : -100; }));
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Pastel f={f + 260} />
      <div style={{ position: 'absolute', inset: 0, scale: lerp(f, 0, dur, 1, 1.06, Easing.linear) }}>
        <div ref={box} style={{ position: 'absolute', inset: 0, width: 1080, height: H, opacity: ready ? 1 : 0 }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(251,249,251,.95), rgba(251,249,251,0) 22%, rgba(251,249,251,0) 74%, rgba(251,249,251,.95))' }} />
        {pins && (
          <svg width="1080" height={H} style={{ position: 'absolute', inset: 0 }}>
            {calls.map((c) => {
              const p = pins[c.i]; const at = start + c.i * per;
              const k = lerp(f, at + 4, at + 12, 0, 1, IN_OUT);
              return <line key={c.i} x1={p.x} y1={p.y} x2={p.x + (c.x - p.x) * k} y2={p.y + (c.y - p.y) * k} stroke={INK} strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />;
            })}
          </svg>
        )}
        {pins && pins.map((p, i) => (
          <Pop key={i} f={f} at={start + i * per - 2} x={p.x} y={p.y} tilt={0} bob={0}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: 32, color: '#fff',
              background: `linear-gradient(180deg, #FF9A5C, ${C.orange})`, boxShadow: '0 0 0 6px #fff, 0 10px 18px rgba(255,107,44,.35)' }}>{i + 1}</div>
          </Pop>
        ))}
        {pins && calls.map((c) => {
          const s = d.stops[c.i];
          return (
            <Pop key={c.i} f={f} at={start + c.i * per + 8} x={c.x} y={c.y} r={c.i % 2 ? 3 : -3} seed={c.i} bob={4} tilt={10}>
              <Pill bg={C.white} fg={INK} size={38}>
                <span style={{ color: C.orange, fontFamily: DISPLAY }}>{c.i + 1}</span>{cut(s.name, 16)}{s.time && <span style={{ color: INK_2, fontWeight: 500 }}>{s.time}</span>}
              </Pill>
            </Pop>
          );
        })}
        {tip && drawn < 1 && (
          <div style={{ position: 'absolute', left: tip.x, top: tip.y, transform: `translate(-50%, -100%) rotate(${Math.sin(f / 3) * 6}deg)`, zIndex: 4 }}><Mascot f={f} size={110} blink={[]} /></div>
        )}
      </div>
      <Pop f={f} at={4} x={540} y={H * 0.17} tilt={0} bob={4}><Pill bg={C.black} size={46}>เส้นทาง</Pill></Pop>
      <Pop f={f} at={start + Math.max(1, d.stops.length - 1) * per + 6} x={540} y={H * 0.8} r={-4} bob={6}>
        <Pill bg={C.orange} size={72}>{d.stats.km.toFixed(1)} กม.</Pill>
      </Pop>
      <div style={{ position: 'absolute', left: 40, bottom: 300, fontFamily: UI, fontSize: 22, color: 'rgba(27,42,74,.45)' }}>© OpenFreeMap © OpenMapTiles © OpenStreetMap</div>
    </AbsoluteFill>
  );
}

// a photo as a tilted card, its note and who took it popping on as pills
function PhotoShot({ d, f, dur, i, H }) {
  const ph = d.photos[i];
  const side = i % 2 ? 1 : -1;
  const p = sp(f, 0, { damping: 16, stiffness: 120 });
  const colours = [C.purple, C.blue, C.pink, C.green];
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Pastel f={f + 300 + i * 90} />
      <div style={{ position: 'absolute', left: 110, top: H * 0.16, width: 860, height: H * 0.56, perspective: 1800 }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 60, overflow: 'hidden', boxShadow: '0 50px 90px rgba(27,42,74,.25)',
          transform: `translateY(${(1 - p) * 300}px) rotateY(${side * lerp(f, 0, dur, 16, 6, Easing.linear)}deg) rotateZ(${side * -2}deg)` }}>
          <Img src={ph.src} style={{ width: '100%', height: '100%', objectFit: 'cover', scale: lerp(f, 0, dur, 1.12, 1.02, Easing.linear) }} />
        </div>
      </div>
      <Pop f={f} at={12} x={side > 0 ? 300 : 780} y={H * 0.17} r={side * -6} seed={i}><Pill bg={C.black} size={36}>{ph.date}</Pill></Pop>
      {ph.text && (
        <Pop f={f} at={20} x={540} y={H * 0.75} r={side * 2} seed={i + 1} bob={5} tilt={8}>
          <Pill bg={C.white} fg={INK} size={50} wrap>{ph.text}</Pill>
        </Pop>
      )}
      {ph.by && (
        <Pop f={f} at={30} x={side > 0 ? 760 : 320} y={H * (ph.text ? 0.83 : 0.76)} r={side * 5} seed={i + 2}>
          <Pill bg={colours[i % colours.length]} avatar={ph.byAvatar} size={40}>{ph.by} ถ่าย</Pill>
        </Pop>
      )}
    </AbsoluteFill>
  );
}

// the numbers as full-screen colour blocks, each opening out of the last in a circle, over a tilted field
// of the trip's words; the number lands with a punch
function Blocks({ d, f, H }) {
  const each = d.spend.total / Math.max(1, d.crew.length);
  const rows = [
    { bg: C.orange, big: `${d.stats.stops} ที่.` },
    { bg: C.purple, big: `${d.stats.photos} ภาพ.` },
    { bg: C.blue, big: `${Math.max(1, d.crew.length)} คน.` },
    { bg: C.yellow, fg: INK, big: baht(each), small: d.crew.length > 1 ? 'ต่อคน' : 'ที่ใช้ไป' },
  ].slice(0, blocksFor(d));
  const words = [d.title, ...d.stops.map((s) => s.name), ...d.crew.map((c) => c.name), d.dateCode, `${d.stats.km.toFixed(1)} กม.`];
  const R = Math.hypot(540, H / 2);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {rows.map((r, k) => {
        const t = f - k * BLOCK;
        if (t < 0) return null;
        const open = k === 0 ? 1 : lerp(t, 0, 12, 0, 1, Easing.bezier(0.5, 0, 0.2, 1));
        return (
          <AbsoluteFill key={k} style={{ background: r.bg, clipPath: `circle(${open * R}px at 540px ${H / 2}px)`, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: -600, top: -400, width: 2400, rotate: '-18deg', display: 'flex', flexDirection: 'column', gap: 26, translate: `${-(f * 3) % 400}px 0px` }}>
              {Array.from({ length: Math.ceil((H + 800) / 86) }, (_, row) => (
                <div key={row} style={{ display: 'flex', gap: 22, marginLeft: (row % 2) * -120 }}>
                  {Array.from({ length: 14 }, (_, j) => (
                    <span key={j} style={{ padding: '10px 24px', borderRadius: 999, fontFamily: UI, fontWeight: 600, fontSize: 28, whiteSpace: 'nowrap',
                      color: `color-mix(in srgb, ${r.bg} 55%, black)`, background: `color-mix(in srgb, ${r.bg} 88%, white)`, opacity: 0.55 }}>{words[(row * 5 + j) % words.length]}</span>
                  ))}
                </div>
              ))}
            </div>
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
              <Ink size={r.big.length > 7 ? 190 : 230} color={r.fg || '#fff'} style={{ transform: `scale(${1.25 - 0.25 * sp(t, 4, { damping: 14, stiffness: 200 })})`, textShadow: '0 10px 30px rgba(0,0,0,.18)' }}>{r.big}</Ink>
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
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Pastel f={f + 600} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 18, padding: '0 60px', textAlign: 'center' }}>
        <div style={{ transform: `scale(${sp(f, 4)})`, marginBottom: 30 }}><Mascot f={f} size={220} blink={[60]} /></div>
        <div style={{ fontFamily: UI, fontWeight: 600, fontSize: 30, letterSpacing: 8, color: INK_2, opacity: lerp(f, 12, 20, 0, 1) }}>VOTAGEX · TRIP RECAP</div>
        <Ink size={Math.min(170, 1500 / Math.max(5, graphemes(d.title).length))}><Word f={f} at={16}>{d.title}</Word></Ink>
        <div style={{ fontFamily: UI, fontWeight: 500, fontSize: 42, color: INK_2, opacity: lerp(f, 26, 34, 0, 1) }}>{d.dateFull} · {d.ago}</div>
        <div style={{ marginTop: 40, transform: `scale(${sp(f, 36)})` }}>
          <Pill bg={C.orange} size={42}>
            <span style={{ display: 'flex' }}>{d.crew.slice(0, 4).map((c, i) => <Img key={c.id} src={c.avatar} style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff', marginLeft: i ? -16 : -14, border: '3px solid #fff' }} />)}</span>
            {d.crew.map((c) => c.name).join(' · ')}
          </Pill>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ---------------- the cut ---------------- */

// one shot, reading its own frame (local to its sequence)
function Shot({ d, shot }) {
  const f = useCurrentFrame();
  const { height: H } = useVideoConfig();
  const p = { d, f, dur: shot.dur, H };
  if (shot.key === 'hook') return <Hook {...p} />;
  if (shot.key === 'say') return <Say {...p} />;
  if (shot.key === 'brief') return <Brief {...p} />;
  if (shot.key === 'map') return <RouteMap {...p} />;
  if (shot.key === 'blocks') return <Blocks {...p} />;
  if (shot.key === 'end') return <End {...p} />;
  return <PhotoShot {...p} i={shot.photo} />;
}

export default function RecapFilm(d) {
  const { width, height } = useVideoConfig();
  const shots = shotsFor(d);
  const present = { slide: slide({ direction: 'from-right' }), rise: slide({ direction: 'from-bottom' }), iris: iris({ width, height }) };
  const timing = linearTiming({ durationInFrames: CUT, easing: IN_OUT });
  return (
    <AbsoluteFill style={{ background: '#FBF9FB' }}>
      <TransitionSeries>
        {shots.flatMap((shot) => [
          shot.cut && <TransitionSeries.Transition key={`${shot.key}-cut`} presentation={present[shot.cut]} timing={timing} />,
          <TransitionSeries.Sequence key={shot.key} name={shot.key} durationInFrames={shot.dur} premountFor={shot.key === 'map' ? 90 : 0}>
            <Shot d={d} shot={shot} />
          </TransitionSeries.Sequence>,
        ].filter(Boolean))}
      </TransitionSeries>
    </AbsoluteFill>
  );
}
