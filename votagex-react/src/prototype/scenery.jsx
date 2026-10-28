import { useLayoutEffect, useRef, useState } from 'react';

// The day scene's backdrop (DayScene.jsx), drawn as Open Peeps are: one line of the same weight, white
// fills, solid for the dark parts, at life size beside them (a standing person is 3000 tall in their units,
// about 1.75 m: the tree is some 4.5 m, the lamp 3.7 m, the bench's seat 50 cm up), feet on the bottom, so
// it's sized off --tall like the people and stands on the same ground. It's drawn in currentColor, the
// people's ink (CSS), all standing level with the people on the land (Land); no soft shadows, which made
// everything look as if it floated.

const INK = 'currentColor';
const LINE = 22; // the people's line weight, in their units
const CEILING = 4800; // a room's ceiling off the floor, in people's units (2.8 m)

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


// ===== Indoors: a restaurant (a day out to eat) and home (a day with nothing on), drawn as the park is. A
// room's back wall stands `far` up the floor; what hangs on it is `up` off the floor (DayScene)

// a table across the front, its top seen from a little above with plates and glasses on it, a cloth down to
// the floor (the people sat behind it are busts: it hides where they stop). Its top is 75 cm up, `w` across
const table = (w, seats, cups) => {
  const plate = (x) => `M${x - 260} 150 a260 62 0 1 0 520 0 a260 62 0 1 0 -520 0 Z`;
  const food = (x) => `M${x - 150} 146 C${x - 130} 40 ${x + 130} 40 ${x + 150} 146 Z`;
  const glass = (x) => `M${x - 66} -230 L${x + 66} -230 L${x + 52} 150 L${x - 52} 150 Z`;
  const plates = seats.map((f) => Math.round(w * f));
  const glasses = cups.map((f) => Math.round(w * f));
  return {
    box: [0, -260, w, 1760],
    art: (
      <>
        <path {...shape} d={`M140 40 H${w - 140} L${w} 240 H0 Z`} />
        {plates.map((x) => <g key={x}><path {...shape} d={plate(x)} /><path {...shape} d={food(x)} /></g>)}
        {glasses.map((x) => <g key={x}><path {...shape} d={glass(x)} /><path {...line} strokeWidth={14} d={`M${x - 58} -80 H${x + 58}`} /></g>)}
        <path {...shape} d={`M0 240 H${w} L${w - 30} 1500 H30 Z`} />
        <path {...line} d={Array.from({ length: Math.round(w / 520) - 1 }, (_, i) => {
          const x = Math.round((w / Math.round(w / 520)) * (i + 1));
          return `M${x} 330 C${x + 26} 760 ${x - 26} 1100 ${x + 10} 1470`;
        }).join(' ')} />
      </>
    ),
  };
};

// a lamp hung from the ceiling, its shade's foot `up` off the floor (stood by it), its cord up to the ceiling
const pendant = (up) => { const cord = CEILING - up - 480; return {
  box: [0, 0, 900, cord + 480],
  art: (
    <>
      <path {...line} d={`M450 0 V${cord}`} />
      <path {...shape} d={`M150 ${cord + 400} C150 ${cord + 130} 300 ${cord} 450 ${cord} C600 ${cord} 750 ${cord + 130} 750 ${cord + 400} Z`} />
      <path {...line} d={`M110 ${cord + 400} H790`} />
      <path {...shape} d={`M385 ${cord + 400} A65 65 0 0 0 515 ${cord + 400}`} />
    </>
  ),
}; };

// a blackboard of the day's dishes, chalked
const BOARD = {
  box: [0, 0, 1300, 1600],
  art: (
    <>
      <path {...shape} d="M40 40 H1260 V1560 H40 Z" />
      <path fill={INK} d="M130 130 H1170 V1470 H130 Z" />
      <path {...line} stroke="#fff" strokeWidth={30} d="M330 330 H970" />
      <path {...line} stroke="#fff" strokeWidth={18} d="M260 620 H760 M260 820 H700 M260 1020 H780 M260 1220 H640 M940 620 H1040 M940 820 H1040 M940 1020 H1040 M940 1220 H1040" />
    </>
  ),
};

