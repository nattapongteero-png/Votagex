// The day scene's sky (DayScene.jsx: the places themselves are built in 3D, scene3d/) and what the people have
// about them for the weather, drawn as Open Peeps are: one line of the same weight, white fills, in
// currentColor, the people's ink (CSS), sized off --tall like the people (a standing person is 3000 tall in
// their units).

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

const line = { fill: 'none', stroke: INK, strokeWidth: LINE, strokeLinecap: 'round', strokeLinejoin: 'round' };
const shape = { ...line, fill: '#fff' };

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

const PROPS = { leaf: LEAF, sun: SUN, cloud: CLOUD, birds: BIRDS };

// one prop at --x (its centre); `size` scales it from life size
export function Prop({ kind, x, size = 1, className = '', style }) {
  const { box: [bx, by, w, h], art } = PROPS[kind];
  return (
    <svg className={`ds-prop ds-${kind} ${className}`} viewBox={`${bx} ${by} ${w} ${h}`} aria-hidden="true"
      style={{ '--x': x, height: `calc(var(--tall) * ${(h * size) / 3000})`, aspectRatio: `${w} / ${h}`, ...style }}>
      {art}
    </svg>
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
