// Home's backdrop behind the profiles and the calendar: a warm wall in afternoon sun. A patch of light falls
// through a window (its frame cuts it into panes) and a leafy branch outside throws soft shadows that sway.
// Leaves are drawn once from a seeded list, so the wall looks the same every visit.

const rnd = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

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

export default function SunWall() {
  return (
    <div className="pt-sunwall" aria-hidden="true">
      <div className="pt-sunwall-light">
        <i className="pt-sunwall-bar v" />
        <i className="pt-sunwall-bar h" />
      </div>
      <svg className="pt-sunwall-leaves far" viewBox="0 0 430 460" preserveAspectRatio="xMaxYMin slice">
        <Branch seed={7} x={470} y={-10} scale={1.25} turn={8} />
      </svg>
      <svg className="pt-sunwall-leaves near" viewBox="0 0 430 460" preserveAspectRatio="xMaxYMin slice">
        <Branch seed={1} x={450} y={40} scale={1} turn={-6} />
        <Branch seed={3} x={200} y={-40} scale={0.7} turn={20} />
      </svg>
    </div>
  );
}