// a pot plant, big leaves on long stems (a room's corners, as the trees frame the park)
const leaf = (bx, by, tx, ty, w) => {
  const dx = tx - bx; const dy = ty - by; const l = Math.hypot(dx, dy); const nx = -dy / l; const ny = dx / l;
  const p = (a, k) => `${Math.round(bx + dx * a + nx * w * k)} ${Math.round(by + dy * a + ny * w * k)}`;
  return `M${bx} ${by} C${p(0.25, 1)} ${p(0.8, 0.7)} ${tx} ${ty} C${p(0.8, -0.7)} ${p(0.25, -1)} ${bx} ${by} Z`;
};
const LEAVES = [[900, 1560, 330, 640, 240], [900, 1560, 640, 260, 230], [900, 1560, 1120, 220, 240], [900, 1560, 1500, 620, 240], [900, 1560, 1600, 1180, 200], [900, 1560, 200, 1150, 200]];
const PLANT = {
  box: [0, 0, 1800, 2400],
  art: (
    <>
      {LEAVES.map(([bx, by, tx, ty, w]) => {
        const mx = Math.round(bx + (tx - bx) * 0.35); const my = Math.round(by + (ty - by) * 0.35);
        return <g key={`${tx}${ty}`}><path {...line} d={`M${bx} ${by} L${mx} ${my}`} /><path {...shape} d={leaf(mx, my, tx, ty, w)} /><path {...line} strokeWidth={14} d={`M${mx} ${my} L${Math.round(mx + (tx - mx) * 0.8)} ${Math.round(my + (ty - my) * 0.8)}`} /></g>;
      })}
      <path {...shape} d="M600 1700 H1200 L1130 2400 H670 Z" />
      <path {...shape} d="M540 1600 H1260 V1720 H540 Z" />
    </>
  ),
};

// home: a sofa for three, seen from a little above (its seat 40 cm up), a standard lamp, a picture, a rug
const SOFA = {
  box: [0, 0, 3800, 1600],
  art: (
    <>
      <path {...shape} d="M300 300 C300 200 380 160 480 160 H3320 C3420 160 3500 200 3500 300 V900 H300 Z" />
      <path {...line} d="M1400 230 V820 M2400 230 V820" />
      <path {...shape} d="M300 820 H3500 L3560 960 H240 Z" />
      <path {...shape} d="M240 960 H3560 V1420 H240 Z" />
      <path {...line} d="M1400 820 L1390 1420 M2400 820 L2410 1420" />
      <path {...shape} d="M60 700 C60 600 140 560 240 560 H380 C460 560 520 620 520 700 V1440 H60 Z" />
      <path {...shape} d="M3740 700 C3740 600 3660 560 3560 560 H3420 C3340 560 3280 620 3280 700 V1440 H3740 Z" />
      <path fill={INK} d="M150 1440 h110 l-14 160 h-82 Z M3540 1440 h110 l-14 160 h-82 Z" />
    </>
  ),
};
const FLOOR_LAMP = {
  box: [0, 0, 1000, 2800],
  art: (
    <>
      <path fill={INK} d="M486 900 h28 v1860 h-28 Z" />
      <path {...shape} d="M270 2800 Q500 2680 730 2800 Z" />
      <path {...shape} d="M230 960 L770 960 L650 420 L350 420 Z" />
    </>
  ),
};
const PICTURE = {
  box: [0, 0, 1000, 800],
  art: (
    <>
      <path {...shape} d="M30 30 H970 V770 H30 Z" />
      <path {...line} d="M120 120 H880 V680 H120 Z" />
      <path {...line} d="M170 640 L400 360 L540 520 L640 420 L830 640" />
      <circle {...line} cx="700" cy="250" r="60" />
    </>
  ),
};
// ===== The space we're in, in one-point perspective: a room's floor, walls and ceiling, or the park's path,
// all running back to the one vanishing point on the horizon, `vx` across (a share of the width), so the place
// has the depth the people have (further back, smaller: DayScene's `far`, px up the ground). Drawn in px off
// the stage's own measure: the world's size, where the ground line is and how tall a person is (CSS --ground,
// --tall, read off a probe). A plane's edges in the people's ink and line; what's on it (tiles, boards, slats)
// finer and fainter, so it reads as the surface and not as things

