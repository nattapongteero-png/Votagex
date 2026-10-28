import * as THREE from 'three';
import { inkMaterial } from './ink';
import { glassPane, lights, sky, streetTree } from './outdoors';
import { add, box, budVase, chair, cup, glass, group, inFront, pendant, plant, plate, rod, roundTable, smallPlant, stool } from './parts';

// Out to eat: a café, deep and narrow as a shophouse one is, seen from our table at the front. Laid out as a
// designer would, and for the picture:
// - an aisle down the middle, kept clear: the floor's joints, the ceiling's, the glass's head and the banquette
//   all run down it to the counter at the end, the vanishing point (leading lines), and nothing stands behind
//   our faces but the aisle and the far wall;
// - down the left, the glass front onto the street (the day's weather out there), a long bar along it with
//   stools, a little pot on it here and there: low and light, the bright side;
// - down the right, the warm side, wood slats, a banquette with two tables, a lamp hung over each;
// - at the end, the counter with the coffee machine at its middle, the menu board over it and open shelves
//   either side, symmetrical (the picture's still point); a tall plant in whichever back corner isn't behind
//   one of us;
// - above, a plain ceiling: the space over our heads left empty.
// We're at a table at the front, laid for us (drawn over us, so it hides where we stop); in front of it,
// nothing to steal the eye.
// `at`: where each of us sits, on the floor [x, z] (me first); `f`: px for a metre at a metre off (to see what
// would be behind us); `wx`, `hot`, `cold`: the weather.

const ROOM = { left: -2.5, right: 2.5, back: -11, high: 2.9 };
const T = { wall: '#F5ECDF', side: '#F1E5D3', floor: '#EAD9C3', wood: '#D9B98F', woodPale: '#E6CFAE', white: '#FFFFFF', dark: '#2E2E33',
  metal: '#DFE1E4', cloth: '#FBF8F2', street: '#E3E1DC', facade: ['#EDE6DA', '#E4E7E9', '#EFE2D6', '#E7E3EC'] };
