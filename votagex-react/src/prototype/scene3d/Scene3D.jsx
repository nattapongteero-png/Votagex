import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Vector3 } from 'three';
import { dispose, draw, levelCamera } from './ink';
import { cafe } from './cafe';
import { home } from './home';
import { park } from './park';

// A place in 3D, drawn in ink (ink.js) behind the people (DayScene), what's in front of them on `front` (a
// canvas DayScene puts over them). Seen through the camera the people are drawn for: level, our feet `horizon`
// px under the horizon at our depth and a person --tall px there (1.75 m), D m off, the vanishing point `vx`
// across. Drawn once for the place, the weather and the stage's size (nothing in it moves).
// people: where each of us is in the picture, { x: a share across (the face), far: px back up the floor };
// clear: where across (shares) to keep clear behind, if not just where our faces are;
// onOutside: told where the outside shows in the picture, when we're under a roof (for the rain, SceneWeather):
// { shapes, cuts, drips } in px, or null

const BUILD = { eat: cafe, home, park };
const PERSON = 1.75; // m, a person's --tall
// m, how far off we are from the camera: close in a café (a wide view, the walls either side in it), a little
// further at home, further still outdoors; and how far off the lines start to fade (outdoors, the air between;
// in fog, soon)
const DIST = { eat: 2.6, home: 3.0, park: 4.5 };
const FADE = { eat: [30, 160], home: [30, 160], park: [25, 140] };

export default function Scene3D({ place, vx, yaw = 0, stage, clear, horizon, wx, hot, cold, people, front, onOutside }) {
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
    const cam = levelCamera({ w: m.w, h: m.h, f, cx, cy, eye: (horizon * PERSON) / m.tall, yaw });
    // each of us on the floor: depth from how far back, across from where we are in the picture at that depth
    // (turned with the camera)
    const c = Math.cos(yaw); const s = Math.sin(yaw);
    const at = people.map(({ x, far }) => {
      const z = D / (1 - far / horizon); const vx0 = ((x * m.w - cx) * z) / f;
      return [vx0 * c - z * s, -vx0 * s - z * c];
    });
    // where a point [x, y, z] is in the picture, px; how far across it each face is
    const see = ([x, y, z]) => { const v = new Vector3(x, y, z).project(cam); return [((v.x + 1) / 2) * m.w, ((1 - v.y) / 2) * m.h]; };
    const faces = (clear || people.map(({ x }) => x)).map((x) => x * m.w);
    const { scene, key, tint, outside } = BUILD[place]({ at, f, see, faces, wx, hot, cold, stage });
    const flat = (ps) => ps.map((p) => see(p).map((v) => Math.round(v * 10) / 10));
    onOutside?.(outside ? { shapes: outside.shapes.map(flat), cuts: (outside.cuts || []).map(flat), drips: (outside.drips || []).map(flat) } : null);
    const how = { w: m.w, h: m.h, dpr: Math.min(window.devicePixelRatio || 1, 2), key, tint, fade: place === 'park' && wx === 'fog' ? [6, 30] : FADE[place] };
    cam.layers.set(0);
    draw(scene, cam, back.current, how);
    if (front?.current) { cam.layers.set(1); draw(scene, cam, front.current, how); }
    return () => dispose(scene);
  }, [m, place, vx, yaw, stage, clear, horizon, wx, hot, cold, people, front, onOutside]);

  return (
    <div className="ds-3d" ref={box} aria-hidden="true">
      <i className="ds-probe" ref={probe} />
      <canvas className="ds-3d-back" ref={back} />
    </div>
  );
}