const NEAR = -1200; // px in front of us: far enough that a plane runs on out of the picture
// where a point is in the picture: `X` across as it would be at our feet (a share of the width), `far` px up the
// ground, `up` off the floor in people's units
const lensOf = ({ w, h, tall, ground }, vx, horizon) => (X, far, up = 0) => {
  const s = 1 - far / horizon;
  return [+(w * (vx + (X - vx) * s)).toFixed(1), +(h - ground - far - (up / 3000) * tall * s).toFixed(1)];
};
// depths (px up the ground) evenly spaced as they really are, from `from` back to `to`, a step of `dz` apart (in
// how far off they are, ours 1): closer and closer together in the picture, and none closer than `gap` px there
const depths = (from, to, dz, horizon, gap = 3) => {
  const out = [];
  for (let z = horizon / (horizon - from); ; z += dz) {
    const f = Math.min(to, horizon * (1 - 1 / z));
    if (!out.length || f - out[out.length - 1] >= gap * (1 - f / horizon) || f === to) out.push(f);
    if (f >= to) return out;
  }
};
const span = (a, b, k) => Array.from({ length: k + 1 }, (_, i) => a + ((b - a) * i) / k);
const poly = (pts) => `M${pts.map((p) => p.join(' ')).join(' L')} Z`;
const segs = (pairs) => pairs.map(([a, b]) => `M${a.join(' ')} L${b.join(' ')}`).join(' ');
const ink = { fill: 'none', stroke: INK, strokeLinecap: 'round', strokeLinejoin: 'round' };

// glass in a wall, the day outside through it: the sky's colour, the sun or a cloud, rain running down it, fog.
// `pts` its outline in the picture; `spot` [x, y, size] where the sun or the cloud is in it
function Glass({ pts, spot, weather, m }) {
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const l = Math.max(0, Math.min(...xs)); const r = Math.min(m.w, Math.max(...xs));
  const t = Math.max(0, Math.min(...ys)); const b = Math.min(m.h, Math.max(...ys));
  if (r - l < 2 || b - t < 2) return null;
  const wet = weather.kind === 'rain' || weather.kind === 'storm';
  const cloudy = wet || weather.kind === 'cloud' || weather.kind === 'partly';
  const sunny = !wet && weather.kind !== 'fog' && weather.kind !== 'cloud';
  const [x, y, d] = spot;
  return (
    <div className="ds-glass" style={{ left: l, top: t, width: r - l, height: b - t,
      clipPath: `polygon(${pts.map(([px, py]) => `${(px - l).toFixed(1)}px ${(py - t).toFixed(1)}px`).join(', ')})` }}>
      {sunny && <i className={`ds-pane-sun${weather.hot ? ' hot' : ''}`} style={{ left: x - l - d / 2, top: y - t - d / 2, width: d }} />}
      {cloudy && <svg className="ds-pane-cloud" viewBox={CLOUD.box.join(' ')} style={{ left: x - l - d * 1.6, top: y - t + d * 0.1, width: d * 2.6 }}>{CLOUD.art}</svg>}
      {wet && <i className={`ds-pane-rain${weather.kind === 'storm' ? ' storm' : ''}`} />}
      {weather.kind === 'fog' && <i className="ds-pane-fog" />}
    </div>
  );
}

// the park's path, paved in slabs, from under our feet back to the horizon: its edges and the slabs' long joints
// run to the vanishing point, the joints across closer together the further back. We stand on it; the grass either side (Land)
const PATH = 0.3; // half its width at our feet, a share of the picture's
function Path({ at, m, vx, horizon }) {
  const [a, b] = [vx - PATH, vx + PATH];
  const end = horizon - 4;
  const pen = (m.tall * LINE) / 3000;
  const joints = depths(-m.ground - 4, end - 40, 0.32, horizon, 4).slice(1);
  // (it fades into the distance as it narrows, the far end lost in the land at the foot of the hills)
  const [, y0] = at(a, end); const [, y1] = at(a, end - 70);
  return (
    <svg className="ds-space-art" viewBox={`0 0 ${m.w} ${m.h}`}>
      <defs>
        <linearGradient id="ds-path-far" gradientUnits="userSpaceOnUse" x1="0" y1={y0} x2="0" y2={y1}>
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" />
        </linearGradient>
        <mask id="ds-path-fade" maskUnits="userSpaceOnUse" x="0" y="0" width={m.w} height={m.h}>
          <rect width={m.w} height={m.h} fill="url(#ds-path-far)" />
        </mask>
      </defs>
      <g mask="url(#ds-path-fade)">
        <path className="ds-path" d={poly([at(a, NEAR), at(b, NEAR), at(b, end), at(a, end)])} />
        <path {...ink} className="ds-texture" strokeWidth={pen * 0.5}
          d={segs([...joints.map((f) => [at(a, f), at(b, f)]), ...span(a, b, 4).slice(1, -1).map((X) => [at(X, NEAR), at(X, end)])])} />
        <path {...ink} strokeWidth={pen * 0.85} d={segs([[at(a, NEAR), at(a, end)], [at(b, NEAR), at(b, end)]])} />
      </g>
    </svg>
  );
}

