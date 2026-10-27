import { useEffect, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';

// The day scene's weather in the air (DayScene.jsx), as a looping Remotion composition played live, like the
// weather card's sky (WeatherSky.jsx): a pure function of the frame, every cycle a whole number of times per
// loop, so the loop has no seam. Drawn in the scene's own ink, behind the park (a bush or a tree keeps the
// rain off what's behind it): rain in depth (far drops short and faint, landing near the horizon; near ones
// longer and darker, landing by our feet), each ending in a ripple on the land, none under a wet day's
// shelter (they end on its roof) and water running off the roof's front edge; a flash now and then in a
// storm; heat rising off the land on a hot day; fog drifting along the horizon. The sun, the clouds and what
// the people do about it (sweat, breath) are drawn with the park (scenery.jsx).

const FPS = 30;
const DUR = 240; // 8 s loop
const INK = '#18181B';
const cycle = (frame, cycles, phase = 0) => (phase + (frame / DUR) * cycles) % 1;

// top: the horizon's y, foot: where the land's front is (our feet), in px from the top; cover: a shelter's
// { x0, x1, roof, edge, back } in px (its roof's top and front edge, the ground at its back wall)
function Rain({ level, storm, top, foot, cover }) {
  const frame = useCurrentFrame();
  const { width: W } = useVideoConfig();
  const count = [0, 48, 72, 100, 128][Math.min(4, Math.max(1, level))] + (storm ? 24 : 0);
  const slant = storm ? 0.32 : 0.18; // wind: px across per px down
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const z = random(`z${i}`); // 0 far → 1 near
    let land = top + 6 + z * (foot - top + 18);
    const len = 6 + 16 * z;
    const fall = (storm ? 0.7 : 0.9) - 0.4 * z; // seconds to come down, near ones faster
    const n = Math.max(1, Math.round((DUR / FPS) / (fall / 0.8))); // falling 80% of a cycle, the ripple the rest
    const t = cycle(frame, n, random(`p${i}`));
    const x0 = random(`x${i}`) * (W + land * slant) - land * slant;
    // under the shelter it's dry: a drop that would land there ends on the roof (out of sight behind it)
    const under = cover && x0 + slant * land > cover.x0 && x0 + slant * land < cover.x1 && land > cover.back;
    if (under) land = cover.roof;
    const ink = 0.22 + 0.5 * z;
    if (t < 0.8) {
      const y = -len + (t / 0.8) * (land + len);
      out.push(<line key={i} x1={x0 + slant * (y - len)} y1={y - len} x2={x0 + slant * y} y2={y} stroke={INK} strokeOpacity={ink} strokeWidth={0.6 + 0.9 * z} strokeLinecap="round" />);
    } else if (z > 0.3 && !under) {
      const k = (t - 0.8) / 0.2;
      const rx = 2 + (4 + 9 * z) * k;
      out.push(<ellipse key={i} cx={x0 + slant * land} cy={land} rx={rx} ry={rx * 0.3} fill="none" stroke={INK} strokeOpacity={ink * (1 - k)} strokeWidth={0.8 + 0.5 * z} />);
    }
  }
  // water running off the shelter's roof: drops falling from its front edge, a ripple where they land
  if (cover) {
    for (let i = 0; i < 7; i += 1) {
      const x = cover.x0 + ((i + 0.5) / 7) * (cover.x1 - cover.x0) + (random(`dx${i}`) - 0.5) * 10;
      const t = cycle(frame, storm ? 14 : 10, random(`d${i}`));
      if (t < 0.75) {
        const y = cover.edge + (t / 0.75) * (foot + 4 - cover.edge);
        out.push(<line key={`d${i}`} x1={x} y1={y - 5} x2={x} y2={y} stroke={INK} strokeOpacity={0.55} strokeWidth={1.2} strokeLinecap="round" />);
      } else {
        const k = (t - 0.75) / 0.25;
        out.push(<ellipse key={`d${i}`} cx={x} cy={foot + 4} rx={2 + 8 * k} ry={(2 + 8 * k) * 0.3} fill="none" stroke={INK} strokeOpacity={0.5 * (1 - k)} strokeWidth={1} />);
      }
    }
  }
  // a storm's flashes: two close together, once a loop
  const f = frame % DUR;
  const flash = storm ? (f >= 150 && f < 154 ? 0.55 : f >= 160 && f < 163 ? 0.35 : 0) : 0;
  return (
    <>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>{out}</svg>
      {flash > 0 && <AbsoluteFill style={{ background: '#fff', opacity: flash }} />}
    </>
  );
}

