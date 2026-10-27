// The day scene's backdrop (DayScene.jsx), drawn as Open Peeps are: one line of the same weight, white
// fills, solid for the dark parts, at life size beside them (a standing person is 3000 tall in their units,
// about 1.75 m: the tree is some 4.5 m, the lamp 3.7 m, the bench's seat 50 cm up), feet on the bottom, so
// it's sized off --tall like the people and stands on the same ground. It's drawn in currentColor, set
// lighter than the people (CSS) so they stand out in front of it.

const INK = 'currentColor';
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

// a tree as tall as two and a half people: the trunk up past our heads, the leaves in three clumps
const TREE = {
  box: [0, 0, 5600, 7800],
  shadow: 0.36,
  art: (
    <>
      <path {...shape} d="M2380 7800 C2560 7740 2640 7520 2660 7200 C2690 6400 2700 5200 2690 4300 L2700 3500 L3000 3500 C2990 4300 3000 5200 3030 6400 C3050 7200 3140 7740 3330 7800" />
      <path {...shape} d="M2700 4300 C2560 3950 2350 3700 2050 3450 L2150 3360 C2420 3580 2620 3800 2720 4020" />
      <path {...shape} d="M2990 4150 C3150 3880 3380 3660 3700 3480 L3760 3580 C3480 3740 3260 3930 3000 4380" />
      <path {...line} d="M2800 6500 l0 260 M2900 5600 l0 200 M2780 4800 l0 180 M2860 7300 l0 160" />
      <g className="ds-leaves">
        <path {...shape} d={`${bumpy(1900, 1700, 1400, 1150, 16, 200, 5)} Z`} />
        <path {...shape} d={`${bumpy(3800, 1500, 1350, 1100, 15, 200, 9)} Z`} />
        <path {...shape} d={`${bumpy(2850, 2800, 2000, 950, 20, 210, 13)} Z`} />
        <path {...line} d={leaves([[1200, 1100, 170], [1900, 760, 170], [2300, 1500, 150], [1000, 1800, 160], [3400, 900, 170], [4300, 1200, 160],
          [3900, 1800, 150], [1500, 2700, 170], [2400, 3100, 160], [3300, 2550, 170], [4200, 2900, 150], [2800, 2300, 140]])} />
      </g>
    </>
  ),
};

// a street lamp, a lantern on a post (3.7 m)
const LAMP = {
  box: [0, 0, 1200, 6400],
  art: (
    <>
      <path {...shape} d="M420 6400 L470 5900 L730 5900 L780 6400" />
      <path {...shape} d="M548 5900 L560 1500 L640 1500 L652 5900" />
      <path fill={INK} d="M490 1520 h220 v-150 h-220 Z M330 770 L600 520 L870 770 Z" />
      <path {...shape} d="M440 1370 L390 770 L810 770 L760 1370 Z" />
      <path {...line} d="M600 800 L600 1340 M600 520 L600 400" />
      <circle cx="600" cy="370" r="45" fill={INK} />
    </>
  ),
};

// a park bench seen as the people are, from eye height: the seat's top shows, the back legs stand further
// back (higher up) than the front ones. Its seat's middle is 960 off the front ground (DayScene sits me there)
const BENCH = {
  box: [0, 0, 2800, 1760],
  shadow: 0.95,
  art: (
    <>
      {/* the ironwork in solid ink (back legs and posts, then the front legs), the planks white */}
      <path fill={INK} d="M318 700 h70 l-8 860 h-62 Z M2412 700 h70 l0 860 h-62 Z" />
      <path fill={INK} d="M300 80 h78 l-6 640 h-78 Z M2422 80 h78 l6 640 h-78 Z" />
      <path {...shape} d="M200 140 h2400 a50 50 0 0 1 0 160 h-2400 a50 50 0 0 1 0 -160 Z M200 360 h2400 a50 50 0 0 1 0 160 h-2400 a50 50 0 0 1 0 -160 Z" />
      <path {...shape} d="M190 700 h2420 a50 50 0 0 1 50 50 v150 h-2520 v-150 a50 50 0 0 1 50 -50 Z" />
      <path {...line} d="M150 766 H2650 M146 833 H2654" />
      <path {...shape} d="M140 900 h2520 v40 a40 40 0 0 1 -40 40 h-2440 a40 40 0 0 1 -40 -40 Z" />
      <path fill={INK} d="M300 980 C292 1240 262 1560 214 1760 L330 1760 C360 1560 386 1240 392 980 Z M2408 980 C2414 1240 2440 1560 2470 1760 L2586 1760 C2538 1560 2508 1240 2500 980 Z" />
    </>
  ),
};

