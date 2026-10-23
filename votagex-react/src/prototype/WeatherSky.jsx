import { useEffect, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, Img, random, useCurrentFrame, useVideoConfig } from 'remotion';

// The moving sky inside the weather card, as a looping Remotion composition (played live with @remotion/player).
// Everything is a function of the frame and repeats a whole number of times per loop, so the loop has no seam:
// layered drifting clouds, rain in three depths, snow, lightning, stars.
// kind: 'sun' | 'partly' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm'; level: how hard it rains (0–4); night: stars

const FPS = 60;
const DUR = 1200; // 20 s loop
const CLOUD = '/assets/weather/cloud.png'; // Fluent Emoji 3D (MIT)
const TAU = Math.PI * 2;
// 0..1 position along a cycle that runs `cycles` whole times per loop
const cycle = (frame, cycles, phase = 0) => (phase + (frame / DUR) * cycles) % 1;

function Clouds({ dense }) {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  // far → near: smaller, fainter, softer and slower the further away
  const layers = [
    { w: 64, y: 6, op: 0.32, blur: 2, cycles: 1, phase: 0.15 },
    { w: 84, y: 30, op: 0.42, blur: 1.2, cycles: 1, phase: 0.62 },
    { w: 120, y: 62, op: dense ? 0.6 : 0.5, blur: 0.4, cycles: 2, phase: 0.35 },
    ...(dense ? [{ w: 150, y: 74, op: 0.55, blur: 0, cycles: 2, phase: 0.85 }] : []),
  ];
  return layers.map((l, i) => {
    const x = -l.w + cycle(frame, l.cycles, l.phase) * (W + l.w);
    const bob = Math.sin(TAU * cycle(frame, 3, i * 0.3)) * 1.5;
    return <Img key={i} src={CLOUD} style={{ position: 'absolute', left: x, top: l.y + bob, width: l.w, opacity: l.op, filter: `blur(${l.blur}px)` }} />;
  });
}

const RAIN_LAYERS = [ // far, middle, near
  { share: 0.4, len: [9, 13], w: 1, op: 0.22, cycles: [7, 9] },
  { share: 0.35, len: [15, 21], w: 1.2, op: 0.4, cycles: [10, 12] },
  { share: 0.25, len: [24, 32], w: 1.6, op: 0.62, cycles: [14, 17] },
];
// by rain level (1 light … 4 very heavy): how many drops, how fast and long they are, how strong, how slanted
const RAIN_LEVELS = {
  1: { n: 26, speed: 0.75, len: 0.7, op: 0.75, slant: 0.12 },
  2: { n: 60, speed: 1, len: 1, op: 1, slant: 0.2 },
  3: { n: 115, speed: 1.3, len: 1.3, op: 1.1, slant: 0.28 },
  4: { n: 170, speed: 1.5, len: 1.5, op: 1.2, slant: 0.34 },
};

function Rain({ level }) {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const k = RAIN_LEVELS[Math.min(4, Math.max(1, level))];
  const SLANT = k.slant; // drift sideways per px of fall
  const drops = [];
  RAIN_LAYERS.forEach((l, li) => {
    const n = Math.round(k.n * l.share);
    for (let j = 0; j < n; j++) {
      const r = (q) => random(`rain-${li}-${j}-${q}`);
      const len = (l.len[0] + r('len') * (l.len[1] - l.len[0])) * k.len;
      // whole cycles per loop keep the loop seamless, so faster rain = more cycles
      const cycles = Math.max(1, Math.round((l.cycles[0] + Math.floor(r('cyc') * (l.cycles[1] - l.cycles[0] + 1))) * k.speed));
      const p = cycle(frame, cycles, r('phase'));
      const fall = H + len + 10;
      const y = -len + p * fall;
      const x = r('x') * (W + 60) - y * SLANT;
      drops.push(
        <div key={`d${li}-${j}`} style={{
          position: 'absolute', left: x, top: y, width: l.w, height: len, borderRadius: l.w,
          background: `linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,${Math.min(0.85, l.op * k.op)}))`,
          transform: `rotate(${Math.atan(SLANT) * (180 / Math.PI)}deg)`,
        }} />,
      );
    }
  });
  return drops;
}

