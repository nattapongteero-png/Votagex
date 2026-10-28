import * as THREE from 'three';
import { inkMaterial } from './ink';

// Things to build the places from, in metres (y up, the floor at 0), each a group stood at its foot. Drawn as
// ink (ink.js): every edge is lined, so a thing's form is in its shape; only what needs to be dark is.

// put a mesh in `parent` at [x, y, z] (turned by `rot`), casting and taking shadows
export function add(parent, geometry, material, [x, y, z] = [0, 0, 0], rot) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const group = (parent, [x, y, z] = [0, 0, 0], turn = 0) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = turn;
  parent.add(g);
  return g;
};
// draw a thing in front of us (over the people: the table we sit at, a plant at the front), on layer 1
export const inFront = (o) => o.traverse((c) => { c.layers.set(1); c.castShadow = false; });

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const rod = (r, h, seg = 12) => new THREE.CylinderGeometry(r, r, h, seg);
// a turned shape from its profile, [radius, height] pairs from the bottom up
const turned = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

// a café chair, bentwood: a round seat on splayed legs, the back legs running on up into a bent hoop with a rail
// across it, a ring between the legs (facing +z unless turned)
export function chair(parent, at, turn, tint) {
  const g = group(parent, at, turn);
  const wood = inkMaterial(tint);
  add(g, rod(0.2, 0.035, 28), wood, [0, 0.46, 0]);
  [-0.14, 0.14].forEach((x) => { const l = add(g, rod(0.013, 0.46, 8), wood, [x, 0.23, 0.13]); l.rotation.set(0.1, 0, -Math.sign(x) * 0.06); });
  [-0.13, 0.13].forEach((x) => { const l = add(g, rod(0.014, 0.92, 8), wood, [x, 0.46, -0.16]); l.rotation.x = -0.12; });
  add(g, new THREE.TorusGeometry(0.13, 0.016, 8, 20, Math.PI), wood, [0, 0.8, -0.245]).rotation.x = -0.12;
  add(g, box(0.26, 0.022, 0.02), wood, [0, 0.66, -0.225]);
  add(g, new THREE.TorusGeometry(0.15, 0.008, 6, 28), wood, [0, 0.2, -0.01], [Math.PI / 2, 0, 0]);
  return g;
}

// a bar stool for a window counter: a round seat 75 cm up on four legs, a ring for the feet
export function stool(parent, at, tint) {
  const g = group(parent, at);
  const wood = inkMaterial(tint);
  add(g, rod(0.17, 0.04, 24), wood, [0, 0.76, 0]);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => { const l = add(g, rod(0.014, 0.76, 8), wood, [x * 0.12, 0.38, z * 0.12]); l.rotation.set(z * 0.06, 0, -x * 0.06); });
  add(g, new THREE.TorusGeometry(0.15, 0.009, 6, 28), wood, [0, 0.28, 0], [Math.PI / 2, 0, 0]);
  return g;
}

// a little pot of something green, for a ledge or a shelf
export function smallPlant(parent, at, { pot = '#EADFD2', leaf = '#D5E5C6', size = 1 } = {}) {
  const g = group(parent, at);
  g.scale.setScalar(size);
  add(g, turned([[0, 0], [0.06, 0], [0.075, 0.12], [0.08, 0.13], [0, 0.13]]), inkMaterial(pot));
  const m = inkMaterial(leaf, { hatch: 0.5 });
  [[0, 0.2, 0, 0.09], [0.06, 0.17, 0.03, 0.065], [-0.05, 0.17, -0.02, 0.07]].forEach(([x, y, z, r]) => add(g, new THREE.IcosahedronGeometry(r, 1), m, [x, y, z]));
  return g;
}

// a bud vase with a flower in it, for our table
export function budVase(parent, at) {
  const g = group(parent, at);
  add(g, turned([[0, 0], [0.028, 0], [0.034, 0.04], [0.014, 0.1], [0.011, 0.13], [0, 0.13]]), inkMaterial('#EEF3F4'));
  add(g, rod(0.003, 0.12, 5), inkMaterial('#9DB386', { hatch: 0 }), [0.004, 0.18, 0]).rotation.z = -0.12;
  add(g, new THREE.IcosahedronGeometry(0.022, 1), inkMaterial('#F3C9B8', { hatch: 0 }), [0.012, 0.245, 0]);
  return g;
}

// a round café table on a pedestal
export function roundTable(parent, at, tint, top = '#FFFFFF') {
  const g = group(parent, at);
  add(g, rod(0.34, 0.035, 36), inkMaterial(top), [0, 0.73, 0]);
  add(g, rod(0.035, 0.7, 12), inkMaterial(tint), [0, 0.37, 0]);
  add(g, rod(0.22, 0.03, 28), inkMaterial(tint), [0, 0.015, 0]);
  return g;
}

