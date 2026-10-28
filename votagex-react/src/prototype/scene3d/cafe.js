import * as THREE from 'three';
import { inkMaterial } from './ink';
import { add, box, chair, cup, glass, group, inFront, pendant, plant, plate, rod, roundTable } from './parts';

// Out to eat: a café, deep and narrow as a shophouse one is, seen from inside the door. Down the left a glass
// front onto the street (the day's weather out there: the sky, the sun, rain on the glass, fog); down the right
// wooden slats, a banquette, tables; at the back the counter, the coffee machine, shelves of cups, the menu,
// the kitchen door; a slatted ceiling and lamps hung in rows over the tables. We're at a table at the front,
// laid for us (drawn over us, so it hides where we stop).
// `at`: where each of us sits, on the floor [x, z] (me first); `wx`, `hot`, `cold`: the weather.

const ROOM = { left: -2.5, right: 2.5, back: -11, high: 2.9 };
const T = { wall: '#F5ECDF', side: '#F1E5D3', floor: '#EAD9C3', wood: '#D9B98F', woodPale: '#E6CFAE', white: '#FFFFFF', dark: '#2E2E33',
  metal: '#DFE1E4', cloth: '#FBF8F2', street: '#E3E1DC', facade: ['#EDE6DA', '#E4E7E9', '#EFE2D6', '#E7E3EC'] };
// the sky out of the window, by the weather: [top, toward the horizon]
const SKY = {
  sun: ['#BFD9F2', '#E8F1F8'], partly: ['#CFE0EF', '#ECF2F6'], cloud: ['#D5DAE0', '#E8EAEC'], rain: ['#BAC3CC', '#D6DCE1'],
  storm: ['#9AA5B1', '#C2CAD2'], fog: ['#E8EBEC', '#F0F1F1'], snow: ['#D5DAE0', '#E8EAEC'], hot: ['#F6E7C4', '#FBF3E2'],
};

function sky(kind) {
  const [top, low] = SKY[kind] || SKY.partly;
  return new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color(top) }, uLow: { value: new THREE.Color(low) } },
    vertexShader: 'varying float vY; void main() { vY = (modelMatrix * vec4(position, 1.0)).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vY; uniform vec3 uTop; uniform vec3 uLow; void main() { gl_FragColor = vec4(mix(uLow, uTop, smoothstep(0.0, 40.0, vY)), 1.0); }',
  });
}

