// The day scene's backdrop (DayScene.jsx), drawn as Open Peeps are: one ink line of the same weight, white
// fills, solid ink for the dark parts. Each prop is in the people's own units (a standing person is 3000
// tall, feet on the bottom), so it's sized off --tall like them and stands on the same ground.

const INK = '#18181B';
const LINE = 22; // the people's line weight, in their units

// a hand-drawn bumpy outline round an ellipse (a canopy, a bush, a cloud): n bumps, each a curve bulging
// out between points on it, a little uneven. from/to: the arc to go round (angles, clockwise from 3 o'clock)
const rand = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
function bumpy(cx, cy, rx, ry, n, out, seed, from = 0, to = 2 * Math.PI) {
  const r = rand(seed);
  const at = (a, k = 0) => [Math.round(cx + (rx + k) * Math.cos(a)), Math.round(cy + (ry + k) * Math.sin(a))];
  const angles = Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n + (i % n ? (r() - 0.5) * ((to - from) / n) * 0.4 : 0));
  let d = `M${at(angles[0]).join(' ')}`;
  for (let i = 1; i <= n; i += 1) {
    const a0 = angles[i - 1]; const a1 = angles[i]; const k = out * (0.75 + r() * 0.5);
    d += ` C${at(a0 + (a1 - a0) * 0.1, k * 1.25).join(' ')} ${at(a1 - (a1 - a0) * 0.1, k * 1.25).join(' ')} ${at(a1).join(' ')}`;
  }
  return d;
}
// little "u" marks for leaves inside a canopy or bush
const leaves = (pts) => pts.map(([x, y, w = 110]) => `M${x} ${y} q${w / 2} ${w * 0.55} ${w} 0`).join(' ');

const line = { fill: 'none', stroke: INK, strokeWidth: LINE, strokeLinecap: 'round', strokeLinejoin: 'round' };
const shape = { ...line, fill: '#fff' };

const TREE = {
  box: [0, 0, 2400, 4300],
  art: (
    <>
      {/* trunk, flared at the foot, and two branches going up into the leaves */}
      <path {...shape} d="M960 4300 C1060 4260 1112 4100 1116 3800 C1122 3300 1120 2900 1110 2400 L1300 2400 C1292 2900 1290 3300 1296 3800 C1300 4100 1350 4260 1460 4300" />
      <path {...shape} d="M1116 3080 C1084 2960 1000 2860 846 2760 L916 2680 C1030 2770 1094 2860 1117 2930" />
      <path {...shape} d="M1294 2980 C1336 2870 1420 2790 1570 2716 L1620 2800 C1494 2858 1416 2930 1296 3110" />
      <path {...line} d="M1180 3500 l0 160 M1240 3120 l0 120 M1200 3900 l0 110" />
      <g className="ds-leaves">
        <path {...shape} d={`${bumpy(1200, 1520, 1040, 960, 13, 150, 7)} Z`} />
        <path {...line} d={leaves([[620, 1080], [1380, 820], [1100, 1420], [560, 1820, 130], [1620, 1500], [1300, 2080], [860, 2250, 100], [1780, 1080, 90]])} />
      </g>
    </>
  ),
};

const BENCH = {
  box: [0, 0, 2800, 1600], // its seat 600 off the ground (DayScene sits me on it)
  art: (
    <>
      {/* the ironwork in solid ink: posts up the back, legs, armrests; the planks white */}
      <path fill={INK} d="M300 170 h78 l-6 760 h-78 Z M2422 170 h78 l6 760 h-78 Z" />
      <path fill={INK} d="M300 1000 C292 1200 262 1440 214 1600 L330 1600 C360 1440 386 1200 392 1000 Z M2408 1000 C2414 1200 2440 1440 2470 1600 L2586 1600 C2538 1440 2508 1200 2500 1000 Z" />
      <path {...shape} d="M200 230 h2400 a50 50 0 0 1 0 160 h-2400 a50 50 0 0 1 0 -160 Z M200 460 h2400 a50 50 0 0 1 0 160 h-2400 a50 50 0 0 1 0 -160 Z" />
      <path {...line} strokeWidth={46} d="M330 720 C220 720 150 790 140 880 M2470 720 C2580 720 2650 790 2660 880" />
      <path {...shape} d="M140 860 h2520 a50 50 0 0 1 0 150 h-2520 a50 50 0 0 1 0 -150 Z" />
    </>
  ),
};

const BUSH = {
  box: [0, 0, 1800, 1000],
  art: (
    <>
      <path {...shape} d={bumpy(900, 1000, 840, 800, 7, 120, 3, Math.PI, 2 * Math.PI)} />
      <path {...line} d={leaves([[520, 560], [980, 420], [1240, 700, 100], [700, 820, 90]])} />
    </>
  ),
};

const CLOUD = {
  box: [0, 0, 1700, 700],
  art: <path {...shape} d={`${bumpy(850, 560, 720, 380, 5, 150, 11, Math.PI, 2 * Math.PI)} C1460 640 240 640 130 560 Z`} />,
};

const TUFT = {
  box: [0, 0, 220, 170],
  art: <path {...line} d="M70 170 Q60 100 22 52 M110 170 Q108 80 116 16 M150 170 Q160 104 196 66" />,
};

const BIRDS = {
  box: [0, 0, 700, 300],
  art: <path {...line} d="M20 120 Q70 70 130 124 Q190 70 240 120 M420 230 Q460 194 506 234 Q552 194 592 230" />,
};

// a signpost, two blank boards pointing different ways
const SIGN = {
  box: [0, 0, 1400, 3400],
  art: (
    <>
      <path {...shape} d="M640 3400 L654 500 L756 500 L770 3400" />
      <path {...shape} d="M180 700 H1060 L1260 880 L1060 1060 H180 Z" />
      <path {...shape} d="M1220 1300 H340 L140 1480 L340 1660 H1220 Z" />
      <path {...line} d="M330 880 H800 M420 1480 H960" />
    </>
  ),
};

const PROPS = { tree: TREE, bench: BENCH, bush: BUSH, cloud: CLOUD, tuft: TUFT, birds: BIRDS, sign: SIGN };

// one prop at --x (its centre); `size` scales it from a person's size (far off, say)
export function Prop({ kind, x, size = 1, className = '', style }) {
  const { box: [bx, by, w, h], art } = PROPS[kind];
  return (
    <svg className={`ds-prop ds-${kind} ${className}`} viewBox={`${bx} ${by} ${w} ${h}`} aria-hidden="true"
      style={{ '--x': x, height: `calc(var(--tall) * ${(h * size) / 3000})`, aspectRatio: `${w} / ${h}`, ...style }}>
      {art}
    </svg>
  );
}

// far off behind it all: low hills, in a fainter line
export function Hills() {
  return (
    <svg className="ds-hills" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
      <path fill="none" stroke={INK} strokeLinecap="round" vectorEffect="non-scaling-stroke"
        d="M-10 52 C80 50 140 22 250 24 C340 26 380 46 470 44 C560 42 600 12 720 14 C820 16 870 48 1010 46" />
    </svg>
  );
}

// the ground: one long line, broken here and there as a pen would leave it
export function Ground() {
  return (
    <svg className="ds-ground" viewBox="0 0 1000 20" preserveAspectRatio="none" aria-hidden="true">
      <path fill="none" stroke={INK} strokeLinecap="round" vectorEffect="non-scaling-stroke"
        d="M-10 10 C120 9 230 11 352 10 M378 10 C520 11 640 9 742 10 M766 10 C860 11 930 9 1010 10" />
    </svg>
  );
}
