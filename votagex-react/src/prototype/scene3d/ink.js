import * as THREE from 'three';

// The day scene's places built in 3D and drawn as an architect's sketch: a fine pencil line round every edge
// (where a thing stands out against what's behind it, and where its faces meet), a little unsteady and pressed
// harder here and lighter there, on white paper with a thin wash of colour, the shade in quick hatched strokes.
// The people (DayScene) keep their own heavier line, so they stand out of it.
// Three passes: the colour (with the hatching and any drawn joints: tiles, paving, boards), the normals, then
// the lines found where the depth or the normals jump. Drawn half as big again and scaled down, so the fine
// lines come out smooth.

export const INK = new THREE.Color('#2B2B30'); // graphite, a shade off the people's black
const SS = 1.5;

// what a tint becomes: a thin wash of it, as watercolour on the paper (lighter, less saturated); a dark thing (a
// board, a lamp's cord) isn't filled in but hatched densely, `shade`
function paint(tint) {
  const hsl = {};
  new THREE.Color(tint).getHSL(hsl, THREE.SRGBColorSpace);
  const dark = hsl.l < 0.4;
  return { color: new THREE.Color().setHSL(hsl.h, hsl.s * 0.7, dark ? 0.9 : 1 - (1 - hsl.l) * 0.5, THREE.SRGBColorSpace), shade: dark ? 1 : 0 };
}
// noise for the hand: a hash and a smooth value noise
const NOISE = /* glsl */`
  float inkHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float inkNoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(inkHash(i), inkHash(i + vec2(1.0, 0.0)), f.x), mix(inkHash(i + vec2(0.0, 1.0)), inkHash(i + vec2(1.0, 1.0)), f.x), f.y); }`;

// a material in a flat tint, hatched where the key light doesn't reach (`hatch` 0 for none), with joints drawn
// on it every `grid` m along two of the world's axes (`axes`: 'xz' a floor, 'zy' a side wall, 'xy' a back one)
export function inkMaterial(tint, { hatch = 1, grid = null, axes = 'xz', joints = 0.42, side = THREE.FrontSide, transparent = false, opacity = 1 } = {}) {
  const { color, shade } = paint(tint);
  const m = new THREE.MeshLambertMaterial({ color, side, transparent, opacity });
  m.userData.ink = { uHatch: { value: hatch }, uShade: { value: shade }, uKey: { value: 1 }, uPx: { value: 1 }, uInk: { value: INK }, uGrid: { value: new THREE.Vector2(...(grid || [0, 0])) }, uJoints: { value: joints } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, m.userData.ink);
    if (grid) shader.defines = { ...shader.defines, INK_GRID: 1, [`INK_${axes.toUpperCase()}`]: 1 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vInkWorld;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_INSTANCING
          vInkWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vInkWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vInkWorld;
        uniform float uHatch; uniform float uShade; uniform float uKey; uniform float uPx; uniform vec3 uInk; uniform vec2 uGrid; uniform float uJoints;
        ${NOISE}
        // hatching strokes leaning dir, gap css px apart: fine, wavering a little, broken where a stroke ends
        float inkStrokes(vec2 fc, float dir, float gap) {
          float u = (fc.x + dir * fc.y) / gap; float v = (dir * fc.x - fc.y) / gap; float k = floor(u);
          float d = abs(fract(u + (inkNoise(vec2(k * 3.1, v * 0.12)) - 0.5) * 0.3) - 0.5) * gap;
          return (1.0 - smoothstep(0.18, 0.5, d)) * step(0.3, inkNoise(vec2(k * 7.3, v * 0.2)));
        }`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        // how much of the key light falls here (shadow included), 0–1
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        float lit = clamp(dot(reflectedLight.directDiffuse, vec3(0.299, 0.587, 0.114)) * PI / max(lum * uKey, 1e-4), 0.0, 1.0);
        vec3 tone = diffuseColor.rgb * mix(0.96, 1.0, smoothstep(0.2, 0.6, lit));
        vec2 fc = gl_FragCoord.xy / uPx;
        float ink = max(inkStrokes(fc, 1.0, 5.5) * (1.0 - smoothstep(0.26, 0.36, lit)), inkStrokes(fc, -1.0, 5.5) * (1.0 - smoothstep(0.06, 0.14, lit))) * 0.5 * uHatch;
        ink = max(ink, max(inkStrokes(fc, 1.0, 3.2), inkStrokes(fc, -0.6, 4.0) * 0.8) * 0.5 * uShade);
        #ifdef INK_GRID
          #if defined(INK_XZ)
            vec2 gp = vInkWorld.xz;
          #elif defined(INK_ZY)
            vec2 gp = vInkWorld.zy;
          #else
            vec2 gp = vInkWorld.xy;
          #endif
          vec2 gq = gp / max(uGrid, vec2(1e-3));
          vec2 gd = abs(fract(gq - 0.5) - 0.5) / max(fwidth(gq), vec2(1e-5));
          vec2 on = (1.0 - smoothstep(0.25, 0.8, gd / uPx)) * step(vec2(1e-3), uGrid);
          ink = max(ink, max(on.x, on.y) * uJoints);
        #endif
        gl_FragColor.rgb = mix(tone, uInk, ink);`);
  };
  return m;
}