// the rooms: the side walls `x` across at our feet, the back wall `back` px up the floor, the ceiling `high` off
// it. At home the back wall's a golden rectangle (1.618 times as wide as it's high, on a phone)
const ROOM = {
  eat: { x: [-0.22, 1.22], back: 150, high: CEILING },
  home: { x: [-0.15, 1.15], back: 125, high: CEILING },
};
// a restaurant: a tiled floor, a slatted ceiling, the street through a glass front down the left, slats down the
// right. Home: boards, a window in the left wall, a doorway dark in the right, a rug on the floor (`rug`: X from,
// X to, far from, far to)
function Room({ place, at, m, horizon, weather, rug }) {
  const { x: [x0, x1], back, high } = ROOM[place];
  const pen = (m.tall * LINE) / 3000;
  const front = -m.ground - 4; // the picture's foot
  const eat = place === 'eat';
  const plane = {
    ceiling: [at(x0, NEAR, high), at(x1, NEAR, high), at(x1, back, high), at(x0, back, high)],
    left: [at(x0, NEAR), at(x0, back), at(x0, back, high), at(x0, NEAR, high)],
    right: [at(x1, NEAR), at(x1, back), at(x1, back, high), at(x1, NEAR, high)],
    wall: [at(x0, back), at(x1, back), at(x1, back, high), at(x0, back, high)],
    floor: [at(x0, NEAR), at(x1, NEAR), at(x1, back), at(x0, back)],
  };
  const edges = `${segs([[at(x0, NEAR), at(x0, back)], [at(x1, NEAR), at(x1, back)], [at(x0, NEAR, high), at(x0, back, high)], [at(x1, NEAR, high), at(x1, back, high)]])} ${poly(plane.wall)}`;
  // what's on the planes
  const texture = eat
    ? segs([
      ...span(x0, x1, 18).map((X) => [at(X, NEAR), at(X, back)]),
      ...depths(front, back, 0.3, horizon).map((f) => [at(x0, f), at(x1, f)]),
      ...span(x0, x1, 24).map((X) => [at(X, NEAR, high), at(X, back, high)]),
      ...depths(-500, back, 0.07, horizon).map((f) => [at(x1, f, 0), at(x1, f, high)]),
    ])
    : segs([
      ...span(x0, x1, 26).map((X) => [at(X, NEAR), at(X, back)]),
      ...[[x0, NEAR, x0, back], [x0, back, x1, back], [x1, back, x1, NEAR]].map(([a, f, b, g]) => [at(a, f, 150), at(b, g, 150)]),
    ]);
  // the glass: down the restaurant's left, its whole length (a mullion every so often, a transom); at home, a
  // window in the left wall
  const glass = eat ? { far: [NEAR, back - 1], up: [320, 4300] } : { far: [26, 96], up: [1500, 4100] };
  const g = (f, u) => at(x0, f, u);
  const pane = [g(glass.far[0], glass.up[0]), g(glass.far[1], glass.up[0]), g(glass.far[1], glass.up[1]), g(glass.far[0], glass.up[1])];
  const mid = eat ? back * 0.62 : (glass.far[0] + glass.far[1]) / 2;
  const sunAt = g(mid, 3400);
  const spot = [sunAt[0], sunAt[1], (glass.up[1] - glass.up[0]) / 3000 * m.tall * (1 - mid / horizon) * (eat ? 0.13 : 0.24)];
  const frames = eat
    ? segs([
      ...depths(-160, back - 1, 0.5, horizon).map((f) => [g(f, glass.up[0]), g(f, glass.up[1])]),
      [g(NEAR, 3500), g(back, 3500)], [g(NEAR, glass.up[0]), g(back, glass.up[0])], [g(NEAR, glass.up[1]), g(back, glass.up[1])],
    ])
    : `${poly(pane)} ${segs([[g(mid, glass.up[0]), g(mid, glass.up[1])], [g(glass.far[0] - 4, glass.up[0] - 120), g(glass.far[1] + 3, glass.up[0] - 120)]])}`;
  // home's doorway, dark, through the right wall
  const door = !eat && poly([at(x1, 84, 0), at(x1, 112, 0), at(x1, 112, 3600), at(x1, 84, 3600)]);
  const doorFrame = !eat && poly([at(x1, 80, 0), at(x1, 115, 0), at(x1, 115, 3760), at(x1, 80, 3760)]);
  const mat = rug && [at(rug[0], rug[2]), at(rug[1], rug[2]), at(rug[1], rug[3]), at(rug[0], rug[3])];
  const matIn = rug && [at(rug[0] + 0.02, rug[2] + 3), at(rug[1] - 0.02, rug[2] + 3), at(rug[1] - 0.02, rug[3] - 3), at(rug[0] + 0.02, rug[3] - 3)];
  return (
    <>
      <svg className="ds-space-art" viewBox={`0 0 ${m.w} ${m.h}`}>
        <defs>
          <linearGradient id={`ds-floor-${place}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="ds-floor-far" /><stop offset="1" className="ds-floor-near" />
          </linearGradient>
        </defs>
        <path className="ds-plane-ceiling" d={poly(plane.ceiling)} />
        <path className="ds-plane-side" d={poly(plane.left)} />
        <path className="ds-plane-side" d={poly(plane.right)} />
        <path className="ds-plane-wall" d={poly(plane.wall)} />
        <path fill={`url(#ds-floor-${place})`} d={poly(plane.floor)} />
        <path {...ink} className="ds-texture" strokeWidth={pen * 0.45} d={texture} />
        {mat && <><path className="ds-rug" stroke={INK} strokeWidth={pen * 0.85} strokeLinejoin="round" d={poly(mat)} /><path {...ink} strokeWidth={pen * 0.5} d={poly(matIn)} /></>}
      </svg>
      <Glass pts={pane} spot={spot} weather={weather} m={m} />
      <svg className="ds-space-art" viewBox={`0 0 ${m.w} ${m.h}`}>
        {door && <path fill="#fff" stroke={INK} strokeWidth={pen * 0.85} strokeLinejoin="round" d={doorFrame} />}
        {door && <path fill={INK} d={door} />}
        <path {...ink} strokeWidth={pen * (eat ? 0.7 : 0.85)} d={frames} />
        <path {...ink} strokeWidth={pen * 0.85} d={edges} />
      </svg>
    </>
  );
}

// the space, measured off the stage (every render, cheap reads, as the ground moves with the place; and when
// the stage changes size)
export function Space({ place, vx, horizon, weather, rug }) {
  const box = useRef(null);
  const probe = useRef(null);
  const [m, setM] = useState(null);
  const measure = () => {
    const el = box.current; const p = probe.current;
    if (!el || !p) return;
    const next = { w: el.clientWidth, h: el.clientHeight, tall: p.offsetHeight, ground: el.clientHeight - p.offsetTop - p.offsetHeight };
    setM((o) => (o && o.w === next.w && o.h === next.h && o.tall === next.tall && o.ground === next.ground ? o : next));
  };
  useLayoutEffect(() => measure());
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => measure());
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const at = m?.w ? lensOf(m, vx, horizon) : null;
  return (
    <div className={`ds-space ds-space-${place}`} ref={box} aria-hidden="true">
      <i className="ds-probe" ref={probe} />
      {at && (place === 'park' ? <Path at={at} m={m} vx={vx} horizon={horizon} />
        : <Room place={place} at={at} m={m} horizon={horizon} weather={weather} rug={rug} />)}
    </div>
  );
}

const PROPS = { shelter: shelter(4600), butterfly: BUTTERFLY, leaf: LEAF, sun: SUN, tree: TREE, bareTree: BARE_TREE, lamp: LAMP, bench: BENCH, bush: BUSH, cloud: CLOUD, tuft: TUFT, birds: BIRDS, sign: SIGN,
  board: BOARD, plant: PLANT, sofa: SOFA, floorLamp: FLOOR_LAMP, picture: PICTURE, table, pendant };

// one prop at --x (its centre), feet on the ground line; `size` scales it from life size. One drawn to order (a
// table laid for us, a lamp hung from the ceiling) takes its `args`
export function Prop({ kind, args = [], x, size = 1, className = '', style }) {
  const { box: [bx, by, w, h], art } = typeof PROPS[kind] === 'function' ? PROPS[kind](...args) : PROPS[kind];
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
