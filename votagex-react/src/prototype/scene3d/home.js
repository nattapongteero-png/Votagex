import * as THREE from 'three';
import { inkMaterial } from './ink';
import { glassPane, lights, sky, streetTree, sunPatch, tintOf } from './outdoors';
import { add, box, cup, group, inFront, rod, smallPlant } from './parts';

// A day with nothing on: at home, the living room, me alone (with nothing on, no one's come round). Laid out as a
// designer would, and taken as a photographer would, from the front corner of the room turned a little across
// it, so it opens out ahead of me, the way I'm looking:
// - me on the end of the sofa, turned toward the window, the coffee table in front of me with a cup and a book,
//   the rug under it all, nothing at my elbow;
// - the back wall the calm ground: the window ahead of me (the day outside in it), nothing in front of it,
//   pictures only where they're not behind my head;
// - down the left wall a bookcase full of books, going off the edge of the picture; in the right wall, beside
//   me, a second window, cut by the edge of the picture: the day's light comes in by it, and on a sunny day lies
//   on the floor ahead of me in the shape of its panes (no sun in the sky: the light is the sun);
// - boards on the floor and on the ceiling running back (leading lines, the ceiling coming on down from over the
//   header as the café's does), nothing hung over my head.
// `at`: where I am, on the floor [x, z]; `see`: where a point [x, y, z] is in the picture, px; `faces`: how far
// across the picture each face is, px; `wx`, `hot`, `cold`: the weather.

const ROOM = { left: -2.6, right: 2.5, back: -7.2, high: 2.75 };
const T = { wall: '#F2F0E9', side: '#ECE9E0', floor: '#E3D2B7', wood: '#D9B98F', woodPale: '#E6D3B8', sofa: '#C8D2D8', cushion: '#E9CDBD',
  rug: '#E9E2D2', white: '#FFFFFF', books: ['#C9D7D3', '#E7CFC0', '#D8D3E6', '#EADFB9', '#CBD9C2', '#E3C9C9'] };

// a three-seat sofa facing +z (seat 42 cm up), a cushion at each end
function sofa(parent, at) {
  const g = group(parent, at);
  const m = inkMaterial(T.sofa);
  add(g, box(2.0, 0.24, 0.86), m, [0, 0.2, 0]);
  [-0.48, 0.48].forEach((x) => add(g, box(0.94, 0.12, 0.7), m, [x, 0.38, 0.06]));
  add(g, box(2.0, 0.5, 0.2), m, [0, 0.6, -0.33]);
  [-0.48, 0.48].forEach((x) => add(g, box(0.92, 0.36, 0.14), m, [x, 0.6, -0.18]));
  [-1, 1].forEach((k) => add(g, box(0.18, 0.56, 0.86), m, [k * 1.0, 0.36, 0]));
  [-1, 1].forEach((k) => [-1, 1].forEach((j) => add(g, rod(0.025, 0.08, 8), inkMaterial(T.wood), [k * 0.92, 0.04, j * 0.36])));
  [-0.72, 0.72].forEach((x, i) => { const c = add(g, box(0.36, 0.34, 0.12), inkMaterial(T.cushion), [x, 0.58, -0.06]); c.rotation.set(-0.25, i ? -0.2 : 0.2, i ? -0.12 : 0.12); });
  return g;
}

// a low coffee table, a shelf under its top; on it what's out (cups, a book, a little plant)
function coffeeTable(parent, at, cups) {
  const g = group(parent, at);
  add(g, box(0.95, 0.04, 0.52), inkMaterial(T.wood), [0, 0.4, 0]);
  add(g, box(0.85, 0.025, 0.42), inkMaterial(T.woodPale), [0, 0.12, 0]);
  [-1, 1].forEach((k) => [-1, 1].forEach((j) => add(g, rod(0.018, 0.4, 8), inkMaterial(T.wood), [k * 0.43, 0.2, j * 0.22])));
  cups.forEach(([x, z]) => cup(g, [x, 0.42, z]));
  add(g, box(0.22, 0.03, 0.16), inkMaterial('#D8D3E6'), [0.2, 0.435, 0.08]).rotation.y = 0.3;
  smallPlant(g, [-0.3, 0.42, -0.08], { size: 0.9 });
  add(g, box(0.36, 0.06, 0.26), inkMaterial('#E3C9C9'), [0.05, 0.16, 0]);
  return g;
}

