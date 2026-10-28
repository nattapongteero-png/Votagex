import * as THREE from 'three';
import { inkMaterial } from './ink';
import { glassPane, lights, sky, streetTree } from './outdoors';
import { add, box, cup, group, inFront, plant, rod, smallPlant, turned } from './parts';

// A day with nothing on: at home, the living room. Laid out as a designer would, and for the picture:
// - me on the sofa, the friends across from me on the rug, the coffee table between us: we face each other over
//   it (a conversation, not a row); on my own, the coffee table in front of me with a cup and a book;
// - the back wall the calm ground behind us: a wide window (the day outside in it) over a low cabinet, two
//   pictures hung to one side;
// - down the left wall a bookcase full of books (the detail goes at the side), in the right-hand corner a tall
//   plant and the standard lamp;
// - boards on the floor running back to the window (leading lines), a plain ceiling, nothing over our heads.
// `at`: where each of us is, on the floor [x, z] (me first, on the sofa); `wx`, `hot`, `cold`: the weather.

const ROOM = { left: -2.7, right: 2.7, back: -6.4, high: 2.7 };
const T = { wall: '#F2F0E9', side: '#ECE9E0', floor: '#E8D9C2', wood: '#D9B98F', woodPale: '#E6D3B8', sofa: '#C8D2D8', cushion: '#E9CDBD',
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

// a standard lamp: a disc base, a slim pole, a drum shade
function standardLamp(parent, at) {
  const g = group(parent, at);
  add(g, rod(0.16, 0.03, 24), inkMaterial('#3A3A40'), [0, 0.015, 0]);
  add(g, rod(0.014, 1.5, 8), inkMaterial('#3A3A40'), [0, 0.78, 0]);
  add(g, new THREE.CylinderGeometry(0.17, 0.22, 0.3, 28, 1, true), inkMaterial('#F4EBDC', { side: THREE.DoubleSide, hatch: 0.4 }), [0, 1.62, 0]);
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

export function home({ at, wx, hot, cold }) {
  const scene = new THREE.Scene();
  const { left, right, back, high } = ROOM;
  const len = 1 - back; const mid = (1 + back) / 2;
  const { sunny, key } = lights(scene, { wx, hot, ground: '#E8DFD0', from: [-4, 6, 6], to: [0, 0, -4], span: 8 });
  const shell = (m) => { m.castShadow = false; return m; };

  // the room: boards on the floor, plain walls and ceiling, a skirting board round it
  shell(add(scene, new THREE.PlaneGeometry(right - left, len), inkMaterial(T.floor, { grid: [0.16, 0], axes: 'xz', joints: 0.3, hatch: 0.8 }), [0, 0, mid], [-Math.PI / 2, 0, 0]));
  shell(add(scene, box(right - left + 0.4, 0.2, len), inkMaterial('#F7F6F2', { hatch: 0 }), [0, high + 0.1, mid]));
  [left - 0.1, right + 0.1].forEach((x) => shell(add(scene, box(0.2, high + 0.2, len), inkMaterial(T.side, { hatch: 0.5 }), [x, high / 2, mid])));
  [left + 0.01, right - 0.01].forEach((x) => add(scene, box(0.02, 0.1, len), inkMaterial(T.white), [x, 0.05, mid]));

  // the back wall round a wide window (the day outside in it), a low cabinet under it, two pictures beside it
  const win = [-0.55, 1.75]; const sill = 0.85; const head = 2.25;
  const wall = inkMaterial(T.wall);
  [[left, win[0], 0, high], [win[1], right, 0, high], [win[0], win[1], 0, sill], [win[0], win[1], head, high]].forEach(([x0, x1, y0, y1]) => shell(add(scene, box(x1 - x0, y1 - y0, 0.2), wall, [(x0 + x1) / 2, (y0 + y1) / 2, back - 0.1])));
  add(scene, box(right - left, 0.1, 0.02), inkMaterial(T.white), [0, 0.05, back + 0.01]);
  const frame = inkMaterial(T.white);
  [win[0], (win[0] + win[1]) / 2, win[1]].forEach((x) => add(scene, box(0.06, head - sill, 0.08), frame, [x, (sill + head) / 2, back]));
  [sill, head].forEach((y) => add(scene, box(win[1] - win[0] + 0.06, 0.06, 0.08), frame, [(win[0] + win[1]) / 2, y, back]));
  add(scene, box(win[1] - win[0] + 0.2, 0.04, 0.18), frame, [(win[0] + win[1]) / 2, sill - 0.02, back + 0.08]);
  add(scene, new THREE.PlaneGeometry(win[1] - win[0], head - sill), glassPane(wx === 'rain' || wx === 'storm', wx === 'storm'), [(win[0] + win[1]) / 2, (sill + head) / 2, back - 0.02]).castShadow = false;
  // outside it: a tree in the garden, the sky
  streetTree(scene, [win[0] + 0.4, -0.4, back - 4.5], cold);
  add(scene, new THREE.PlaneGeometry(200, 120), sky(hot ? 'hot' : wx), [0, 40, back - 40]);
  if (sunny) add(scene, new THREE.CircleGeometry(2.4, 40), new THREE.MeshBasicMaterial({ color: hot ? '#FFF2C4' : '#FFE9A0' }), [9, 14, back - 38]).castShadow = false;
  if (wx === 'fog') add(scene, new THREE.PlaneGeometry(win[1] - win[0], head - sill), new THREE.MeshBasicMaterial({ color: '#F4F5F5', transparent: true, opacity: 0.72, depthWrite: false }), [(win[0] + win[1]) / 2, (sill + head) / 2, back - 0.3]);
  const cab = group(scene, [(win[0] + win[1]) / 2, 0, back + 0.24]);
  add(cab, box(1.9, 0.5, 0.42), inkMaterial(T.woodPale, { grid: [0.475, 0], axes: 'xy', joints: 0.35 }), [0, 0.3, 0]);
  [-0.8, 0.8].forEach((x) => add(cab, rod(0.02, 0.05, 6), inkMaterial(T.wood), [x, 0.025, 0.15]));
  smallPlant(cab, [-0.6, 0.55, 0], { size: 1.3 });
  add(cab, turned([[0, 0], [0.07, 0], [0.09, 0.12], [0.05, 0.26], [0.04, 0.3], [0, 0.3]]), inkMaterial('#E9DCC4'), [0.55, 0.55, 0]);
  [0, 1, 2].forEach((i) => add(cab, box(0.26 - i * 0.03, 0.04, 0.2), inkMaterial(T.books[i + 2]), [0.15, 0.57 + i * 0.04, 0]));
  picture(scene, [left + 0.75, 1.55, back + 0.02], 0.6, 0.78, 0);
  picture(scene, [left + 1.5, 1.45, back + 0.02], 0.44, 0.56, 1);

  // the left wall's bookcase, the right corner's plant and lamp
  bookcase(scene, [left + 0.18, 0, -4.9], 2.2);
  plant(scene, [right - 0.45, 0, back + 0.5], 1.5, { seed: 5 });
  standardLamp(scene, [right - 0.5, 0, -3.9]);

  // us: me on the sofa (with friends, on its end towards them), the rug under us, the coffee table between us
  const [[mx, mz]] = at;
  const n = at.length - 1;
  sofa(scene, [mx - (n ? 0.5 : 0), 0, mz - 0.52]);
  const cx = at.reduce((t, [x]) => t + x, 0) / at.length;
  const rug = add(scene, box(n ? 3.0 : 2.4, 0.012, 2.0), inkMaterial(T.rug, { hatch: 0.6 }), [n ? cx : mx + 0.2, 0.006, mz + 0.15]);
  rug.castShadow = false;
  add(scene, box((n ? 3.0 : 2.4) - 0.24, 0.014, 1.76), inkMaterial('#F1EBDE', { hatch: 0.6 }), [n ? cx : mx + 0.2, 0.007, mz + 0.15]).castShadow = false;
  const table = n
    ? coffeeTable(scene, [(mx + at[1][0]) / 2, 0, mz + 0.32], [[-0.22, 0.1], [0.24, -0.06]])
    : coffeeTable(scene, [mx + 0.2, 0, mz + 0.72], [[-0.1, 0.06]]);
  inFront(table);

  return { scene, key: key.intensity };
}
