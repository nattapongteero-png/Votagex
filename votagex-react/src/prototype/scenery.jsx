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

const BENCH = {
  box: [0, 0, 2800, 1720], // its seat 720 off the ground where one sits (DayScene sits me on it)
  art: (
    <>
      {/* the ironwork in solid ink: posts up the back, legs, armrests; the planks white */}
      <path fill={INK} d="M300 170 h78 l-6 760 h-78 Z M2422 170 h78 l6 760 h-78 Z" />
      <path fill={INK} d="M300 1000 C292 1240 262 1520 214 1720 L330 1720 C360 1520 386 1240 392 1000 Z M2408 1000 C2414 1240 2440 1520 2470 1720 L2586 1720 C2538 1520 2508 1240 2500 1000 Z" />
      <path {...shape} d="M200 230 h2400 a50 50 0 0 1 0 160 h-2400 a50 50 0 0 1 0 -160 Z M200 460 h2400 a50 50 0 0 1 0 160 h-2400 a50 50 0 0 1 0 -160 Z" />
      <path {...line} strokeWidth={46} d="M330 720 C220 720 150 790 140 880 M2470 720 C2580 720 2650 790 2660 880" />
      <path {...shape} d="M140 860 h2520 a50 50 0 0 1 0 150 h-2520 a50 50 0 0 1 0 -150 Z" />
    </>
  ),
};

const BUSH = {
  box: [0, 0, 2400, 1300],
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
