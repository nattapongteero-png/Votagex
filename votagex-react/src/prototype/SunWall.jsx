import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

// Home's backdrop behind the profiles and the calendar: daylight through a window onto the wall, with a palm and
// a monstera outside. It's built the way light works: the wall is in faint shade, the window lets light through
// in panes, and where a leaf is in the way the light is simply missing; so the shadows sit only inside the light,
// cool-tinted, never black. The sun follows the clock: morning light low from the left (warm, long soft
// shadows to the right), midday high and white (short, crisp), evening low from the right (orange, long), and at
// night only a faint blue moonlight. The leaves sway a little. ?hour=7 (0–24) previews another time of day.

const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// the light for an hour of the day (fractional, local time)
function lightAt(h) {
  const day = h >= 6 && h <= 18.5;
  const elev = day ? Math.sin((Math.PI * (h - 6)) / 12.5) : 0; // 0 at sunrise/sunset, 1 at noon
  const side = h < 12.25 ? -1 : 1; // the sun on the left in the morning, the right in the afternoon
  const low = 1 - elev;
  return {
    day,
    // where the light and shadows fall: away from the sun, sheared and longer when it's low
    skew: day ? side * -(6 + low * 26) : 0,
    shiftX: day ? side * -(4 + low * 28) : 0,
    stretch: day ? 1 + low * 0.25 : 1,
    blur: day ? 0.5 + low * 1.8 : 4, // leaf edges: crisp at noon, softer when the sun is low, blurry by moonlight
    paneBlur: day ? 1.5 + low * 2.5 : 10,
    shade: day ? 0.08 : 0.05,
    // the light's own colour, laid over where it falls
    tint: !day ? 'rgba(190, 208, 255, .2)'
      : low > 0.55 ? (side < 0 ? 'rgba(255, 214, 150, .32)' : 'rgba(255, 170, 110, .34)') // golden morning / orange evening
        : 'rgba(255, 246, 225, .22)', // white-ish midday
    ink: day ? '#46507A' : '#283770',
  };
}

// a palm frond: a curved rib with narrow leaflets either side
function Frond({ x, y, len, turn, seed }) {
  const n = 22;
  const items = Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / (n + 1);
    const px = -t * len; const py = Math.sin(t * Math.PI * 0.9) * len * 0.16;
    const lf = len * (0.34 - t * 0.2) * (0.85 + rnd(seed + i) * 0.3);
    return [-1, 1].map((sd) => ({ px, py, a: sd * (52 - t * 18) + 180, lf, k: `${i}${sd}` }));
  }).flat();
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`}>
      <path d={`M0 0 Q ${-len * 0.5} ${len * 0.2} ${-len} ${len * 0.05}`} fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" />
      {items.map((l) => (
        <path key={l.k} transform={`translate(${l.px} ${l.py}) rotate(${l.a})`} d={`M0 0 Q ${l.lf * 0.5} -5 ${l.lf} 0 Q ${l.lf * 0.5} 4 0 0 Z`} fill="#000" />
      ))}
    </g>
  );
}

// a monstera leaf: a broad round blade on its stem
function Monstera({ x, y, r, turn, stem }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`}>
      <path d={`M0 0 L ${stem} ${stem * 0.4}`} stroke="#000" strokeWidth="4" strokeLinecap="round" />
      <path d={`M0 0 C ${-r * 0.9} ${-r * 0.2}, ${-r * 1.2} ${r * 0.9}, ${-r * 0.2} ${r * 1.15} C ${r * 0.5} ${r * 1.3}, ${r * 1.1} ${r * 0.6}, ${r * 0.8} ${r * 0.05} C ${r * 0.6} ${-r * 0.3}, ${r * 0.2} ${-r * 0.15}, 0 0 Z`} fill="#000" />
    </g>
  );
}

function useHour() {
  const pick = () => {
    const q = Number(new URLSearchParams(window.location.search).get('hour'));
    if (q >= 0 && q <= 24 && new URLSearchParams(window.location.search).has('hour')) return q;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  };
  const [h, setH] = useState(pick);
  useEffect(() => {
    const t = setInterval(() => setH(pick()), 60000);
    return () => clearInterval(t);
  }, []);
  return h;
}

export default function SunWall() {
  const h = useHour();
  const L = useMemo(() => lightAt(h), [h]);
  const W = 430; const H = 520;
  // the window's panes as light cast on the wall, sheared and stretched by the sun
  const panes = [[150, 0, 120, 140], [282, 0, 120, 140], [150, 152, 120, 140], [282, 152, 120, 140]];
  const cast = `translate(${L.shiftX} 0) skewX(${L.skew}) scale(1 ${L.stretch})`;
  const leaves = (
    <g className="pt-sun-sway">
      <Frond x={450} y={10} len={270} turn={-22} seed={1} />
      <Frond x={450} y={150} len={210} turn={8} seed={5} />
      <g className="pt-sun-sway2"><Monstera x={250} y={-40} r={56} turn={20} stem={-40} /></g>
    </g>
  );
  return createPortal(
    <div className="pt-sunwall" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin slice" width="100%" height="100%">
        <defs>
          <filter id="sw-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={L.blur} /></filter>
          <filter id="sw-pane" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={L.paneBlur} /></filter>
          {/* where the light gets through: the panes, with the leaves (black) in the way */}
          <mask id="sw-lit" maskUnits="userSpaceOnUse" x="-300" y="-300" width={W + 600} height={H + 600}>
            <g transform={cast}>
              <g filter="url(#sw-pane)">{panes.map(([x, y, w, hh], i) => <rect key={i} x={x} y={y} width={w} height={hh} rx="3" fill="#fff" />)}</g>
              <g filter="url(#sw-soft)">{leaves}</g>
            </g>
          </mask>
        </defs>
        {/* the wall in faint shade, cool like a shadow lit by the sky */}
        <rect width={W} height={H} fill={L.ink} opacity={L.shade} />
        {/* the light: lifts the shade back off and warms the wall where it falls */}
        <g mask="url(#sw-lit)">
          <rect width={W} height={H} fill="#fff" opacity={L.shade * 1.3} />
          <rect width={W} height={H} fill={L.tint} />
        </g>
      </svg>
    </div>,
    document.body,
  );
}
