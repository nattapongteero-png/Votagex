// The day scene's backdrop (DayScene.jsx), drawn as Open Peeps are: one line of the same weight, white
// fills, solid for the dark parts, at life size beside them (a standing person is 3000 tall in their units,
// about 1.75 m: the tree is some 4.5 m, the lamp 3.7 m, the bench's seat 50 cm up), feet on the bottom, so
// it's sized off --tall like the people and stands on the same ground. It's drawn in currentColor, the
// people's ink (CSS), all standing level with the people on the land (Land); no soft shadows, which made
// everything look as if it floated.

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
      {/* where it meets the land, seen a little from above: the foot curves round towards us */}
      <path {...line} d="M2380 7800 Q2850 7880 3330 7800" />
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

// the same tree in the cold, its leaves mostly gone: the trunk and branches show, reaching up to a few small
// clumps left at their tips, bare twigs between
const BARE_TREE = {
  box: TREE.box,
  art: (
    <>
      <path {...shape} d="M2380 7800 C2560 7740 2640 7520 2660 7200 C2690 6400 2700 5200 2690 4300 C2690 3500 2760 2700 2800 2050 L2890 2050 C2930 2700 2990 3500 2990 4300 C3000 5200 3010 5800 3030 6400 C3050 7200 3140 7740 3330 7800" />
      <path {...shape} d="M2700 4300 C2500 3900 2150 3600 1900 3200 C1780 3000 1700 2800 1640 2600 L1740 2575 C1800 2780 1880 2980 1990 3150 C2250 3550 2600 3800 2720 4020" />
      <path {...shape} d="M2990 4150 C3200 3800 3550 3550 3800 3250 C3950 3060 4050 2850 4120 2650 L4220 2690 C4150 2900 4040 3130 3890 3320 C3640 3640 3300 3900 3000 4380" />
      <path {...line} d="M1820 3060 C1700 2960 1580 2900 1440 2860 M3960 3060 C4100 3000 4230 2950 4380 2880 M2780 2700 C2680 2560 2580 2470 2460 2390 M2900 2500 C3000 2380 3100 2300 3230 2230" />
      <path {...line} d="M2800 6500 l0 260 M2900 5600 l0 200 M2780 4800 l0 180 M2860 7300 l0 160" />
      <path {...line} d="M2380 7800 Q2850 7880 3330 7800" />
      <g className="ds-leaves">
        <path {...shape} d={`${bumpy(1650, 2330, 500, 380, 10, 140, 5)} Z`} />
        <path {...shape} d={`${bumpy(4190, 2400, 470, 360, 10, 140, 9)} Z`} />
        <path {...shape} d={`${bumpy(2845, 1780, 620, 440, 12, 150, 13)} Z`} />
        <path {...line} d={leaves([[1450, 2260, 140], [1780, 2420, 130], [4050, 2330, 130], [2650, 1700, 140], [3000, 1880, 130]])} />
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
  art: (
    <>
      <path {...shape} d={`${bumpy(1200, 1300, 1110, 1060, 9, 150, 3, Math.PI, 2 * Math.PI)} Q1200 1390 90 1300 Z`} />
      <path {...line} d={leaves([[620, 700, 150], [1250, 480, 150], [1650, 860, 140], [960, 1040, 130]])} />
    </>
  ),
};

// a cloud, its underside shaded grey (deeper on a dull day, CSS)
const CLOUD = {
  box: [0, 0, 1700, 700],
  art: (
    <>
      <defs>
        <linearGradient id="ds-cloud-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" className="ds-cloud-top" /><stop offset="1" className="ds-cloud-under" />
        </linearGradient>
      </defs>
      <path {...line} fill="url(#ds-cloud-shade)" d={`${bumpy(850, 560, 720, 380, 5, 150, 11, Math.PI, 2 * Math.PI)} C1460 640 240 640 130 560 Z`} />
    </>
  ),
};

const TUFT = {
  box: [0, 0, 220, 170],
  art: <path {...line} d="M70 170 Q60 100 22 52 M110 170 Q108 80 116 16 M150 170 Q160 104 196 66" />,
};

// two birds, their wings beating (CSS)
const BIRDS = {
  box: [0, 0, 700, 300],
  art: (
    <>
      <path {...line} className="ds-wing" d="M20 120 Q70 70 130 124 Q190 70 240 120" />
      <path {...line} className="ds-wing ds-wing-2" d="M420 230 Q460 194 506 234 Q552 194 592 230" />
    </>
  ),
};

// a butterfly, wings opening and closing (CSS)
const BUTTERFLY = {
  box: [0, 0, 400, 300],
  art: (
    <>
      <g className="ds-flutter">
        <path {...shape} strokeWidth={16} d="M200 150 C140 30 30 40 50 120 C60 170 130 170 200 150 Z M200 160 C150 190 90 250 120 270 C160 290 190 220 200 160 Z" />
        <path {...shape} strokeWidth={16} d="M200 150 C260 30 370 40 350 120 C340 170 270 170 200 150 Z M200 160 C250 190 310 250 280 270 C240 290 210 220 200 160 Z" />
      </g>
      <path {...line} strokeWidth={18} d="M200 110 L200 230 M200 110 Q185 70 165 60 M200 110 Q215 70 235 60" />
    </>
  ),
};

// a leaf, blown on the wind or falling (CSS)
const LEAF = {
  box: [0, 0, 300, 180],
  art: <path {...shape} strokeWidth={16} d="M20 90 C80 10 220 10 280 90 C220 170 80 170 20 90 Z M20 90 L250 90" />,
};

// the sun, glowing, its rays turning slowly
const SUN = {
  box: [0, 0, 1600, 1600],
  art: (
    <>
      <defs>
        <radialGradient id="ds-sun-glow"><stop offset="0.3" className="ds-glow-in" /><stop offset="1" className="ds-glow-out" /></radialGradient>
      </defs>
      <circle className="ds-glow" cx="800" cy="800" r="800" fill="url(#ds-sun-glow)" />
      <g className="ds-rays">
        <path {...line} strokeWidth={30} d={Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * 2 * Math.PI; const r0 = i % 2 ? 500 : 470; const r1 = i % 2 ? 610 : 660;
          return `M${Math.round(800 + r0 * Math.cos(a))} ${Math.round(800 + r0 * Math.sin(a))} L${Math.round(800 + r1 * Math.cos(a))} ${Math.round(800 + r1 * Math.sin(a))}`;
        }).join(' ')} />
      </g>
      <circle {...line} className="ds-disc" strokeWidth={30} cx="800" cy="800" r="360" />
    </>
  ),
};