// the line pass: the colour with a pencil line wherever the depth jumps (an outline against what's behind) or
// the faces turn (a crease); the hand a little unsteady (where it looks wavers, `uWob` px), pressing harder and
// lighter along a line, and lighter with the distance
const LINES = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: null }, tDepth: { value: null }, tNormal: { value: null }, uTexel: { value: new THREE.Vector2() }, uWidth: { value: 1 },
    uNear: { value: 0.1 }, uFar: { value: 100 }, uInk: { value: INK }, uFade: { value: new THREE.Vector2(30, 160) }, uWob: { value: 1.5 }, uPx: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */`
    varying vec2 vUv;
    uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tNormal;
    uniform vec2 uTexel; uniform float uWidth; uniform float uNear; uniform float uFar; uniform vec3 uInk; uniform vec2 uFade; uniform float uWob; uniform float uPx;
    ${NOISE}
    // 1 / view distance: on a flat face it changes evenly across the picture, so its second difference is 0
    float w(vec2 uv) { float z = texture2D(tDepth, uv).r * 2.0 - 1.0; return (uFar + uNear - z * (uFar - uNear)) / (2.0 * uNear * uFar); }
    vec3 n(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
    void main() {
      vec4 c = texture2D(tColor, vUv);
      vec2 fc = gl_FragCoord.xy / uPx;
      vec2 uv = vUv + (vec2(inkNoise(fc / 24.0), inkNoise(fc / 24.0 + 31.7)) - 0.5) * uTexel * uWob;
      vec2 dx = vec2(uTexel.x * uWidth, 0.0); vec2 dy = vec2(0.0, uTexel.y * uWidth);
      float w0 = w(uv);
      float lap = abs(w(uv - dx) + w(uv + dx) - 2.0 * w0) + abs(w(uv - dy) + w(uv + dy) - 2.0 * w0)
        + 0.5 * (abs(w(uv - dx - dy) + w(uv + dx + dy) - 2.0 * w0) + abs(w(uv - dx + dy) + w(uv + dx - dy) - 2.0 * w0));
      float edgeD = smoothstep(0.012, 0.03, lap / max(w0, 1e-5));
      vec3 n0 = n(uv);
      float turn = (1.0 - dot(n0, n(uv - dx))) + (1.0 - dot(n0, n(uv + dx))) + (1.0 - dot(n0, n(uv - dy))) + (1.0 - dot(n0, n(uv + dy)));
      float edgeN = smoothstep(0.3, 0.6, turn);
      // (further off, the lines fainter, as the air between pales what's there; the pressure varying along them)
      float e = max(edgeD, edgeN) * (1.0 - 0.75 * smoothstep(uFade.x, uFade.y, 1.0 / max(w0, 1e-5))) * mix(0.55, 0.95, inkNoise(fc / 26.0));
      gl_FragColor = vec4(mix(c.rgb, uInk, e), max(c.a, e));
      #include <colorspace_fragment>
    }`,
  depthTest: false,
  depthWrite: false,
});
const NORMALS = new THREE.MeshNormalMaterial();
const QUAD = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), LINES);
QUAD.frustumCulled = false;
const QUAD_SCENE = new THREE.Scene();
QUAD_SCENE.add(QUAD);
const QUAD_CAM = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// one renderer for every scene (one WebGL context), drawn off the page and copied onto each scene's canvases
let shared = null;
function renderer() {
  if (shared) return shared;
  const r = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;
  const color = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(1, 1, THREE.FloatType) });
  const normal = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  shared = { r, color, normal };
  return shared;
}

