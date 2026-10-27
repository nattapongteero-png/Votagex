import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

// Home's backdrop behind the profiles and the calendar: soft shadows of a leafy branch outside, swaying on the
// wall. The branches are drawn once from a seeded list, so the wall looks the same every visit. The sun follows
// the clock, only in how the shadows fall: morning they lean right and are warm and soft, midday short and
// crisp, evening lean left in a warmer brown, and at night faint, blurry and blue-grey. A glow at the sun's
// side of the top tints the light. ?hour=7 (0–24) previews another time of day.

const rnd = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// how the shadows fall at an hour of the day (fractional, local time)
function lightAt(h) {
  const day = h >= 6 && h <= 18.5;
  const elev = day ? Math.sin((Math.PI * (h - 6)) / 12.5) : 0; // 0 at sunrise/sunset, 1 at noon
  const side = h < 12.25 ? -1 : 1; // the sun on the left in the morning, the right in the afternoon
  const low = 1 - elev;
  if (!day) return { skew: 0, near: 0.12, far: 0.08, blur: 5, ink: '#2E3A5C', glow: 'rgba(170, 190, 255, .16)', side: 1 };
  return {
    skew: side * -(2 + low * 14), // shadows lean away from the sun, more when it's low
    near: 0.2 + elev * 0.04,
    far: 0.12 + elev * 0.03,
    blur: 1.6 + low * 2.4, // crisp at noon, softer when the sun is low
    ink: low > 0.55 ? (side < 0 ? '#4A3A22' : '#5A3420') : '#3E3A30',
    glow: low > 0.55 ? (side < 0 ? 'rgba(255, 214, 150, .28)' : 'rgba(255, 170, 110, .28)') : 'rgba(255, 246, 225, .2)',
    side,
  };
}

// a branch reaching in from the top right: a curved stem with leaves along it
function Branch({ seed, x, y, scale, turn }) {
  const leaves = Array.from({ length: 16 }, (_, i) => {
    const t = i / 15;
    const px = -t * 240 + rnd(seed + i) * 20;
    const py = t * t * 120 + t * 40;
    const side = i % 2 ? 1 : -1;
    return { px, py, a: side * (35 + rnd(seed + i + 40) * 40) + t * 30, s: 0.7 + rnd(seed + i + 80) * 0.6 };
  });
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn}) scale(${scale})`}>
      <path d="M0 0 Q -120 20 -250 170" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      {leaves.map((l, i) => (
        <path key={i} transform={`translate(${l.px} ${l.py}) rotate(${l.a}) scale(${l.s})`}
          d="M0 0 C 10 -12, 40 -14, 58 0 C 40 14, 10 12, 0 0 Z" fill="currentColor" />
      ))}
    </g>
  );
}

function useHour() {
  const pick = () => {
    const q = new URLSearchParams(window.location.search);
    const v = Number(q.get('hour'));
    if (q.has('hour') && v >= 0 && v <= 24) return v;
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
  const vars = {
    '--sw-ink': L.ink, '--sw-near': L.near, '--sw-far': L.far, '--sw-blur': `${L.blur}px`,
    '--sw-skew': `${L.skew}deg`, '--sw-glow': L.glow, '--sw-glow-x': L.side < 0 ? '0%' : '100%',
  };
  return createPortal(
    <div className="pt-sunwall" style={vars} aria-hidden="true">
      <i className="pt-sunwall-glow" />
      <div className="pt-sunwall-cast">
        <svg className="pt-sunwall-leaves far" viewBox="0 0 430 460" preserveAspectRatio="xMaxYMin slice">
          <Branch seed={7} x={470} y={-10} scale={1.25} turn={8} />
        </svg>
        <svg className="pt-sunwall-leaves near" viewBox="0 0 430 460" preserveAspectRatio="xMaxYMin slice">
          <Branch seed={1} x={450} y={40} scale={1} turn={-6} />
          <Branch seed={3} x={200} y={-40} scale={0.7} turn={20} />
        </svg>
      </div>
    </div>,
    document.body,
  );
}