// a hot day: wavy lines of heat rising off the land and fading
function Heat({ top, foot }) {
  const frame = useCurrentFrame();
  const { width: W } = useVideoConfig();
  const out = [];
  for (let i = 0; i < 9; i += 1) {
    const t = cycle(frame, 4, random(`h${i}`));
    const x = (0.06 + 0.88 * random(`hx${i}`)) * W;
    const base = top + 24 + random(`hy${i}`) * (foot - top - 30);
    const y0 = base - t * 36;
    const op = Math.sin(t * Math.PI) * 0.35;
    let d = '';
    for (let s = 0; s <= 6; s += 1) {
      const yy = y0 - s * 4;
      d += `${s ? 'L' : 'M'}${(x + Math.sin(s * 1.3 + t * 9) * 2.4).toFixed(1)} ${yy.toFixed(1)} `;
    }
    out.push(<path key={i} d={d} fill="none" stroke={INK} strokeOpacity={op} strokeWidth={1} strokeLinecap="round" />);
  }
  return <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>{out}</svg>;
}

// fog: soft bands drifting to and fro along the horizon
function Fog({ top }) {
  const frame = useCurrentFrame();
  const { width: W } = useVideoConfig();
  return [0, 1, 2].map((i) => {
    const dx = Math.sin(cycle(frame, 1, i / 3) * Math.PI * 2) * 26;
    return (
      <div key={i} style={{ position: 'absolute', left: -0.2 * W + dx * (i % 2 ? -1 : 1), width: 1.4 * W, top: top - 26 + i * 30, height: 70,
        background: 'radial-gradient(closest-side, rgba(255,255,255,.75), rgba(255,255,255,0))' }} />
    );
  });
}

function Weather({ kind, level, hot, top, foot, cover }) {
  const wet = kind === 'rain' || kind === 'storm';
  return (
    <AbsoluteFill>
      {kind === 'fog' && <Fog top={top} />}
      {hot && <Heat top={top} foot={foot} />}
      {wet && <Rain level={level || 2} storm={kind === 'storm'} top={top} foot={foot} cover={cover} />}
    </AbsoluteFill>
  );
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// the layer, made at its own size (the whole backdrop, header and all) so nothing is scaled; horizon: px over
// our feet; shelter: { at: its centre (0–1 across), w, h: its size in people's units }. Still with reduced motion
export default function SceneWeather({ kind, level, hot, horizon, shelter }) {
  const box = useRef(null);
  const [size, setSize] = useState(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const css = getComputedStyle(el);
      setSize({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight),
        ground: parseFloat(css.getPropertyValue('--ground')) || 0, tall: parseFloat(css.getPropertyValue('--tall')) || 196 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const foot = size ? size.h - size.ground : 0;
  // the shelter in px (its roof's slab is 60–250 down its 3800, the back wall's ground 420 up from the front's)
  const u = (size?.tall || 196) / 3000;
  const cover = size && shelter ? {
    x0: size.w * shelter.at - (shelter.w / 2 - 100) * u, x1: size.w * shelter.at + (shelter.w / 2 - 100) * u,
    roof: foot - (shelter.h - 60) * u, edge: foot - (shelter.h - 250) * u, back: foot - 420 * u,
  } : null;
  return (
    <div ref={box} className="ds-wx" aria-hidden="true">
      {size?.w > 0 && <Player component={Weather} inputProps={{ kind, level, hot, top: foot - horizon, foot, cover }} durationInFrames={DUR} fps={FPS}
        compositionWidth={size.w} compositionHeight={size.h} loop autoPlay={!reducedMotion()} initiallyMuted controls={false}
        clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} acknowledgeRemotionLicense
        style={{ width: '100%', height: '100%' }} />}
    </div>
  );
}
