import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { dispose, draw, levelCamera } from './ink';
import { cafe } from './cafe';

// A place in 3D, drawn in ink (ink.js) behind the people (DayScene), what's in front of them on `front` (a
// canvas DayScene puts over them). Seen through the camera the people are drawn for: level, our feet `horizon`
// px under the horizon at our depth and a person --tall px there (1.75 m), D m off, the vanishing point `vx`
// across. Drawn once for the place, the weather and the stage's size (nothing in it moves).
// people: where each of us is in the picture, { x: a share across (the face), far: px back up the floor }

const BUILD = { eat: cafe };
const PERSON = 1.75; // m, a person's --tall
// m, how far off we are from the camera: close in a café (a wide view, the walls either side in it)
const DIST = { eat: 2.6 };

export default function Scene3D({ place, vx, horizon, wx, hot, cold, people, front }) {
  const box = useRef(null);
  const probe = useRef(null);
  const back = useRef(null);
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

  useEffect(() => {
    if (!m?.w || !m.tall) return undefined;
    const D = DIST[place];
    const f = (m.tall / PERSON) * D;
    const cx = vx * m.w;
    const cy = m.h - m.ground - horizon;
    const cam = levelCamera({ w: m.w, h: m.h, f, cx, cy, eye: (horizon * PERSON) / m.tall });
    // each of us on the floor: depth from how far back, across from where we are in the picture at that depth
    const at = people.map(({ x, far }) => { const z = D / (1 - far / horizon); return [((x * m.w - cx) * z) / f, -z]; });
    const { scene, key } = BUILD[place]({ at, f, wx, hot, cold });
    const how = { w: m.w, h: m.h, dpr: Math.min(window.devicePixelRatio || 1, 2), key };
    cam.layers.set(0);
    draw(scene, cam, back.current, how);
    if (front?.current) { cam.layers.set(1); draw(scene, cam, front.current, how); }
    return () => dispose(scene);
  }, [m, place, vx, horizon, wx, hot, cold, people, front]);

  return (
    <div className="ds-3d" ref={box} aria-hidden="true">
      <i className="ds-probe" ref={probe} />
      <canvas className="ds-3d-back" ref={back} />
    </div>
  );
}