const BUSH = {
  box: [0, 0, 2400, 1300],
  shadow: 0.9,
  art: (
    <>
      <path {...shape} d={bumpy(1200, 1300, 1110, 1060, 9, 150, 3, Math.PI, 2 * Math.PI)} />
      <path {...line} d={leaves([[620, 700, 150], [1250, 480, 150], [1650, 860, 140], [960, 1040, 130]])} />
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
  shadow: 0.34,
  art: (
    <>
      <path {...shape} d="M640 3400 L654 500 L756 500 L770 3400" />
      <path {...shape} d="M180 700 H1060 L1260 880 L1060 1060 H180 Z" />
      <path {...shape} d="M1220 1300 H340 L140 1480 L340 1660 H1220 Z" />
      <path {...line} d="M330 880 H800 M420 1480 H960" />
    </>
  ),
};

const PROPS = { tree: TREE, lamp: LAMP, bench: BENCH, bush: BUSH, cloud: CLOUD, tuft: TUFT, birds: BIRDS, sign: SIGN };

// one prop at --x (its centre), standing `d` px further back than the front of the ground (higher up the
// page); `size` scales it from life size (DayScene works out how much smaller further back makes it). Things
// on the ground cast a soft shadow there, as the people do (not things far off, nor in the sky)
export function Prop({ kind, x, d = 0, size = 1, className = '', style }) {
  const { box: [bx, by, w, h], art, shadow } = PROPS[kind];
  const width = `calc(var(--tall) * ${(w * size) / 3000})`;
  return (
    <>
      {shadow && d < 100 && <i className="ds-prop-shadow" style={{ '--x': x, '--d': `${d}px`, width: `calc(${width} * ${shadow})` }} />}
      <svg className={`ds-prop ds-${kind} ${className}`} viewBox={`${bx} ${by} ${w} ${h}`} aria-hidden="true"
        style={{ '--x': x, '--d': `${d}px`, height: `calc(var(--tall) * ${(h * size) / 3000})`, aspectRatio: `${w} / ${h}`, ...style }}>
        {art}
      </svg>
    </>
  );
}

// far off, on the horizon (at our eye level): low hills, in a fainter line
export function Hills() {
  return (
    <svg className="ds-hills" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
      <path fill="none" stroke={INK} strokeLinecap="round" vectorEffect="non-scaling-stroke"
        d="M-10 60 C80 58 140 26 250 28 C340 30 380 52 470 50 C560 48 600 14 720 16 C820 18 870 56 1010 54" />
    </svg>
  );
}

// the ground: a footpath along the front that we stand on, its near edge and, out at the sides only (never
// a line behind our legs), its far one with the lawn beyond; broken here and there as a pen would leave it
export function Ground() {
  return (
    <svg className="ds-ground" viewBox="0 0 1000 32" preserveAspectRatio="none" aria-hidden="true">
      <path fill="none" stroke={INK} strokeLinecap="round" vectorEffect="non-scaling-stroke"
        d="M-10 31 C120 30 230 31.5 352 31 M378 31 C520 31.5 640 30 742 31 M766 31 C860 31.5 930 30 1010 31" />
      <path className="ds-path-far" fill="none" stroke={INK} strokeLinecap="round" vectorEffect="non-scaling-stroke"
        d="M-10 1 C50 1.4 110 0.6 170 1 M850 1 C910 1.4 960 0.6 1010 1" />
    </svg>
  );
}