// draw `scene` through `camera` (camera.layers chooses what's in it) onto `canvas`, `w`×`h` css px at `dpr`
export function draw(scene, camera, canvas, { w, h, dpr, key, fade = [30, 160] }) {
  const { r, color, normal } = renderer();
  const px = dpr * SS;
  const W = Math.round(w * px); const H = Math.round(h * px);
  r.setPixelRatio(1);
  r.setSize(W, H, false);
  color.setSize(W, H); normal.setSize(W, H);
  scene.traverse((o) => {
    const ms = !o.material ? [] : Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach((m) => { if (m.userData.ink) { m.userData.ink.uPx.value = px; m.userData.ink.uKey.value = key; } });
  });
  r.setClearColor(0x000000, 0);
  r.setRenderTarget(color); r.clear(); r.render(scene, camera);
  const bg = scene.background; scene.background = null;
  scene.overrideMaterial = NORMALS;
  r.setClearColor(0x8080ff, 1);
  r.setRenderTarget(normal); r.clear(); r.render(scene, camera);
  scene.overrideMaterial = null; scene.background = bg;
  LINES.uniforms.tColor.value = color.texture;
  LINES.uniforms.tDepth.value = color.depthTexture;
  LINES.uniforms.tNormal.value = normal.texture;
  LINES.uniforms.uTexel.value.set(1 / W, 1 / H);
  LINES.uniforms.uWidth.value = 1;
  LINES.uniforms.uPx.value = px;
  LINES.uniforms.uWob.value = 1.4 * px;
  LINES.uniforms.uNear.value = camera.near; LINES.uniforms.uFar.value = camera.far;
  LINES.uniforms.uFade.value.set(...fade);
  r.setRenderTarget(null);
  r.setClearColor(0x000000, 0); r.clear();
  r.render(QUAD_SCENE, QUAD_CAM);
  const cw = Math.round(w * dpr); const ch = Math.round(h * dpr);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(r.domElement, 0, 0, W, H, 0, 0, cw, ch);
}

// the camera the people are drawn for: level (upright things stay upright), from `eye` m up, the horizon
// `cy` px down the picture and the vanishing point `cx` px across it, `f` px for a metre at a metre off
export function levelCamera({ w, h, f, cx, cy, eye }) {
  const cam = new THREE.PerspectiveCamera(50, w / h, 0.1, 120);
  cam.position.set(0, eye, 0);
  cam.lookAt(0, eye, -1);
  cam.updateMatrixWorld();
  const n = cam.near;
  cam.projectionMatrix.makePerspective((-cx * n) / f, ((w - cx) * n) / f, (cy * n) / f, (-(h - cy) * n) / f, n, cam.far);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  return cam;
}

// free what a scene made
export function dispose(scene) {
  scene.traverse((o) => {
    o.geometry?.dispose();
    (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => { m.map?.dispose(); m.dispose(); });
  });
}