function Snow() {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  return Array.from({ length: 36 }, (_, j) => {
    const r = (k) => random(`snow-${j}-${k}`);
    const size = 2 + r('s') * 3;
    const p = cycle(frame, 2 + Math.floor(r('c') * 2), r('p'));
    const y = -6 + p * (H + 12);
    const x = r('x') * W + Math.sin(TAU * cycle(frame, 4, r('w'))) * 8;
    return <div key={j} style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: '#fff', opacity: 0.55 + r('o') * 0.4, filter: size < 3 ? 'blur(.6px)' : undefined }} />;
  });
}

// two flashes per loop, each a double flicker; the bolt shows on the first flicker
const FLASHES = [[310, 0.42], [920, 0.6]];
function Lightning() {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  let glow = 0, bolt = null;
  FLASHES.forEach(([at, x]) => {
    const t = frame - at;
    if (t >= 0 && t < 26) {
      glow = Math.max(glow, t < 4 ? 0.55 : t < 9 ? 0.1 : t < 13 ? 0.35 : Math.max(0, 0.35 - (t - 13) * 0.03));
      if (t < 8) bolt = x;
    }
  });
  return (
    <>
      <AbsoluteFill style={{ background: '#fff', opacity: glow }} />
      {bolt != null && (
        <svg width="40" height="90" viewBox="0 0 40 90" style={{ position: 'absolute', left: bolt * W, top: 0, filter: 'drop-shadow(0 0 6px rgba(255,255,255,.9))' }}>
          <path d="M22 0 10 38h10L6 90 32 30H21L30 0Z" fill="rgba(255,255,255,.92)" />
        </svg>
      )}
    </>
  );
}

function Stars() {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  return Array.from({ length: 22 }, (_, j) => {
    const r = (k) => random(`star-${j}-${k}`);
    const tw = 0.5 + 0.5 * Math.sin(TAU * cycle(frame, 2 + Math.floor(r('c') * 4), r('p')));
    const size = 1 + r('s') * 1.6;
    return <div key={j} style={{ position: 'absolute', left: r('x') * W, top: r('y') * H * 0.9, width: size, height: size, borderRadius: '50%', background: '#fff', opacity: 0.3 + tw * 0.7, boxShadow: size > 2 ? '0 0 4px #fff' : undefined }} />;
  });
}

function Haze() {
  const frame = useCurrentFrame();
  const x = Math.sin(TAU * cycle(frame, 1)) * 30;
  return <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 25%, rgba(255,255,255,.4) 75%, rgba(255,255,255,.55))', transform: `translateX(${x}px) scaleX(1.3)` }} />;
}

function Sky({ kind, level, night }) {
  const wet = kind === 'rain' || kind === 'storm';
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {night && <Stars />}
      {kind !== 'sun' && <Clouds dense={kind === 'cloud' || wet || kind === 'fog'} />}
      {kind === 'fog' && <Haze />}
      {wet && <Rain level={kind === 'storm' ? Math.max(3, level) : Math.max(1, level)} />}
      {kind === 'snow' && <Snow />}
      {kind === 'storm' && <Lightning />}
    </AbsoluteFill>
  );
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function WeatherSky({ kind, level = 0, night = false }) {
  const player = useRef(null);
  const box = useRef(null);
  // the composition is made at the card's own size, so nothing is scaled or letterboxed
  const [size, setSize] = useState(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setSize({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // play only while the card is on screen (and not at all for reduced motion). The player mounts after the
  // first size measure, so (re)apply whenever it may have appeared, not just when visibility changes.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    if (visible && !reducedMotion()) p.play();
    else p.pause();
  }, [visible, size]);
  return (
    <div ref={box} className="pt-wxsky" aria-hidden="true">
      {size?.w > 0 && <Player ref={player} component={Sky} inputProps={{ kind, level, night }} durationInFrames={DUR} fps={FPS}
        compositionWidth={size.w} compositionHeight={size.h} loop initiallyMuted controls={false}
        clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} acknowledgeRemotionLicense
        style={{ width: '100%', height: '100%' }} />}
    </div>
  );
}
