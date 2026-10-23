import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

// The glass pig as one smooth surface: a signed-distance shape (body, legs, snout, ears and tail blended
// together, nostrils and the coin slot carved in), polygonised once with marching cubes.
// Snout points to +z. Units match the coin heap inside (body half-axes 1 × 0.88 × 1.16).

const H = 1.42; // half size of the sampled cube
const RES = 104;

const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);

function ellipsoid(x, y, z, a, b, c) {
  const k0 = len3(x / a, y / b, z / c), k1 = len3(x / (a * a), y / (b * b), z / (c * c));
  return k1 ? (k0 * (k0 - 1)) / k1 : -Math.min(a, b, c);
}
// vertical rounded cylinder: radius r, half height h, edge rounding e
function cylinderY(x, y, z, r, h, e) {
  const dx = Math.hypot(x, z) - r + e, dy = Math.abs(y) - h + e;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - e;
}

function rotX(y, z, a) { const c = Math.cos(a), s = Math.sin(a); return [c * y - s * z, s * y + c * z]; }
function rotZ(x, y, a) { const c = Math.cos(a), s = Math.sin(a); return [c * x - s * y, s * x + c * y]; }

function ear(x, y, z, side) {
  // a soft triangular flap leaning out and forward
  let px = x - 0.46 * side, py = y - 0.74, pz = z - 0.36;
  [px, py] = rotZ(px, py, 0.5 * side);
  [py, pz] = rotX(py, pz, -0.75);
  const t = THREE.MathUtils.clamp(py / 0.38, 0, 1); // 0 at the base → 1 at the tip
  const w = 0.23 * (1 - t * t) + 0.04, th = 0.06 * (1 - t) + 0.03;
  const flap = ellipsoid(px, 0, pz, w, 1, th);
  return Math.max(flap, Math.abs(py - 0.19) - 0.19) - 0.01;
}

function snoutSDF(x, y, z) {
  const sd = Math.hypot(x, y + 0.08) - 0.3 + 0.07, sh = Math.abs(z - 1.06) - 0.16 + 0.07;
  return Math.min(Math.max(sd, sh), 0) + Math.hypot(Math.max(sd, 0), Math.max(sh, 0)) - 0.07;
}

// 0..1 pink tint for the snout and ears
export function pigTint(x, y, z) {
  const near = (d, w) => 1 - THREE.MathUtils.smoothstep(d, 0, w);
  return Math.max(near(snoutSDF(x, y, z), 0.05), near(Math.min(ear(x, y, z, 1), ear(x, y, z, -1)), 0.06));
}

function pigSDF(x, y, z) {
  let d = ellipsoid(x, y, z, 1, 0.88, 1.16);
  // legs: short stubs that swell into the belly, flat feet
  const lx = Math.abs(x) - 0.48, lz = Math.abs(z) - 0.5;
  d = smin(d, cylinderY(lx, y + 0.78, lz, 0.19 - (y + 0.78) * 0.05, 0.22, 0.07), 0.22);
  // snout: a rounded disc on the face
  const sy = y + 0.08;
  d = smin(d, snoutSDF(x, y, z), 0.14);
  // nostrils
  const nos = Math.min(ellipsoid(x - 0.1, sy, z - 1.22, 0.045, 0.07, 0.06), ellipsoid(x + 0.1, sy, z - 1.22, 0.045, 0.07, 0.06));
  d = smax(d, -nos, 0.03);
  // ears
  d = smin(d, Math.min(ear(x, y, z, 1), ear(x, y, z, -1)), 0.1);
  // curly tail: part of a torus on the back
  const tx = x, ty = y - 0.1, tz = z + 1.17;
  const q = Math.hypot(ty, tx) - 0.1;
  const tail = Math.hypot(q, tz) - 0.045;
  d = smin(d, Math.max(tail, -(ty + 0.03) ), 0.06);
  // coin slot across the back
  const gx = Math.abs(x) - 0.22, gy = y - 0.88, gz = Math.abs(z + 0.05) - 0.028;
  const slot = Math.max(gx, gz, -gy - 0.09);
  d = smax(d, -slot + 0.0, 0.025);
  return d;
}

let cached = null;
export function pigGeometry() {
  if (cached) return cached;
  const mc = new MarchingCubes(RES, new THREE.MeshBasicMaterial(), false, false, 90000);
  mc.isolation = 0;
  const half = RES / 2;
  for (let k = 0; k < RES; k++) {
    for (let j = 0; j < RES; j++) {
      for (let i = 0; i < RES; i++) {
        // inside is positive for marching cubes
        mc.field[RES * RES * k + RES * j + i] = -pigSDF(((i - half) / half) * H, ((j - half) / half) * H, ((k - half) / half) * H);
      }
    }
  }
  mc.update();
  const n = mc.geometry.drawRange.count;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(mc.positionArray.slice(0, n * 3).map((v) => v * H), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(mc.normalArray.slice(0, n * 3), 3));
  geo.normalizeNormals();
  geo.computeBoundingSphere();
  mc.geometry.dispose();
  mc.material.dispose();
  cached = geo;
  return geo;
}
