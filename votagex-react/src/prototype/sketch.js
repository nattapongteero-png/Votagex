// Hand-drawn marks for the riso calendar: wobbly paths seeded per day, so every mark is a little
// different but stays the same between renders. All paths live in a 100 × 100 box.

function rand(seed) {
  let a = (seed * 9301 + 49297) % 233280;
  return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
}

// smooth path through points (Catmull-Rom as cubic Béziers)
function smooth(pts) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// a pen loop around a number: a bit more than one turn, uneven radius, ends overshooting
export function loopPath(seed) {
  const r = rand(seed);
  const start = -2.4 + r() * 0.8, turn = Math.PI * 2 * (1.1 + r() * 0.08), n = 26;
  const tilt = (r() - 0.5) * 0.3;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, a = start + turn * t;
    const k = 1 + (r() - 0.5) * 0.07 + t * 0.07;
    const x = Math.cos(a) * 44 * k, y = Math.sin(a) * 38 * k;
    return [50 + x * Math.cos(tilt) - y * Math.sin(tilt), 50 + x * Math.sin(tilt) + y * Math.cos(tilt)];
  });
  return smooth(pts);
}

// one highlighter swipe, slightly slanted
export function swipePath(seed) {
  const r = rand(seed);
  const y0 = 60 + r() * 8, y1 = 44 + r() * 8;
  return smooth([[6, y0], [35, y0 - 5 + r() * 4], [65, y1 + 4 - r() * 4], [94, y1]]);
}