// a signpost, two blank boards pointing different ways
const SIGN = {
  box: [0, 0, 1400, 3400],
  art: (
    <>
      <path {...shape} d="M640 3400 L654 500 L756 500 L770 3400 Q705 3430 640 3400 Z" />
      <path {...shape} d="M180 700 H1060 L1260 880 L1060 1060 H180 Z" />
      <path {...shape} d="M1220 1300 H340 L140 1480 L340 1660 H1220 Z" />
      <path {...line} d="M330 880 H800 M420 1480 H960" />
    </>
  ),
};

// a shelter from the rain, as at a bus stop: a flat roof on thin posts, a glass wall at the back, seen as the
// bench is (the back posts stand further back, higher up); the roof 2.2 m up, `w` across (4600, about 2.6 m).
// The rain keeps off under it (SceneWeather.jsx knows its size from DayScene)
const shelter = (w) => ({
  box: [0, 0, w, 3800],
  art: (
    <>
      <path fill={INK} d={`M520 300 h70 v3080 h-70 Z M${w - 590} 300 h70 v3080 h-70 Z`} />
      <path {...line} strokeWidth={18} d={`M590 760 H${w - 590} V3260 H590 Z`} />
      <path {...line} strokeWidth={16} d={`M900 1500 L1500 900 M1100 1800 L2000 900 M${w - 1500} 3000 L${w - 900} 2400`} />
      <path {...shape} d={`M140 210 H${w - 140} L${w - 220} 320 H220 Z`} />
      <path {...shape} d={`M40 60 h${w - 80} a40 40 0 0 1 40 40 v110 a40 40 0 0 1 -40 40 h${80 - w} a40 40 0 0 1 -40 -40 v-110 a40 40 0 0 1 40 -40 Z`} />
      <path fill={INK} d={`M250 250 h96 l8 3550 h-112 Z M${w - 346} 250 h96 l8 3550 h-112 Z`} />
    </>
  ),
});

