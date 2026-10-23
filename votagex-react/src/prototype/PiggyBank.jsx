import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { pigGeometry, pigTint } from './pigShape';

// 3D travel piggy bank for the home stage (replaces ThaiWell's 3D body model).
// Built from primitives so there is no model file to license. Same light setup as ThaiWell's Body3D.
// A clear glass pig holding a heap of coins: one coin per ฿100, coloured by the jar it belongs to.

const CAP = 300; // a full pig ≈ ฿30,000; past that the heap stays full
const COIN_R = 0.15;
const COIN_T = 0.045;
const INSIDE = { a: 0.86, b: 0.76, c: 1.02 }; // inner half-axes of the glass body
const SLOT = new THREE.Vector3(0, 0.88, -0.05);
const DROP_DELAY = 0.38; // let the sheet slide away first
const UP = new THREE.Vector3(0, 1, 0);
const VERTICAL = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); // face forward, edge into the slot

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Where each coin rests, bottom-up. Coins drop on a height field shaped like the pig's belly:
// each one takes the lowest of a few random spots, tilts with the pile under it, then raises it.
function buildHeap() {
  const { a, b, c } = INSIDE;
  const S = 0.03, NX = Math.ceil((2 * a) / S) + 1, NZ = Math.ceil((2 * c) / S) + 1, M = Math.ceil(COIN_R / S);
  const h = new Float32Array(NX * NZ);
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NZ; j++) {
      const e = 1 - ((-a + i * S) / a) ** 2 - ((-c + j * S) / c) ** 2;
      h[i * NZ + j] = e > 0 ? -b * Math.sqrt(e) : Infinity;
    }
  }
  const at = (x, z) => {
    const i = Math.round((x + a) / S), j = Math.round((z + c) / S);
    return i < 0 || j < 0 || i >= NX || j >= NZ ? Infinity : h[i * NZ + j];
  };
  const footprint = (x, z, fn) => {
    const i0 = Math.round((x + a) / S), j0 = Math.round((z + c) / S);
    for (let i = i0 - M; i <= i0 + M; i++) {
      for (let j = j0 - M; j <= j0 + M; j++) {
        const dx = -a + i * S - x, dz = -c + j * S - z;
        if (dx * dx + dz * dz <= COIN_R * COIN_R) fn(i, j, dx, dz);
      }
    }
  };
  const rand = mulberry32(7);
  const heap = [];
  while (heap.length < CAP) {
    let best = null;
    for (let t = 0, valid = 0; t < 80 && valid < 4; t++) {
      const r = Math.sqrt(rand()), th = rand() * Math.PI * 2;
      const x = r * Math.cos(th) * (a - COIN_R), z = r * Math.sin(th) * (c - COIN_R);
      let max = -Infinity, sum = 0, n = 0;
      footprint(x, z, (i, j) => {
        const v = i < 0 || j < 0 || i >= NX || j >= NZ ? Infinity : h[i * NZ + j];
        max = Math.max(max, v); sum += v; n++;
      });
      if (max === Infinity || !n) continue;
      const y = 0.5 * (max + sum / n) + COIN_T / 2, top = y + COIN_T;
      // above the middle the glass curves back in
      if (top > 0 && ((Math.abs(x) + COIN_R) / a) ** 2 + ((Math.abs(z) + COIN_R) / c) ** 2 > 1 - (top / b) ** 2) continue;
      valid++;
      if (!best || y < best.y) best = { x, y, z };
    }
    if (!best) break;
    const { x, y, z } = best;
    const k = COIN_R * 0.8, lim = 0.6;
    const slope = (p, q) => (Number.isFinite(p) && Number.isFinite(q) ? THREE.MathUtils.clamp((p - q) / (2 * k), -lim, lim) : 0);
    const sx = slope(at(x + k, z), at(x - k, z)) + (rand() - 0.5) * 0.3;
    const sz = slope(at(x, z + k), at(x, z - k)) + (rand() - 0.5) * 0.3;
    const q = new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(-sx, 1, -sz).normalize());
    q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, rand() * Math.PI * 2));
    footprint(x, z, (i, j, dx, dz) => {
      if (i < 0 || j < 0 || i >= NX || j >= NZ) return;
      h[i * NZ + j] = Math.max(h[i * NZ + j], y + sx * dx + sz * dz + COIN_T * 0.9);
    });
    heap.push({ p: new THREE.Vector3(x, y, z), q });
  }
  return heap;
}

