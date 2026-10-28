import { useEffect, useId, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';

// The day scene's weather in the air (DayScene.jsx), as a looping Remotion composition played live, like the
// weather card's sky (WeatherSky.jsx): a pure function of the frame, every cycle a whole number of times per
// loop, so the loop has no seam. Drawn in the scene's own ink, behind the park (a bush or a tree keeps the
// rain off what's behind it): rain in depth (far drops short and faint, landing near the horizon; near ones
// longer and darker, landing by our feet), each ending in a ripple on the land; a flash now and then in a
// storm; fog drifting along the horizon. When we're under a roof (a wet day's sala, indoors) it's only seen
// where the outside shows (`open`, from the place built in 3D: past the sala's posts, through a window), the
// roof's own water running off its eaves; indoors it's further off, so finer. The clouds and what the people
// wear for it (sweat, a scarf) are drawn with the park (scenery.jsx).

const FPS = 30;
const DUR = 240; // 8 s loop
const INK = '#18181B';
const cycle = (frame, cycles, phase = 0) => (phase + (frame / DUR) * cycles) % 1;

// top: the horizon's y, foot: where the land's front is (our feet), in px from the top; open: where the outside
// shows, { shapes, cuts (posts in the way), drips: [[top, foot]] (water off the eaves) }, px; far: only far off
const poly = (pts) => pts.map((p) => p.join(',')).join(' ');
function Rain({ level, storm, top, foot, open, far }) {
  const frame = useCurrentFrame();
  const id = useId();
  const { width: W } = useVideoConfig();
  // (seen only through a window, more of it, a little darker, or there's hardly any in so small a piece of sky)
  const count = ([0, 48, 72, 100, 128][Math.min(4, Math.max(1, level))] + (storm ? 24 : 0)) * (far ? 3 : 1);
  const slant = storm ? 0.32 : 0.18; // wind: px across per px down
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const z = random(`z${i}`) * (far ? 0.4 : 1); // 0 far → 1 near
    const land = top + 6 + z * (foot - top + 18);
    const len = 6 + 16 * z + (far ? 5 : 0);
    const fall = (storm ? 0.7 : 0.9) - 0.4 * z; // seconds to come down, near ones faster
    const n = Math.max(1, Math.round((DUR / FPS) / (fall / 0.8))); // falling 80% of a cycle, the ripple the rest
    const t = cycle(frame, n, random(`p${i}`));
    const x0 = random(`x${i}`) * (W + land * slant) - land * slant;
    const ink = 0.22 + 0.5 * z + (far ? 0.14 : 0);
    if (t < 0.8) {
      const y = -len + (t / 0.8) * (land + len);
      out.push(<line key={i} x1={x0 + slant * (y - len)} y1={y - len} x2={x0 + slant * y} y2={y} stroke={INK} strokeOpacity={ink} strokeWidth={0.6 + 0.9 * z} strokeLinecap="round" />);
    } else if (z > 0.3) {
      const k = (t - 0.8) / 0.2;
      const rx = 2 + (4 + 9 * z) * k;
      out.push(<ellipse key={i} cx={x0 + slant * land} cy={land} rx={rx} ry={rx * 0.3} fill="none" stroke={INK} strokeOpacity={ink * (1 - k)} strokeWidth={0.8 + 0.5 * z} />);
    }
  }
  // water running off the roof's eaves: drops falling from the edge, a ripple where they land, just outside
  const drips = (open?.drips || []).map(([[x, y0], [, y1]], i) => {
    const t = cycle(frame, storm ? 14 : 10, random(`d${i}`));
    const s = Math.min(1.2, Math.max(0.5, (y1 - y0) / 160)); // (smaller further off)
    if (t < 0.75) {
      const y = y0 + (t / 0.75) * (y1 - y0);
      return <line key={`d${i}`} x1={x} y1={y - 5 * s} x2={x} y2={y} stroke={INK} strokeOpacity={0.5} strokeWidth={1.1 * s} strokeLinecap="round" />;
    }
    const k = (t - 0.75) / 0.25;
    return <ellipse key={`d${i}`} cx={x} cy={y1} rx={(2 + 7 * k) * s} ry={(2 + 7 * k) * s * 0.3} fill="none" stroke={INK} strokeOpacity={0.45 * (1 - k)} strokeWidth={s} />;
  });
  // a storm's flashes: two close together, once a loop (under a roof, only where the outside shows)
  const f = frame % DUR;
  const flash = storm ? (f >= 150 && f < 154 ? 0.55 : f >= 160 && f < 163 ? 0.35 : 0) : 0;
  return (
    <>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {open && (
          <defs>
            <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
              {open.shapes.map((pts, i) => <polygon key={i} points={poly(pts)} fill="#fff" />)}
              {open.cuts.map((pts, i) => <polygon key={`c${i}`} points={poly(pts)} fill="#000" />)}
            </mask>
          </defs>
        )}
        <g mask={open ? `url(#${id})` : undefined}>
          {out}
          {flash > 0 && open && <rect width="100%" height="100%" fill="#fff" opacity={flash} />}
        </g>
        {drips}
      </svg>
      {flash > 0 && !open && <AbsoluteFill style={{ background: '#fff', opacity: flash }} />}
    </>
  );
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

function Weather({ kind, level, top, foot, open, far }) {
  const wet = kind === 'rain' || kind === 'storm';
  return (
    <AbsoluteFill>
      {kind === 'fog' && !far && <Fog top={top} />}
      {wet && <Rain level={level || 2} storm={kind === 'storm'} top={top} foot={foot} open={open} far={far} />}
    </AbsoluteFill>
  );
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// the layer, made at its own size (the whole backdrop, header and all) so nothing is scaled; horizon: px over
// our feet; open, far: as Rain's. Still with reduced motion
export default function SceneWeather({ kind, level, horizon, open, far }) {
  const box = useRef(null);
  const [size, setSize] = useState(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const css = getComputedStyle(el);
      // (the ground's --ground over the scene's foot, which the backdrop goes on --below past)
      setSize({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight),
        ground: (parseFloat(css.getPropertyValue('--ground')) || 0) + (parseFloat(css.getPropertyValue('--below')) || 0) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const foot = size ? size.h - size.ground : 0;
  return (
    <div ref={box} className="ds-wx" aria-hidden="true">
      {size?.w > 0 && <Player component={Weather} inputProps={{ kind, level, top: foot - horizon, foot, open, far }} durationInFrames={DUR} fps={FPS}
        compositionWidth={size.w} compositionHeight={size.h} loop autoPlay={!reducedMotion()} initiallyMuted controls={false}
        clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} acknowledgeRemotionLicense
        style={{ width: '100%', height: '100%' }} />}
    </div>
  );
}