// rain running down the glass: thin streaks, leaning with the wind (a storm's thicker)
function rainOnGlass(storm) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uInk: { value: new THREE.Color('#18181B') }, uDense: { value: storm ? 1.6 : 1 } },
    vertexShader: 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vP; uniform vec3 uInk; uniform float uDense;
      float h(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
      void main() {
        vec2 p = vec2(vP.x * 9.0 * uDense + vP.y * 0.6, vP.y * 1.4);
        float col = floor(p.x); float r = h(col);
        float on = step(0.55, r) * smoothstep(0.08, 0.0, abs(fract(p.x) - 0.5)) * step(0.35, fract(p.y + r * 7.0));
        gl_FragColor = vec4(uInk, on * 0.38 + 0.06);
      }`,
  });
}

// a tree on the pavement outside, bare in the cold
function streetTree(parent, at, cold) {
  const g = group(parent, at);
  add(g, rod(0.09, 3.2, 10), inkMaterial('#CDB79C'), [0, 1.6, 0]);
  if (cold) {
    [[0.6, 0.5], [-0.5, 0.7], [0.2, -0.6]].forEach(([x, z]) => { const b = add(g, rod(0.03, 1.4, 6), inkMaterial('#CDB79C'), [x * 0.5, 3.4, z * 0.5]); b.rotation.set(z * 0.6, 0, -x * 0.6); });
    return g;
  }
  const leaf = inkMaterial('#D7E6C8');
  [[0, 4.1, 0, 1.25], [0.8, 3.7, 0.3, 0.9], [-0.7, 3.8, -0.2, 0.95], [0.1, 3.5, 0.8, 0.85], [-0.2, 3.6, -0.8, 0.8]].forEach(([x, y, z, r]) => add(g, new THREE.IcosahedronGeometry(r, 1), leaf, [x, y, z]));
  return g;
}

export function cafe({ at, wx, hot, cold }) {
  const scene = new THREE.Scene();
  const { left, right, back, high } = ROOM;
  const len = 1 - back; // from just behind us to the back wall

  // the light: the day in through the glass front, from the left and above (none, and no shadows, on a dull
  // day: just the room's own light), and the room's light all round
  const sunny = !['cloud', 'rain', 'storm', 'fog', 'snow'].includes(wx);
  const fill = new THREE.HemisphereLight(hot ? '#FFF4DE' : '#FFFFFF', '#E8DCC9', 1.6);
  const key = new THREE.DirectionalLight('#FFFFFF', sunny ? 2.2 : 1.2);
  key.position.set(-4, 6, 6);
  key.target.position.set(0, 0, -6);
  key.castShadow = sunny;
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0008;
  // (lit on both layers: what's in front of us is drawn on its own)
  [fill, key].forEach((l) => l.layers.enableAll());
  scene.add(fill, key, key.target);

  // the room: floor in big tiles, the back wall, the right wall, a ceiling of slats
  // (the room's shell takes shadows but casts none: the light's an illustrator's, falling on what's in it, not
  // shut out by the ceiling)
  const shell = (m) => { m.castShadow = false; return m; };
  shell(add(scene, new THREE.PlaneGeometry(right - left, len), inkMaterial(T.floor, { grid: [0.6, 0.6], hatch: 0.8 }), [0, 0, (1 + back) / 2], [-Math.PI / 2, 0, 0]));
  shell(add(scene, box(right - left + 0.4, high + 0.2, 0.2), inkMaterial(T.wall), [0, high / 2, back - 0.1]));
  shell(add(scene, box(0.2, high + 0.2, len), inkMaterial(T.side), [right + 0.1, high / 2, (1 + back) / 2]));
  // (the slats on the ceiling and the right wall drawn as joints, one line each, not as solid slats: edge on,
  // the solid ones' lines ran together into black)
  shell(add(scene, box(right - left + 0.4, 0.2, len), inkMaterial(T.woodPale, { hatch: 0, grid: [0.36, 0], axes: 'xz' }), [0, high + 0.1, (1 + back) / 2]));

  // the right: slats from the floor to above the door height, a banquette along it, tables for two
  shell(add(scene, box(0.04, 2.5, len), inkMaterial(T.woodPale, { grid: [0.14, 0], axes: 'zy', hatch: 0.5 }), [right - 0.02, 1.25, (1 + back) / 2]));
  add(scene, box(0.08, 0.06, len), inkMaterial(T.wood), [right - 0.04, 2.53, (1 + back) / 2]);
  add(scene, box(0.5, 0.45, 5.2), inkMaterial(T.wood), [right - 0.29, 0.225, -6.9]);
  add(scene, box(0.12, 0.5, 5.2), inkMaterial(T.wood), [right - 0.08, 0.7, -6.9]);
  [[-5.4], [-8.0]].forEach(([z]) => { roundTable(scene, [right - 0.95, 0, z], T.dark); chair(scene, [right - 1.62, 0, z], Math.PI / 2, T.wood); });

  // the left: the glass front (a low wall under it, mullions, a transom), the street beyond
  const sill = 0.5; const head = 2.75;
  shell(add(scene, box(0.25, sill, len), inkMaterial(T.side), [left - 0.12, sill / 2, (1 + back) / 2]));
  shell(add(scene, box(0.25, high - head, len), inkMaterial(T.side), [left - 0.12, (high + head) / 2, (1 + back) / 2]));
  const frame = inkMaterial(T.dark, { hatch: 0 });
  for (let z = 0.2; z >= back; z -= 1.6) shell(add(scene, box(0.07, head - sill, 0.07), frame, [left, (sill + head) / 2, z]));
  shell(add(scene, box(0.07, 0.06, len), frame, [left, 2.25, (1 + back) / 2]));
  add(scene, box(0.32, 0.05, len), inkMaterial(T.wood), [left + 0.05, sill + 0.025, (1 + back) / 2]);
  if (wx === 'rain' || wx === 'storm') add(scene, new THREE.PlaneGeometry(len, head - sill), rainOnGlass(wx === 'storm'), [left, (sill + head) / 2, (1 + back) / 2], [0, Math.PI / 2, 0]);
  // a table for two by the glass, further down
  roundTable(scene, [left + 0.75, 0, -6.6], T.dark);
  chair(scene, [left + 0.75, 0, -5.95], 0, T.wood);
  chair(scene, [left + 0.75, 0, -7.25], Math.PI, T.wood);

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
    const sun = add(scene, new THREE.CircleGeometry(4, 40), new THREE.MeshBasicMaterial({ color: hot ? '#FFF2C4' : '#FFD964' }), [-88, 34, -70], [0, Math.PI / 2, 0]);
    sun.castShadow = false;
  }
  if (wx === 'fog') add(scene, new THREE.PlaneGeometry(len, high), new THREE.MeshBasicMaterial({ color: '#F4F5F5', transparent: true, opacity: 0.72, depthWrite: false }), [left - 0.4, high / 2, (1 + back) / 2], [0, Math.PI / 2, 0]);

  // the back: the counter, the machine, the cake stand; shelves of cups, the menu boards, the kitchen door
  add(scene, box(3.2, 1.0, 0.7), inkMaterial(T.wood, { grid: [0.12, 0], axes: 'xy', hatch: 0.6 }), [0.6, 0.5, back + 1.3]);
  add(scene, box(3.4, 0.05, 0.8), inkMaterial(T.white), [0.6, 1.025, back + 1.3]);
  const machine = group(scene, [1.4, 1.05, back + 1.25]);
  add(machine, box(0.75, 0.45, 0.5), inkMaterial(T.metal), [0, 0.225, 0]);
  add(machine, box(0.75, 0.06, 0.55), inkMaterial(T.dark, { hatch: 0 }), [0, 0.48, 0]);
  [-0.2, 0.2].forEach((x) => { add(machine, rod(0.04, 0.08, 12), inkMaterial(T.dark, { hatch: 0 }), [x, 0.18, 0.27]); add(machine, box(0.04, 0.03, 0.16), inkMaterial(T.dark, { hatch: 0 }), [x, 0.15, 0.36]); });
  [-0.25, -0.08, 0.1].forEach((x) => cup(machine, [x, 0.51, 0]));
  const stand = group(scene, [-0.3, 1.05, back + 1.2]);
  add(stand, rod(0.03, 0.18, 10), inkMaterial(T.white), [0, 0.09, 0]);
  add(stand, rod(0.18, 0.02, 24), inkMaterial(T.white), [0, 0.19, 0]);
  add(stand, new THREE.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), inkMaterial('#F7FBFC'), [0, 0.2, 0]);
  [1.55, 1.95].forEach((y) => {
    add(scene, box(1.9, 0.04, 0.28), inkMaterial(T.wood), [1.2, y, back + 0.14]);
    for (let x = 0.4; x < 2.1; x += 0.26) add(scene, (Math.round(x * 10) % 3 ? rod(0.045, 0.1, 14) : rod(0.06, 0.18, 14)), inkMaterial(Math.round(x * 10) % 3 ? T.white : '#E9DCC4'), [x, y + (Math.round(x * 10) % 3 ? 0.07 : 0.11), back + 0.14]);
  });
  [[-0.35, 2.35], [0.75, 2.35]].forEach(([x, y]) => {
    add(scene, box(1.0, 0.62, 0.04), inkMaterial(T.dark, { hatch: 0 }), [x, y, back + 0.03]);
    [0.12, 0.0, -0.12].forEach((d) => add(scene, box(0.6, 0.015, 0.01), inkMaterial('#F4F4F4', { hatch: 0 }), [x - 0.1, y + d, back + 0.06]));
  });
  add(scene, box(0.9, 2.1, 0.06), inkMaterial('#3A3530', { hatch: 0 }), [-1.75, 1.05, back + 0.02]);
  add(scene, box(1.04, 2.2, 0.04), inkMaterial(T.white), [-1.75, 1.1, back + 0.005]);

  // lamps in rows over the tables, three small ones over the counter
  [-3.4, -5.9, -8.4].forEach((z) => [-1.2, 1.2].forEach((x) => pendant(scene, [x, z], 2.0, high)));
  [-0.2, 0.6, 1.4].forEach((x) => pendant(scene, [x, back + 1.3], 1.95, high, '#F2E6D2'));
  plant(scene, [right - 0.4, 0, back + 0.5], 1.4, { seed: 3 });

  // ours, at the front (drawn over us): a table laid for us, a cloth to the floor; a big plant by the glass
  const xs = at.map(([x]) => x);
  const zs = at.map(([, z]) => z);
  const near = Math.max(...zs) + 0.2; const deep = 0.78;
  const x0 = Math.min(...xs) - 0.55; const x1 = Math.max(...xs) + 0.55;
  const ours = group(scene, [(x0 + x1) / 2, 0, near + deep / 2]);
  add(ours, box(x1 - x0, 0.04, deep), inkMaterial(T.white), [0, 0.75, 0]);
  add(ours, box(x1 - x0 - 0.04, 0.71, deep - 0.04), inkMaterial(T.cloth, { grid: [0.22, 0], axes: 'xy', hatch: 0.6 }), [0, 0.37, 0]);
  at.slice(0, 2).forEach(([x], i) => {
    const lx = x - (x0 + x1) / 2;
    if (i === 0 && at.length === 1) cup(ours, [lx + 0.18, 0.77, -0.12]);
    plate(ours, [lx, 0.77, -0.16]);
    glass(ours, [lx + (i ? -0.24 : 0.24), 0.77, 0.02]);
  });
  inFront(ours);
  inFront(plant(scene, [-1.2, 0, -1.9], 1.05, { seed: 7 }));
  // the chairs we're sat on, their backs behind us
  at.forEach(([x, z]) => chair(scene, [x, 0, z - 0.12], 0, T.wood));

  return { scene, key: key.intensity };
}