// More coins than fit → keep an even sample so each jar's share of colour stays right
function thin(seq) {
  if (seq.length <= CAP) return seq;
  return Array.from({ length: CAP }, (_, k) => seq[Math.floor(((k + 0.5) * seq.length) / CAP)]);
}

// Darker edges facing away from the camera, so clear glass still reads on a light page
function rimMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { color: { value: new THREE.Color('#5B6B80') }, strength: { value: 0.5 } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color; uniform float strength;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
        gl_FragColor = vec4(color, f * strength);
        #include <colorspace_fragment>
      }`,
  });
}

function buildPig() {
  const pig = new THREE.Group();
  // clear glass: not tone mapped, so the page behind stays its own colour; the edges come from the rim pass.
  // snout and ears carry a pink tint through vertex colours
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF', vertexColors: true, roughness: 0.16, transmission: 1, thickness: 0.4, ior: 1.42,
    clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.3, toneMapped: false,
  });
  const geo = pigGeometry();
  if (!geo.getAttribute('color')) {
    const pos = geo.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const white = new THREE.Color('#FFFFFF'), pink = new THREE.Color('#F4A7BF'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      c.lerpColors(white, pink, pigTint(pos.getX(i), pos.getY(i), pos.getZ(i)));
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const body = new THREE.Mesh(geo, glass);
  body.add(new THREE.Mesh(geo, rimMaterial()));
  pig.add(body);

  // eyes sit on the glass; they draw after it (transparent pass) so it doesn't refract ghost copies of them
  const ink = new THREE.MeshStandardMaterial({ color: '#3B2F45', roughness: 0.25, transparent: true });
  const shine = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true });
  [-0.34, 0.34].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 18), ink);
    eye.position.set(x, 0.3, 0.98);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), shine);
    dot.position.set(x + 0.022, 0.33, 1.04);
    pig.add(eye, dot);
  });
  // dark bottoms for the carved nostrils and coin slot so they read through clear glass
  const hole = new THREE.MeshStandardMaterial({ color: '#4A3F55', roughness: 0.5, transparent: true });
  [-0.1, 0.1].forEach((x) => {
    const n = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), hole);
    n.position.set(x, -0.08, 1.185);
    n.scale.set(0.034, 0.054, 0.02);
    pig.add(n);
  });
  const slit = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.4, 4, 12), hole);
  slit.position.set(0, 0.81, -0.05);
  slit.rotation.z = Math.PI / 2;
  pig.add(slit);
  return pig;
}

const coinGeometry = () => new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_T, 40);
const coinMaterial = (color) => new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.3 });

// Soft contact shadow under the pig
function buildShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(15,23,42,0.3)');
  grd.addColorStop(1, 'rgba(15,23,42,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = -1.0;
  return m;
}

// Stage layout in px: room kept under the floor for stack labels (and the sheet's overlap), and above
// the pig for the speech bubble and piggy tabs
const FLOOR_FROM_BOTTOM = 124;
const TOP_RESERVED = 14;
const LABEL_GAP = 78; // px between stack labels
const LABEL_EDGE = 42; // half a label: the outer stacks stay this far in from the sides
const STACK_Z = 2.7; // the stack row stands well in front of the pig, so there is floor between them
const PIG_SCALE = 1.3; // the pig is drawn bigger than the stacks' layout scale

// Coin stacks on the floor, one per category, in that category's coin colour. One or two stand
// beside the pig; more line up in a row in front of it so their labels never overlap. They sit in the
// stage (not the turning pig) so they keep their place while the pig is spun.
const stackSpots = (n) => (n <= 2
  ? [[-2.05, 0.9], [2.05, 0.9]]
  : Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * (n === 3 ? 1.25 : 1.0), STACK_Z]));
function buildStacks(stacks) {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(COIN_R * 1.7, COIN_R * 1.7, COIN_T * 1.9, 40);
  const t = COIN_T * 1.9;
  const spots = stackSpots(Math.min(stacks.length, 4));
  stacks.slice(0, 4).forEach((s, i) => {
    const [x, z] = spots[i];
    const stack = new THREE.Group();
    stack.position.set(x, -1.0, z);
    const mat = coinMaterial(s.color);
    const rand = mulberry32(i + 3);
    for (let k = 0; k < s.count; k++) {
      const c = new THREE.Mesh(geo, mat);
      c.position.set((rand() - 0.5) * 0.06, t / 2 + k * t, (rand() - 0.5) * 0.06);
      c.rotation.y = rand() * Math.PI;
      stack.add(c);
    }
    const shadow = buildShadow();
    shadow.scale.setScalar(0.32);
    shadow.position.y = 0.001;
    stack.add(shadow);
    group.add(stack);
  });
  return group;
}

function disposeTree(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose(); m.dispose(); });
  });
}

const ease = (k) => 1 - (1 - k) ** 2;

export default function PiggyBank({ pileId, coins = [], stacks = [], onStackLayout, onTap, onVerticalDrag, onDragEnd, className = '' }) {
  const boxRef = useRef(null);
  const api = useRef({});
  const cb = useRef({ onTap, onVerticalDrag, onDragEnd, onStackLayout });
  useEffect(() => { cb.current = { onTap, onVerticalDrag, onDragEnd, onStackLayout }; });

  // scene setup once
  useEffect(() => {
    const box = boxRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    // glass refracts what is drawn behind it, and a transparent canvas reads as milky white,
    // so paint the page's own background instead
    let bgEl = box;
    while (bgEl && getComputedStyle(bgEl).backgroundColor === 'rgba(0, 0, 0, 0)') bgEl = bgEl.parentElement;
    renderer.setClearColor(new THREE.Color(bgEl ? getComputedStyle(bgEl).backgroundColor : '#FFFFFF'), 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping; // keeps the page white behind the glass white
    renderer.toneMappingExposure = 0.95;
    box.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xa7acb2, 1.05));
    const key = new THREE.DirectionalLight(0xfffaf4, 2.3); key.position.set(2, 3, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xe9f0ff, 1.8); rim.position.set(-3, 1, -2); scene.add(rim);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 1.5, 6.4);
    camera.lookAt(0, -0.15, 0);

    const stage = new THREE.Group(); // whole piggy setup, centred on the stage
    scene.add(stage);
    const turn = new THREE.Group(); // rotates with drag
    stage.add(turn);
    const pig = buildPig();
    turn.add(pig);
    // bigger pig, feet still on the floor (y = -1)
    turn.scale.setScalar(PIG_SCALE);
    turn.position.y = PIG_SCALE - 1;
    turn.add(buildShadow());
    let stackGroup = new THREE.Group();
    stage.add(stackGroup);
    // where each stack's base lands on screen, so the page can put its label right under it
    const reportStacks = () => {
      const w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      stage.updateMatrixWorld();
      camera.updateMatrixWorld();
      const toScreen = (v) => { v.project(camera); return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h }; };
      const stacksAt = stackGroup.children.map((g) => toScreen(g.getWorldPosition(new THREE.Vector3())));
      // the floor just in front of the pig's feet, for the total
      const base = toScreen(stage.localToWorld(new THREE.Vector3(0, -1.0, 0.3)));
      cb.current.onStackLayout?.({ stacks: stacksAt, base });
    };

    // the heap: one instance per coin, laid out bottom-up in deposit order
    const heap = buildHeap();
    const pile = new THREE.InstancedMesh(coinGeometry(), coinMaterial('#FFFFFF'), CAP);
    pile.frustumCulled = false;
    pile.count = 0;
    pig.add(pile);
    // coins flying back out of the slot when money is spent
    const flyers = Array.from({ length: 6 }, () => {
      const m = new THREE.Mesh(pile.geometry, coinMaterial('#FFFFFF'));
      m.visible = false;
      pig.add(m);
      return m;
    });

    const st = { base: -0.55, drag: 0, dragging: false, bounceT: -1, seq: null, drops: [], pops: [] };
    const timer = new THREE.Timer();
    timer.connect(document);
    const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3();
    const place = (k, pos, quat, scale = one) => pile.setMatrixAt(k, m4.compose(pos, quat, scale));

    const resize = () => {
      const w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Fit the scene to whatever space the stage has: the floor sits a fixed distance above the bottom
      // (room for the stack labels), and the pig grows to fill the gap up to the tabs, limited by width.
      const pxPerUnit = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.length());
      const floorY = h - FLOOR_FROM_BOTTOM;
      const byWidth = (w * 0.94) / (4.6 * pxPerUnit); // pig + the widest row of stacks ≈ 4.6 units
      // anchor the stacks' floor line at floorY, then shrink until the pig's ears clear the top
      let sc = Math.min(byWidth, 0.95);
      const anchor = () => {
        stage.scale.setScalar(sc);
        stage.position.set(0, 0, 0);
        for (let i = 0; i < 4; i++) {
          stage.updateMatrixWorld();
          const v = stage.localToWorld(new THREE.Vector3(0, -1.0, STACK_Z)).project(camera);
          stage.position.y += (((1 - v.y) / 2) * h - floorY) / pxPerUnit;
        }
        stage.updateMatrixWorld();
        const top = stage.localToWorld(new THREE.Vector3(0, -1.0 + 2.15 * PIG_SCALE, 0)).project(camera);
        return ((1 - top.y) / 2) * h;
      };
      for (let k = 0; k < 6; k++) {
        const top = anchor();
        if (top >= TOP_RESERVED - 1) break;
        sc *= (floorY - TOP_RESERVED) / (floorY - top);
      }
      // keep each stack's label at least LABEL_GAP px from the next, however small the scene gets
      const minStep = LABEL_GAP / (sc * pxPerUnit);
      const kids = stackGroup.children;
      kids.forEach((g, i) => {
        if (kids.length <= 2) g.position.x = Math.sign(g.position.x || 1) * Math.max(2.05, minStep / 2 + 0.2);
        else g.position.x = (i - (kids.length - 1) / 2) * Math.max(kids.length === 3 ? 1.25 : 1.0, minStep);
      });
      // ...but never so wide that the outer labels hang over the edge of the box
      for (let k = 0; k < 3 && kids.length; k++) {
        stage.updateMatrixWorld();
        const far = Math.max(...kids.map((g) => Math.abs(g.getWorldPosition(new THREE.Vector3()).project(camera).x * w / 2)));
        const fit = (w / 2 - LABEL_EDGE) / far;
        if (fit >= 1) break;
        kids.forEach((g) => { g.position.x *= fit; });
      }
      reportStacks();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();

    renderer.setAnimationLoop((time) => {
      timer.update(time);
      const dt = Math.min(timer.getDelta(), 0.05);
      const t = timer.getElapsed();
      // still at rest; drag offsets the angle and eases back afterwards
      if (!st.dragging) st.drag *= 1 - Math.min(1, dt * 2.5);
      turn.rotation.y += (st.base + st.drag - turn.rotation.y) * Math.min(1, dt * 8);

      // new coins: spin down into the slot, then fall onto the pile
      if (st.drops.length) {
        st.drops = st.drops.filter((d) => {
          const k = (t - d.at) / 0.8;
          const { p, q } = heap[d.k];
          if (k < 0) { place(d.k, p, q, zero); return true; }
          if (k < 0.4) {
            const f = ease(k / 0.4);
            v3.set(SLOT.x, SLOT.y + 0.9 * (1 - f), SLOT.z);
            place(d.k, v3, q4.copy(VERTICAL).multiply(new THREE.Quaternion().setFromAxisAngle(UP, (1 - f) * Math.PI * 3)));
          } else if (k < 1) {
            const f = ((k - 0.4) / 0.6) ** 2; // gravity
            v3.lerpVectors(SLOT, p, f);
            place(d.k, v3, q4.slerpQuaternions(VERTICAL, q, Math.min(1, f * 1.4)));
          } else {
            place(d.k, p, q);
            st.bounceT = 0;
            pile.instanceMatrix.needsUpdate = true;
            return false;
          }
          return true;
        });
        pile.instanceMatrix.needsUpdate = true;
      }
      // spent coins: pop up out of the slot and fade away
      st.pops = st.pops.filter((f) => {
        const k = (t - f.at) / 0.7;
        if (k < 0) return true;
        f.mesh.visible = k < 1;
        if (k >= 1) return false;
        f.mesh.position.set(SLOT.x + f.dx * k, SLOT.y + 0.75 * ease(k), SLOT.z);
        f.mesh.quaternion.copy(VERTICAL).multiply(q4.setFromAxisAngle(UP, k * Math.PI * 4));
        f.mesh.scale.setScalar(k > 0.5 ? 1 - (k - 0.5) / 0.5 : 1);
        return true;
      });

      if (st.bounceT >= 0) {
        st.bounceT += dt;
        const b = st.bounceT / 0.4;
        const sq = b < 1 ? Math.sin(b * Math.PI) * 0.05 * (1 - b) : 0;
        pig.scale.set(1 + sq, 1 - sq, 1 + sq);
        if (b >= 1) { st.bounceT = -1; pig.scale.set(1, 1, 1); }
      }
      renderer.render(scene, camera);
    });

    // pointer: horizontal drag spins the pig, vertical drag moves the sheet, a tap opens the piggy
    const el = renderer.domElement;
    el.style.touchAction = 'none';
    let p0 = null;
    const down = (e) => { p0 = { x: e.clientX, y: e.clientY, lastY: e.clientY, t: performance.now(), axis: null }; el.setPointerCapture(e.pointerId); };
    const move = (e) => {
      if (!p0) return;
      const dx = e.clientX - p0.x, dy = e.clientY - p0.y;
      if (!p0.axis && Math.hypot(dx, dy) > 6) p0.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (p0.axis === 'x') { st.dragging = true; st.drag = dx * 0.012; }
      if (p0.axis === 'y') { cb.current.onVerticalDrag?.(p0.lastY - e.clientY); }
      p0.lastY = e.clientY;
    };
    const up = () => {
      if (!p0) return;
      if (!p0.axis && performance.now() - p0.t < 450) cb.current.onTap?.();
      if (p0.axis === 'y') cb.current.onDragEnd?.();
      st.dragging = false;
      p0 = null;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);

    api.current = {
      setStacks: (list) => {
        stage.remove(stackGroup);
        disposeTree(stackGroup);
        stackGroup = buildStacks(list);
        stage.add(stackGroup);
        resize();
      },
      setCoins: (seq, animate = true) => {
        const prev = st.seq;
        st.seq = seq;
        const shown = thin(seq).slice(0, heap.length);
        const color = new THREE.Color();
        shown.forEach((c, k) => {
          pile.setColorAt(k, color.set(c));
          place(k, heap[k].p, heap[k].q);
        });
        pile.count = shown.length;
        if (pile.instanceColor) pile.instanceColor.needsUpdate = true;
        pile.instanceMatrix.needsUpdate = true;
        st.drops = [];
        st.pops.forEach((f) => { f.mesh.visible = false; });
        st.pops = [];
        if (!prev || !animate) return;
        const now = timer.getElapsed() + DROP_DELAY;
        if (seq.length > prev.length && prev.every((c, i) => seq[i] === c)) {
          // a deposit: the last few coins fall in one by one, any more just appear
          const n = Math.min(seq.length - prev.length, 10, shown.length);
          for (let i = 0; i < n; i++) st.drops.push({ k: shown.length - n + i, at: now + i * 0.14 });
        } else if (seq.length < prev.length) {
          const left = {};
          seq.forEach((c) => { left[c] = (left[c] || 0) + 1; });
          const gone = prev.filter((c) => !(left[c]-- > 0));
          st.pops = gone.slice(0, flyers.length).map((c, i) => {
            flyers[i].material.color.set(c);
            return { mesh: flyers[i], at: now + i * 0.1, dx: (i % 2 ? 1 : -1) * (0.15 + i * 0.05) };
          });
        }
      },
    };

    return () => {
      renderer.setAnimationLoop(null);
      timer.dispose();
      ro.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      disposeTree(scene);
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.remove();
      api.current = {};
    };
  }, []);

  const stackKey = stacks.map((s) => `${s.color}:${s.count}`).join('|');
  useEffect(() => {
    api.current.setStacks?.(stackKey ? stackKey.split('|').map((x) => { const [color, n] = x.split(':'); return { color, count: Number(n) }; }) : []);
  }, [stackKey]);

  // coins change → refill the pile (a deposit drops the new ones in, spending pops some out);
  // switching to another piggy (pileId) just swaps the pile without any coins flying
  const coinKey = coins.join(',');
  const lastPile = useRef(pileId);
  useEffect(() => {
    api.current.setCoins?.(coinKey ? coinKey.split(',') : [], lastPile.current === pileId);
    lastPile.current = pileId;
  }, [coinKey, pileId]);

  return <div ref={boxRef} className={`pt-piggy ${className}`} aria-label="กระปุกเงินเที่ยว" role="button" />;
}