// a bookcase against the left wall, full of books, a plant and a box here and there (along z, `len` long)
function bookcase(parent, at, len) {
  const g = group(parent, at);
  const wood = inkMaterial(T.woodPale);
  // (open to the room: a back against the wall, two ends, a top; the shelves between)
  add(g, box(0.03, 2.05, len), wood, [-0.155, 1.025, 0]);
  [-1, 1].forEach((k) => add(g, box(0.34, 2.05, 0.03), wood, [0, 1.025, k * (len / 2 - 0.015)]));
  add(g, box(0.36, 0.04, len), wood, [0.01, 2.05, 0]);
  let r = 11;
  const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  [0.06, 0.48, 0.9, 1.32, 1.74].forEach((y, row) => {
    add(g, box(0.36, 0.03, len), wood, [0.01, y, 0]);
    for (let z = -len / 2 + 0.06; z < len / 2 - 0.06;) {
      if (rand() < 0.12) { smallPlant(g, [0.05, y + 0.015, z + 0.1], { size: 0.85 }); z += 0.24; continue; }
      const t = 0.025 + rand() * 0.035; const h = 0.24 + rand() * 0.12;
      const b = add(g, box(0.22, h, t), inkMaterial(T.books[Math.floor(rand() * T.books.length)], { hatch: 0.6 }), [0.06, y + 0.015 + h / 2, z + t / 2]);
      if (row % 2 && rand() < 0.08) b.rotation.x = 0.25;
      z += t + 0.004;
    }
  });
  return g;
}

// a picture in a frame with a mat, hung on the back wall
function picture(parent, at, w, h, seed) {
  const g = group(parent, at);
  add(g, box(w, h, 0.03), inkMaterial(T.wood), [0, 0, 0]);
  add(g, box(w - 0.08, h - 0.08, 0.034), inkMaterial(T.white), [0, 0, 0]);
  add(g, box(w - 0.22, h - 0.22, 0.04), inkMaterial(seed ? '#D6E2D8' : '#E7D6C8', { grid: seed ? [0, 0.06] : [0.08, 0], axes: 'xy', joints: 0.3 }), [0, 0, 0]);
  return g;
}