export function cafe({ at, f, wx, hot, cold, stage }) {
  const scene = new THREE.Scene();
  const { left, right, back, high } = ROOM;
  const len = 1 - back; // from just behind us to the back wall

  // the light: the day in through the glass front, from the left and above (none, and no shadows, on a dull
  // day: just the room's own light), and the room's light all round
  const { sunny, key } = lights(scene, { wx, hot, ground: '#E8DCC9', from: [-4, 6, 6], to: [0, 0, -6], span: 9 });

  // the room: floor in big tiles, the back wall, the right wall, a ceiling of slats
  // (the room's shell takes shadows but casts none: the light's an illustrator's, falling on what's in it, not
  // shut out by the ceiling)
  const shell = (m) => { m.castShadow = false; return m; };
  shell(add(scene, new THREE.PlaneGeometry(right - left, len), inkMaterial(T.floor, { grid: [0.6, 0.6], hatch: 0.8 }), [0, 0, (1 + back) / 2], [-Math.PI / 2, 0, 0]));
  shell(add(scene, box(right - left + 0.4, high + 0.2, 0.2), inkMaterial(T.wall), [0, high / 2, back - 0.1]));
  shell(add(scene, box(0.2, high + 0.2, len), inkMaterial(T.side), [right + 0.1, high / 2, (1 + back) / 2]));
  // (the slats on the ceiling and the right wall drawn as joints, one line each, not as solid slats: edge on,
  // the solid ones' lines ran together into black)
  shell(add(scene, box(right - left + 0.4, 0.2, len), inkMaterial(T.woodPale, { hatch: 0, grid: [0.36, 0], axes: 'xz', joints: 0.22 }), [0, high + 0.1, (1 + back) / 2]));

  // the right: slats from the floor to above head height, a banquette along it, two tables for two, each with
  // a chair across from the bench and a lamp over it
  shell(add(scene, box(0.04, 2.5, len), inkMaterial(T.woodPale, { grid: [0.14, 0], axes: 'zy', hatch: 0.5 }), [right - 0.02, 1.25, (1 + back) / 2]));
  add(scene, box(0.08, 0.06, len), inkMaterial(T.wood), [right - 0.04, 2.53, (1 + back) / 2]);
  add(scene, box(0.5, 0.45, 5.0), inkMaterial(T.wood), [right - 0.29, 0.225, -7.0]);
  add(scene, box(0.46, 0.06, 5.0), inkMaterial(T.cloth), [right - 0.3, 0.48, -7.0]);
  add(scene, box(0.12, 0.45, 5.0), inkMaterial(T.cloth, { grid: [0.83, 0], axes: 'zy', joints: 0.3 }), [right - 0.1, 0.78, -7.0]);
  [-5.6, -8.4].forEach((z) => {
    roundTable(scene, [right - 0.85, 0, z], T.dark);
    chair(scene, [right - 1.5, 0, z], Math.PI / 2, T.wood);
    pendant(scene, [right - 0.85, z], 1.9, high);
  });

  // the left: the glass front (a low wall under it, mullions, a transom), a bar along it at elbow height with
  // stools, a little pot on it here and there
  const sill = 0.5; const head = 2.75;
  // (the glass side lit from the room, lightly hatched; its frames drawn in outline, not filled dark)
  shell(add(scene, box(0.25, sill, len), inkMaterial(T.side, { hatch: 0.45 }), [left - 0.12, sill / 2, (1 + back) / 2]));
  shell(add(scene, box(0.25, high - head, len), inkMaterial(T.side, { hatch: 0.45 }), [left - 0.12, (high + head) / 2, (1 + back) / 2]));
  const frame = inkMaterial('#A39C92', { hatch: 0.4 });
  for (let z = 0.2; z >= back; z -= 1.6) shell(add(scene, box(0.07, head - sill, 0.07), frame, [left, (sill + head) / 2, z]));
  shell(add(scene, box(0.07, 0.06, len), frame, [left, 2.25, (1 + back) / 2]));
  add(scene, new THREE.PlaneGeometry(len, head - sill), glassPane(wx === 'rain' || wx === 'storm', wx === 'storm'), [left, (sill + head) / 2, (1 + back) / 2], [0, Math.PI / 2, 0]).castShadow = false;
  const bar = [-3.6, -9.6];
  add(scene, box(0.42, 0.045, bar[0] - bar[1]), inkMaterial(T.wood), [left + 0.21, 1.0, (bar[0] + bar[1]) / 2]);
  for (let z = bar[0] - 0.6; z > bar[1]; z -= 1.6) add(scene, box(0.03, 0.4, 0.3), inkMaterial(T.dark, { hatch: 0 }), [left + 0.05, 0.8, z]);
  [-4.4, -5.4, -7.0, -8.0].forEach((z) => stool(scene, [left + 0.72, 0, z], T.wood));
  [-6.2, -8.8].forEach((z) => smallPlant(scene, [left + 0.2, 1.02, z]));

  // outside: the pavement, the street, trees, the shops across, the sky
  add(scene, new THREE.PlaneGeometry(40, 90), inkMaterial(T.street, { grid: [0, 0], hatch: 0 }), [left - 20, -0.12, -30], [-Math.PI / 2, 0, 0]);
  add(scene, box(3, 0.1, 90), inkMaterial('#EEEAE3', { grid: [0.9, 0.9], axes: 'xz' }), [left - 1.6, -0.06, -30]);
  [-3, -9, -15, -22].forEach((z) => streetTree(scene, [left - 2.4, 0, z], cold));
  let z0 = 4;
  [[7, 11], [9, 15], [6, 9], [10, 13], [8, 10], [12, 16]].forEach(([w, h], i) => {
    shell(add(scene, box(6, h, w), inkMaterial(T.facade[i % 4], { grid: [1.6, 1.5], axes: 'zy', hatch: 0 }), [left - 15, h / 2, z0 - w / 2]));
    add(scene, box(1.2, 0.25, w), inkMaterial('#FFFFFF'), [left - 11.6, 3.2, z0 - w / 2]);
    z0 -= w + 0.4;
  });
  add(scene, new THREE.PlaneGeometry(400, 160), sky(hot ? 'hot' : wx), [-90, 60, -40], [0, Math.PI / 2, 0]);
  if (sunny) {
    const sun = add(scene, new THREE.CircleGeometry(4, 40), new THREE.MeshBasicMaterial({ color: hot ? '#FFF2C4' : '#FFE9A0' }), [-78, 34, -64], [0, Math.PI / 2, 0]);
    sun.castShadow = false;
  }
  if (wx === 'fog') add(scene, new THREE.PlaneGeometry(len, high), new THREE.MeshBasicMaterial({ color: '#F4F5F5', transparent: true, opacity: 0.72, depthWrite: false }), [left - 0.4, high / 2, (1 + back) / 2], [0, Math.PI / 2, 0]);

  // the end: the counter across the middle, plain-fronted; the machine at its middle, the grinder and cups by
  // it; on the wall the menu board centred over it, open shelves of cups and jars either side; a lamp over the
  // counter; a tall plant in a back corner, the one that isn't behind one of us
  const cz = back + 1.0;
  add(scene, box(3.0, 1.0, 0.65), inkMaterial(T.wood), [0, 0.5, cz]);
  add(scene, box(3.16, 0.05, 0.75), inkMaterial(T.white), [0, 1.025, cz]);
  add(scene, box(3.0, 0.08, 0.02), inkMaterial(T.woodPale), [0, 0.06, cz + 0.33]);
  const machine = group(scene, [0.1, 1.05, cz - 0.05]);
  add(machine, box(0.7, 0.42, 0.48), inkMaterial(T.metal), [0, 0.21, 0]);
  add(machine, box(0.7, 0.05, 0.52), inkMaterial(T.dark, { hatch: 0 }), [0, 0.445, 0]);
  [-0.18, 0.18].forEach((x) => { add(machine, rod(0.04, 0.08, 12), inkMaterial(T.dark, { hatch: 0 }), [x, 0.17, 0.26]); add(machine, box(0.04, 0.03, 0.15), inkMaterial(T.dark, { hatch: 0 }), [x, 0.14, 0.34]); });
  [-0.2, 0, 0.2].forEach((x) => cup(machine, [x, 0.47, 0]));
  const grinder = group(scene, [-0.55, 1.05, cz - 0.05]);
  add(grinder, box(0.2, 0.3, 0.22), inkMaterial(T.metal), [0, 0.15, 0]);
  add(grinder, new THREE.CylinderGeometry(0.1, 0.05, 0.2, 16), inkMaterial('#F4F7F8'), [0, 0.4, 0]);
  add(scene, box(1.3, 0.72, 0.04), inkMaterial(T.dark, { hatch: 0 }), [0, 2.3, back + 0.03]);
  [0.16, 0.04, -0.08, -0.2].forEach((d) => add(scene, box(d > 0.1 ? 0.5 : 0.8, 0.015, 0.01), inkMaterial('#F4F4F4', { hatch: 0 }), [d > 0.1 ? 0 : -0.1, 2.3 + d, back + 0.06]));
  [-1, 1].forEach((side) => [1.55, 1.95].forEach((y, row) => {
    const sx0 = side * 0.95; const sx1 = side * 2.25;
    add(scene, box(1.3, 0.04, 0.26), inkMaterial(T.wood), [(sx0 + sx1) / 2, y, back + 0.13]);
    for (let i = 0; i < 5; i += 1) {
      const x = sx0 + (sx1 - sx0) * (0.12 + i * 0.19);
      const jar = (i + row) % 3 === 0;
      add(scene, jar ? rod(0.055, 0.17, 14) : rod(0.04, 0.09, 14), inkMaterial(jar ? '#E9DCC4' : T.white), [x, y + (jar ? 0.105 : 0.065), back + 0.13]);
    }
  }));
  pendant(scene, [0, cz], 1.95, high, '#F2E6D2');
  // (a corner's in line with one of us if it's within ~60 px of a face, seen from here)
  const behind = (x, z) => at.some(([px, pz]) => Math.abs(f * (x / z - px / pz)) < 60);
  const corner = [-1, 1].map((k) => [k * (right - 0.42), back + 0.45]).find(([x, z]) => !behind(x, z));
  if (corner) plant(scene, [corner[0], 0, corner[1]], 1.35, { seed: 3 });

  // (the photographer's framing being tried: me close in the foreground, cut by the frame, the friend across a
  // round table further in, the table drawn over them but under me)
  if (stage === 'art') {
    const [[mx, mz], [fx, fz]] = at;
    const d = Math.hypot(mx - fx, mz - fz);
    const t = group(scene, [fx + ((mx - fx) / d) * 0.55, 0, fz + ((mz - fz) / d) * 0.55]);
    add(t, rod(0.42, 0.035, 40), inkMaterial(T.white), [0, 0.74, 0]);
    // (a cloth down to the floor: under a bare table we'd miss the friend's legs)
    add(t, new THREE.CylinderGeometry(0.43, 0.5, 0.72, 40, 1, true), inkMaterial(T.cloth, { side: THREE.DoubleSide, hatch: 0.6 }), [0, 0.36, 0]);
    cup(t, [0.16, 0.76, 0.12]); cup(t, [-0.18, 0.76, -0.08]);
    plate(t, [0.02, 0.76, -0.16], '#E9C9A0');
    budVase(t, [-0.1, 0.76, 0.16]);
    inFront(t);
    chair(scene, [fx - ((mx - fx) / d) * 0.12, 0, fz - ((mz - fz) / d) * 0.12], Math.atan2(mx - fx, mz - fz), T.wood);
    return { scene, key: key.intensity };
  }
  // ours, at the front (drawn over us): a table laid for us, a cloth to the floor, a flower in a vase
  const xs = at.map(([x]) => x);
  const zs = at.map(([, z]) => z);
  const near = Math.max(...zs) + 0.2; const deep = 0.78;
  const x0 = Math.min(...xs) - 0.55; const x1 = Math.max(...xs) + 0.55;
  const ours = group(scene, [(x0 + x1) / 2, 0, near + deep / 2]);
  add(ours, box(x1 - x0, 0.04, deep), inkMaterial(T.white), [0, 0.75, 0]);
  add(ours, box(x1 - x0 - 0.04, 0.71, deep - 0.04), inkMaterial(T.cloth, { grid: [0.22, 0], axes: 'xy', hatch: 0.6 }), [0, 0.37, 0]);
  at.forEach(([x], i) => {
    const lx = x - (x0 + x1) / 2;
    if (i === 0 && at.length === 1) cup(ours, [lx + 0.2, 0.77, -0.1]);
    plate(ours, [lx, 0.77, -0.16]);
    glass(ours, [lx + (i ? -0.2 : 0.22), 0.77, 0.04]);
  });
  budVase(ours, [at.length > 1 ? (at[0][0] + at[1][0]) / 2 - (x0 + x1) / 2 : 0.3, 0.77, 0.1]);
  inFront(ours);
  // the chairs we're sat on, their backs behind us
  at.forEach(([x, z]) => chair(scene, [x, 0, z - 0.1], 0, T.wood));

  return { scene, key: key.intensity };
}