// a lamp hung on a cord from the ceiling (`high`), its shade's foot `low` off the floor
export function pendant(parent, [x, z], low, high, tint = '#FFFFFF') {
  const g = group(parent, [x, low, z]);
  add(g, rod(0.006, high - low - 0.22, 6), inkMaterial('#3A3A40', { hatch: 0 }), [0, 0.22 + (high - low - 0.22) / 2, 0]);
  const shade = inkMaterial(tint, { side: THREE.DoubleSide });
  add(g, turned([[0.24, 0], [0.22, 0.05], [0.16, 0.14], [0.07, 0.2], [0.035, 0.225]]), shade);
  add(g, new THREE.SphereGeometry(0.045, 16, 12), inkMaterial('#FFF6D8', { hatch: 0 }), [0, 0.02, 0]);
  return g;
}

// a leaf, folded along its rib (the fold is drawn), bending over: `len` long, `wide` across, out along +y
function leafGeometry(len, wide, bend = 0.25, fold = 0.35) {
  const n = 10; const pos = []; const idx = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n; const half = wide * 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.8;
    const y = t * len; const z = bend * len * t * t;
    pos.push(0, y, z, -half, y, z + half * fold, half, y, z + half * fold);
  }
  for (let i = 0; i < n; i += 1) {
    const a = i * 3; const b = a + 3;
    idx.push(a, a + 1, b, a + 1, b + 1, b, a, b, a + 2, a + 2, b, b + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// a pot plant, big leaves on stems fanning out round the pot (`size` its height scale)
export function plant(parent, at, size = 1, { pot = '#EADFD2', leaf = '#D5E5C6', seed = 1 } = {}) {
  const g = group(parent, at);
  g.scale.setScalar(size);
  add(g, turned([[0, 0], [0.17, 0], [0.22, 0.42], [0.25, 0.44], [0.25, 0.5], [0.21, 0.5], [0.2, 0.47], [0, 0.47]]), inkMaterial(pot));
  const leafMat = inkMaterial(leaf, { side: THREE.DoubleSide, hatch: 0.5 });
  const stem = inkMaterial('#9DB386', { hatch: 0 });
  let r = seed * 9301;
  const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (let i = 0; i < 11; i += 1) {
    const turn = (i / 11) * Math.PI * 2 + rand() * 0.4;
    const lean = 0.35 + rand() * 0.55; const h = 0.35 + rand() * 0.35;
    const s = group(g, [0, 0.46, 0], turn);
    const st = add(s, rod(0.008, h, 5), stem, [0, h / 2, 0]);
    st.rotation.x = lean * 0.5;
    st.position.z = Math.sin(lean * 0.5) * h / 2;
    const l = add(s, leafGeometry(0.42 + rand() * 0.2, 0.2 + rand() * 0.08), leafMat, [0, Math.cos(lean * 0.5) * h, Math.sin(lean * 0.5) * h]);
    l.rotation.set(lean, 0, (rand() - 0.5) * 0.5);
  }
  return g;
}

// a cup on a saucer, a plate with food on it, a glass
export function cup(parent, at, tint = '#FFFFFF') {
  const g = group(parent, at);
  add(g, rod(0.075, 0.012, 24), inkMaterial(tint), [0, 0.006, 0]);
  add(g, turned([[0, 0], [0.035, 0], [0.045, 0.075], [0.048, 0.08], [0.044, 0.08], [0, 0.07]]), inkMaterial(tint), [0, 0.012, 0]);
  add(g, new THREE.TorusGeometry(0.022, 0.006, 6, 12, Math.PI * 1.3), inkMaterial(tint), [0.052, 0.055, 0], [0, 0, -Math.PI * 0.65]);
  return g;
}
export function plate(parent, at, food = '#F2C98A') {
  const g = group(parent, at);
  add(g, turned([[0, 0], [0.09, 0], [0.13, 0.012], [0.135, 0.018], [0.12, 0.016], [0, 0.008]]), inkMaterial('#FFFFFF'));
  const dome = add(g, new THREE.SphereGeometry(0.075, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), inkMaterial(food), [0, 0.01, 0]);
  dome.scale.y = 0.55;
  return g;
}
export function glass(parent, at) {
  const g = group(parent, at);
  add(g, turned([[0, 0], [0.032, 0], [0.038, 0.13], [0.034, 0.13], [0.028, 0.008], [0, 0.008]]), inkMaterial('#F4F8FA', { side: THREE.DoubleSide }));
  return g;
}

export { box, rod, turned };