export function home({ at, see, faces, wx, hot, cold }) {
  const scene = new THREE.Scene();
  const { left, right, back, high } = ROOM;
  const len = 1 - back; const mid = (1 + back) / 2;
  // the light: the day's, in by the window on the right, from a little in front of us
  const SUN = [5, hot ? 8 : cold ? 4 : 6, 3.5];
  const { sunny, key } = lights(scene, { wx, hot, ground: '#E8DFD0', from: SUN, to: [0, 0, 0], span: 8 });
  const shell = (m) => { m.castShadow = false; return m; };
  // (nothing busy behind my head: a thing that'd come within 60 px of my face across the picture goes elsewhere)
  const clear = (p) => faces.every((fx) => Math.abs(see(p)[0] - fx) > 60);

  // the room: boards on the floor, plain walls, a ceiling of boards (their joints drawn as the café's slats
  // are, one line each), a skirting board round it
  shell(add(scene, new THREE.PlaneGeometry(right - left, len), inkMaterial(T.floor, { grid: [0.16, 0], axes: 'xz', joints: 0.3, hatch: 0.8 }), [0, 0, mid], [-Math.PI / 2, 0, 0]));
  shell(add(scene, box(right - left + 0.4, 0.2, len), inkMaterial('#F1EADD', { hatch: 0, grid: [0.3, 0], axes: 'xz', joints: 0.22 }), [0, high + 0.1, mid]));
  shell(add(scene, box(0.2, high + 0.2, len), inkMaterial(T.side, { hatch: 0.5 }), [left - 0.1, high / 2, mid]));
  [left + 0.01, right - 0.01].forEach((x) => add(scene, box(0.02, 0.1, len), inkMaterial(T.white), [x, 0.05, mid]));
  // the right wall round its window (its inside out of the light, but left unhatched: a plain wall)
  const side = [-4.9, -2.9]; const sSill = 0.45; const sHead = 2.3;
  const sideWall = inkMaterial(T.side, { hatch: 0 });
  [[back, side[0], 0, high], [side[1], 1, 0, high], [side[0], side[1], 0, sSill], [side[0], side[1], sHead, high]]
    .forEach(([z0, z1, y0, y1]) => shell(add(scene, box(0.2, y1 - y0, z1 - z0), sideWall, [right + 0.1, (y0 + y1) / 2, (z0 + z1) / 2])));
  const sz = (side[0] + side[1]) / 2;
  [side[0], sz, side[1]].forEach((z) => add(scene, box(0.08, sHead - sSill, 0.06), inkMaterial(T.white), [right, (sSill + sHead) / 2, z]));
  [sSill, sHead].forEach((y) => add(scene, box(0.08, 0.06, side[1] - side[0] + 0.06), inkMaterial(T.white), [right, y, sz]));
  add(scene, new THREE.PlaneGeometry(side[1] - side[0], sHead - sSill), glassPane(wx === 'rain' || wx === 'storm', wx === 'storm'), [right + 0.02, (sSill + sHead) / 2, sz], [0, -Math.PI / 2, 0]).castShadow = false;
  if (sunny) {
    const d = SUN.map((v) => -v);
    sunPatch(scene, [[side[0], sz], [sz, side[1]]].map(([z0, z1]) => [[right, sSill, z0], [right, sSill, z1], [right, sHead, z1], [right, sHead, z0]]), d, { hot, cold });
  }

  // the back wall round the window ahead of me (the day outside in it)
  const win = [0.35, 2.05]; const sill = 0.8; const head = 2.3;
  const wall = inkMaterial(T.wall);
  [[left, win[0], 0, high], [win[1], right, 0, high], [win[0], win[1], 0, sill], [win[0], win[1], head, high]].forEach(([x0, x1, y0, y1]) => shell(add(scene, box(x1 - x0, y1 - y0, 0.2), wall, [(x0 + x1) / 2, (y0 + y1) / 2, back - 0.1])));
  add(scene, box(right - left, 0.1, 0.02), inkMaterial(T.white), [0, 0.05, back + 0.01]);
  const frame = inkMaterial(T.white);
  [win[0], (win[0] + win[1]) / 2, win[1]].forEach((x) => add(scene, box(0.06, head - sill, 0.08), frame, [x, (sill + head) / 2, back]));
  [sill, head].forEach((y) => add(scene, box(win[1] - win[0] + 0.06, 0.06, 0.08), frame, [(win[0] + win[1]) / 2, y, back]));
  add(scene, box(win[1] - win[0] + 0.2, 0.04, 0.18), frame, [(win[0] + win[1]) / 2, sill - 0.02, back + 0.08]);
  add(scene, new THREE.PlaneGeometry(win[1] - win[0], head - sill), glassPane(wx === 'rain' || wx === 'storm', wx === 'storm'), [(win[0] + win[1]) / 2, (sill + head) / 2, back - 0.02]).castShadow = false;
  // outside it: a tree in the garden, the sky (no sun in it: the day's in its colour)
  streetTree(scene, [win[1] - 0.3, -0.4, back - 4.5], cold);
  add(scene, new THREE.PlaneGeometry(200, 120), sky(hot ? 'hot' : wx), [0, 40, back - 40]);
  if (wx === 'fog') add(scene, new THREE.PlaneGeometry(win[1] - win[0], head - sill), new THREE.MeshBasicMaterial({ color: '#F4F5F5', transparent: true, opacity: 0.72, depthWrite: false }), [(win[0] + win[1]) / 2, (sill + head) / 2, back - 0.3]);
  // pictures on the wall to the left of the window, whichever don't come behind my head
  [[left + 0.7, 1.55, 0.6, 0.78, 0], [left + 1.45, 1.45, 0.44, 0.56, 1], [win[0] - 0.55, 1.5, 0.5, 0.64, 1]]
    .filter(([x, y]) => clear([x, y, back]))
    .forEach(([x, y, w, h, seed]) => picture(scene, [x, y, back + 0.02], w, h, seed));

  // the left wall's bookcase, going off the edge
  bookcase(scene, [left + 0.18, 0, back + 1.4], 2.4).traverse((o) => { o.castShadow = false; });

  // me on the sofa's end (it runs off to my left), the rug, the coffee table in front of me
  const [[mx, mz]] = at;
  sofa(scene, [mx - 0.5, 0, mz - 0.52]);
  const rug = add(scene, box(2.6, 0.012, 2.0), inkMaterial(T.rug, { hatch: 0.6 }), [mx + 0.1, 0.006, mz + 0.35]);
  rug.castShadow = false;
  add(scene, box(2.36, 0.014, 1.76), inkMaterial('#F1EBDE', { hatch: 0.6 }), [mx + 0.1, 0.007, mz + 0.35]).castShadow = false;
  inFront(coffeeTable(scene, [mx + 0.15, 0, mz + 0.72], [[-0.1, 0.06]]));

  // on a scorcher the windows are white with the glare; through them, where the rain shows (SceneWeather)
  const panes = [[[win[0], sill, back], [win[1], sill, back], [win[1], head, back], [win[0], head, back]],
    [[right, sSill, side[0]], [right, sSill, side[1]], [right, sHead, side[1]], [right, sHead, side[0]]]];
  if (hot) {
    const glare = new THREE.MeshBasicMaterial({ color: '#FFFDF6', transparent: true, opacity: 0.72, depthWrite: false });
    add(scene, new THREE.PlaneGeometry(win[1] - win[0], head - sill), glare, [(win[0] + win[1]) / 2, (sill + head) / 2, back + 0.01]).castShadow = false;
    add(scene, new THREE.PlaneGeometry(side[1] - side[0], sHead - sSill), glare, [right - 0.01, (sSill + sHead) / 2, sz], [0, -Math.PI / 2, 0]).castShadow = false;
  }
  return { scene, key: key.intensity, tint: tintOf({ sunny, hot, cold }), outside: { shapes: panes } };
}
