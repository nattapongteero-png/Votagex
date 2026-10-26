import { useEffect, useMemo, useRef, useState } from 'react';

// Every photo from past trips on the inside of a dome, seen from just behind its centre: the middle sits deep,
// the sides curve round towards you. Drag sideways to spin it (it keeps turning a little, then settles), tap a
// photo for that trip's diary. The trip facing you is named underneath. It starts on items[0].
// items: [{ src, key (the trip's id), title, sub }]

const P = 520; // perspective
const C = 250; // how far behind the centre we stand
const R = 430; // the dome's radius
const STEP = 15; // degrees between columns
const COLS = Math.round(360 / STEP);
const ROWS = [-24, -8, 8, 24]; // each row's height on the dome, in degrees
const SEEN = 78; // tiles further round than this are behind us: hidden

export default function MemoryDome({ items, onOpen }) {
  const world = useRef(null);
  const tiles = useRef([]);
  const st = useRef({ yaw: 0, v: 0, drag: null, moved: 0, raf: 0, idle: true });
  const [facing, setFacing] = useState(0);

  // the grid, filled by going round the photos; column 0 of the middle rows holds the first photo
  const grid = useMemo(() => {
    const out = [];
    let n = 0;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS.length; r++) {
        const first = c === 0 && r === 1;
        out.push({ c, r, it: items[first ? 0 : (n++ % items.length)] });
      }
    }
    return out;
  }, [items]);

  useEffect(() => {
    const s = st.current;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const frame = () => {
      if (!s.drag) {
        s.yaw += s.v;
        s.v *= 0.94;
        if (Math.abs(s.v) < 0.01) s.v = 0;
        if (!still && s.v === 0) s.yaw -= 0.02; // drifts slowly when left alone
      }
      if (world.current) world.current.style.transform = `translateZ(${P - C}px) rotateX(-4deg) rotateY(${s.yaw}deg)`;
      let best = 0; let bestD = 999;
      grid.forEach((g, i) => {
        const a = ((g.c * STEP + s.yaw) % 360 + 540) % 360 - 180; // where this column is from straight ahead
        const el = tiles.current[i];
        if (el) el.style.visibility = Math.abs(a) > SEEN ? 'hidden' : 'visible';
        if ((g.r === 1 || g.r === 2) && Math.abs(a) < bestD) { bestD = Math.abs(a); best = i; }
      });
      setFacing((f) => (f === best ? f : best));
      s.raf = requestAnimationFrame(frame);
    };
    s.raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(s.raf);
  }, [grid]);

  const down = (e) => {
    const s = st.current;
    s.drag = { x: e.clientX, yaw: s.yaw, t: performance.now(), last: e.clientX };
    s.moved = 0;
    s.v = 0;
  };
  const move = (e) => {
    const s = st.current;
    if (!s.drag) return;
    const dx = e.clientX - s.drag.x;
    s.moved = Math.max(s.moved, Math.abs(dx));
    s.yaw = s.drag.yaw - dx * 0.22;
    s.v = -(e.clientX - s.drag.last) * 0.22;
    s.drag.last = e.clientX;
  };
  const up = (e) => {
    const s = st.current;
    if (!s.drag) return;
    s.drag = null;
    if (s.moved < 6) {
      const key = e.target.closest?.('[data-trip]')?.dataset.trip;
      if (key) onOpen(key);
    }
  };

  const face = grid[facing]?.it;
  return (
    <div className="pt-dome-wrap">
      <div className="pt-dome" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { st.current.drag = null; }} onPointerLeave={(e) => st.current.drag && up(e)}>
        <div className="pt-dome-world" ref={world}>
          {grid.map((g, i) => (
            <button key={i} ref={(el) => { tiles.current[i] = el; }} data-trip={g.it.key} aria-label={g.it.title} tabIndex={i === facing ? 0 : -1}
              className={`pt-dome-tile${i === facing ? ' facing' : ''}`}
              style={{ transform: `rotateY(${g.c * STEP}deg) rotateX(${ROWS[g.r]}deg) translateZ(${-R}px)`, backgroundImage: `url(${g.it.src})` }}
              onKeyDown={(e) => { if (e.key === 'Enter') onOpen(g.it.key); }} />
          ))}
        </div>
      </div>
      {face && (
        <button className="pt-dome-caption" onClick={() => onOpen(face.key)}>
          <span className="pt-muted sm">{face.sub}</span>
          <span className="pt-strong ellipsis">{face.title}</span>
        </button>
      )}
    </div>
  );
}