const PROPS = { shelter: shelter(4600), butterfly: BUTTERFLY, leaf: LEAF, sun: SUN, tree: TREE, bareTree: BARE_TREE, lamp: LAMP, bench: BENCH, bush: BUSH, cloud: CLOUD, tuft: TUFT, birds: BIRDS, sign: SIGN };

// one prop at --x (its centre), feet on the ground line; `size` scales it from life size
export function Prop({ kind, x, size = 1, className = '', style }) {
  const { box: [bx, by, w, h], art } = PROPS[kind];
  return (
    <svg className={`ds-prop ds-${kind} ${className}`} viewBox={`${bx} ${by} ${w} ${h}`} aria-hidden="true"
      style={{ '--x': x, height: `calc(var(--tall) * ${(h * size) / 3000})`, aspectRatio: `${w} / ${h}`, ...style }}>
      {art}
    </svg>
  );
}

// the ground, as the people stand on it: not a line seen edge on but the land itself, seen from our eye height,
// a light tint running from the horizon (low hills along it) down past our feet, so both feet stand in it
// wherever the pose puts them. The hills' line is the only line it has
export function Land() {
  return (
    <>
      <div className="ds-land" />
      <svg className="ds-hills" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
        <path className="ds-land-fill" d="M-10 61 L-10 60 C80 58 140 26 250 28 C340 30 380 52 470 50 C560 48 600 14 720 16 C820 18 870 56 1010 54 L1010 61 Z" />
        <path fill="none" stroke={INK} strokeLinecap="round" vectorEffect="non-scaling-stroke"
          d="M-10 60 C80 58 140 26 250 28 C340 30 380 52 470 50 C560 48 600 14 720 16 C820 18 870 56 1010 54" />
      </svg>
    </>
  );
}

// What the people have about them for the weather, drawn in a person's own units over their pose. The head is
// always at the same place on a pose (peeps.js HEAD_AT: the face 440–620 across, 210–400 down, the chin about
// 480, the neck under it 370–590 across, down to the collar at about 530), so they sit right on any of them.
// beads of sweat by the face, small, just off the cheek in front of it, running a little way down: on the face
// they'd land on glasses, a hijab, a turban, a cap or a fringe, and under the eye they'd read as tears
export function Sweat() {
  const drop = 'M0 -60 C22 -20 38 6 38 26 A38 38 0 0 1 -38 26 C-38 6 -22 -20 0 -60 Z';
  return (
    <g className="ds-sweat">
      <path {...shape} strokeWidth={14} transform="translate(684 324) scale(.42)" d={drop} />
      <path {...shape} strokeWidth={14} transform="translate(700 394) scale(.34)" d={drop} />
    </g>
  );
}

// a knitted scarf wound round the neck, under the chin, an end hanging down the front; dark on a light top,
// light on a dark one
export function Scarf({ dark }) {
  const knit = dark ? { ...line, stroke: '#fff', strokeWidth: 12 } : { ...line, strokeWidth: 12 };
  return (
    <g className="ds-scarf">
      <path {...shape} fill={dark ? INK : '#fff'} d="M505 580 C515 660 525 730 545 790 L630 776 C610 720 600 650 595 580 Z" />
      <path {...knit} d="M522 660 L604 652 M534 730 L616 722 M548 790 l-6 40 M580 785 l-3 40 M612 780 l1 40" />
      <path {...shape} fill={dark ? INK : '#fff'} d="M352 504 C430 478 545 478 618 504 C628 537 628 574 618 608 C545 584 430 584 360 608 C348 574 346 537 352 504 Z" />
      <path {...knit} d="M412 494 L418 594 M478 485 L481 587 M544 488 L545 590" />
    </g>
  );
}
