import { perforated } from './stamps';

// A stamp struck in black metal (after Bill Guo's "Selvedge Denim": kogei, obsidian), lit by a light that
// follows the finger. The relief is worked out once on the CPU: the stamp's words, frame and rings raised,
// a little of its photo's light, and a swirl engraved over the whole face like the weave of the denim. The
// GPU only lights it, so each frame is a few texture reads a pixel.

const TW = 512; const TH = 637; // the relief's size: the stamp's 148 × 184, at 3.46×
const K = TW / 148;

const DISPLAY = "'Kanit', sans-serif";
const UI = "'IBM Plex Sans Thai', sans-serif";

// value noise from a seeded hash, and fbm over it
function hash(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y) {
  const xi = Math.floor(x); const yi = Math.floor(y); const xf = x - xi; const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf); const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi); const b = hash(xi + 1, yi); const c = hash(xi, yi + 1); const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let s = 0; let a = 0.5;
  for (let i = 0; i < 4; i += 1) { s += a * noise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; }
  return s;
}

// a separable box blur, twice (close to a gaussian), in place
function blur(src, w, h, r) {
  const tmp = new Float32Array(src.length);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let y = 0; y < h; y += 1) {
      let acc = 0; const row = y * w;
      for (let x = -r; x <= r; x += 1) acc += src[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x += 1) {
        tmp[row + x] = acc / (2 * r + 1);
        acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x += 1) {
      let acc = 0;
      for (let y = -r; y <= r; y += 1) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y += 1) {
        src[y * w + x] = acc / (2 * r + 1);
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
  }
}

const loadImage = (src) => new Promise((ok) => {
  if (!src) { ok(null); return; }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => ok(img); img.onerror = () => ok(null);
  img.src = src;
});

// the stamp's face, white where it is raised, on a canvas the relief's size
function drawFace(ctx, stamp, img) {
  const s = (v) => v * K;
  ctx.save();
  ctx.clip(new Path2D(perforated(TW, TH, s(4), s(13))));
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, TW, TH);
  // the photo's light, faint, as a low relief inside the frame
  const art = { x: s(9), y: s(9), w: s(130), h: s(135) };
  if (img) {
    const k = Math.max(art.w / img.width, art.h / img.height);
    ctx.save();
    ctx.beginPath(); ctx.rect(art.x, art.y, art.w, art.h); ctx.clip();
    ctx.globalAlpha = 0.12; ctx.filter = 'grayscale(1)';
    ctx.drawImage(img, art.x + (art.w - img.width * k) / 2, art.y + (art.h - img.height * k) / 2, img.width * k, img.height * k);
    ctx.restore();
  }
  ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff';
  ctx.lineWidth = s(1.6); ctx.strokeRect(art.x, art.y, art.w, art.h);
  // a ring, broken like a dial, with a dotted arc inside it
  const cx = art.x + art.w * 0.64; const cy = art.y + art.h * 0.58; const R = s(34);
  ctx.lineWidth = s(9); ctx.beginPath(); ctx.arc(cx, cy, R, -0.9, Math.PI * 1.55); ctx.stroke();
  for (let i = 0; i < 22; i += 1) {
    const a = Math.PI * 0.75 + (i / 22) * Math.PI * 1.3;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (R - s(13)), cy + Math.sin(a) * (R - s(13)), s(1.6), 0, Math.PI * 2); ctx.fill();
  }
  // its words: the English name and number on the face, the Thai name and year on the foot
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${s(8.5)}px ${UI}`;
  stamp.en.toUpperCase().split(' ').slice(0, 2).forEach((w, i) => ctx.fillText(w.split('').join(String.fromCharCode(8202)), art.x + s(7), art.y + s(17) + i * s(10)));
  ctx.font = `600 ${s(8)}px ${UI}`;
  ctx.fillText(`No.${String(stamp.no).padStart(2, '0')}`, art.x + s(7), art.y + art.h - s(8));
  ctx.textAlign = 'right';
  ctx.fillText(String(stamp.year), art.x + art.w - s(7), art.y + s(17));
  ctx.textAlign = 'left';
  let size = s(20);
  ctx.font = `700 ${size}px ${DISPLAY}`;
  while (ctx.measureText(stamp.name).width > s(100) && size > s(11)) { size -= 1; ctx.font = `700 ${size}px ${DISPLAY}`; }
  ctx.fillText(stamp.name, s(10), TH - s(13));
  ctx.restore();
}

// the relief: height (16 bits, in red and green) and the stamp's shape (alpha)
async function relief(stamp) {
  await document.fonts?.ready;
  const img = await loadImage(stamp.photo);
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  let px;
  try { drawFace(ctx, stamp, img); px = ctx.getImageData(0, 0, TW, TH).data; } catch {
    // a photo from elsewhere without CORS taints the canvas: strike the stamp without it
    ctx.clearRect(0, 0, TW, TH); drawFace(ctx, stamp, null); px = ctx.getImageData(0, 0, TW, TH).data;
  }
  const n = TW * TH;
  const art = new Float32Array(n); const edge = new Float32Array(n); const shape = new Float32Array(n);
  for (let i = 0; i < n; i += 1) { shape[i] = px[i * 4 + 3] / 255; art[i] = px[i * 4] / 255; edge[i] = shape[i]; }
  blur(art, TW, TH, 2);
  blur(edge, TW, TH, 5);
  // the engraved swirl, worked out at half size and read back smoothly
  const SW = TW >> 1; const SH = Math.ceil(TH / 2); const swirl = new Float32Array(SW * SH);
  const seed = (stamp.no || 1) * 7.31;
  for (let y = 0; y < SH; y += 1) {
    for (let x = 0; x < SW; x += 1) {
      const u = (x / SW) * 2.6 + seed; const v = (y / SW) * 2.6;
      const qx = fbm(u * 1.4, v * 1.4); const qy = fbm(u * 1.4 + 5.2, v * 1.4 + 1.3);
      const f = fbm(u * 2 + 2.6 * qx, v * 2 + 2.6 * qy);
      // fine grooves along the field's contours, not waves: 1 on the face, dipping to 0 in each groove
      const g = Math.abs(Math.sin(f * 38));
      swirl[y * SW + x] = Math.min(1, g / 0.3);
    }
  }
  const out = new Uint8Array(n * 4);
  for (let y = 0; y < TH; y += 1) {
    for (let x = 0; x < TW; x += 1) {
      const i = y * TW + x;
      const gx = Math.min(SW - 1.001, x / 2); const gy = Math.min(SH - 1.001, y / 2);
      const x0 = Math.floor(gx); const y0 = Math.floor(gy); const fx = gx - x0; const fy = gy - y0;
      const sw = swirl[y0 * SW + x0] * (1 - fx) * (1 - fy) + swirl[y0 * SW + x0 + 1] * fx * (1 - fy)
        + swirl[(y0 + 1) * SW + x0] * (1 - fx) * fy + swirl[(y0 + 1) * SW + x0 + 1] * fx * fy;
      const h = Math.min(1, Math.max(0, 0.2 * edge[i] + 0.7 * art[i] + 0.07 * sw * (1 - art[i])));
      const q = Math.round(h * 65535);
      out[i * 4] = q >> 8; out[i * 4 + 1] = q & 255; out[i * 4 + 2] = 0; out[i * 4 + 3] = Math.round(shape[i] * 255);
    }
  }
  return out;
}

const VERT = `attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `precision highp float;
uniform sampler2D h; uniform vec2 texel; uniform vec3 light; uniform float grain;
varying vec2 v;
float H(vec2 uv){ vec4 t = texture2D(h, uv); return (t.r * 65280.0 + t.g * 255.0) / 65535.0; }
float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = vec2(v.x, 1.0 - v.y);
  float a = texture2D(h, uv).a;
  if (a < 0.004) { gl_FragColor = vec4(0.0); return; }
  vec2 e = texel * 1.5;
  float hx = H(uv + vec2(e.x, 0.0)) - H(uv - vec2(e.x, 0.0));
  float hy = H(uv + vec2(0.0, e.y)) - H(uv - vec2(0.0, e.y));
  vec3 n = normalize(vec3(-hx * 7.0, hy * 7.0, 1.0));
  float ht = H(uv);
  vec3 pos = vec3(v, ht * 0.04);
  vec3 L = normalize(light - pos);
  vec3 Hv = normalize(L + vec3(0.0, 0.0, 1.0));
  float nh = max(dot(n, Hv), 0.0);
  float diff = max(dot(n, L), 0.0);
  // graphite, with the raised work a shade lighter, polished silver where the light catches an edge
  vec3 base = mix(vec3(0.045, 0.048, 0.058), vec3(0.11, 0.115, 0.13), smoothstep(0.35, 0.8, ht));
  vec3 col = base * (0.55 + 1.5 * diff)
    + vec3(0.85, 0.87, 0.92) * pow(nh, 46.0) * (0.45 + ht)
    + vec3(0.20, 0.22, 0.28) * pow(nh, 7.0) * 0.6
    + vec3(0.07, 0.08, 0.11) * pow(1.0 - n.z, 1.2);
  col += (rnd(gl_FragCoord.xy + grain) - 0.5) * 0.018;
  gl_FragColor = vec4(col * a, a);
}`;

// strikes `stamp` onto `canvas` (sized by CSS); returns { ready, setLight(x, y) in 0..1 of the canvas, stop() }
export function strike(canvas, stamp) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return { ready: Promise.reject(new Error('no webgl')), setLight() {}, stop() {} };
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (name) => gl.getUniformLocation(prog, name);
  const tex = gl.createTexture();

  let want = { x: 0.3, y: 0.75 }; let at = { ...want }; let raf = 0; let alive = true; let led = false; let t0 = 0;
  const frame = (t) => {
    if (!alive) return;
    if (!t0) t0 = t;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr); const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    // untouched, the light drifts round the stamp on its own
    const goal = led ? want : { x: 0.5 + 0.42 * Math.cos((t - t0) / 1900), y: 0.55 + 0.38 * Math.sin((t - t0) / 1900) };
    at = { x: at.x + (goal.x - at.x) * 0.12, y: at.y + (goal.y - at.y) * 0.12 };
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3f(u('light'), at.x, 1 - at.y, 0.55);
    gl.uniform1f(u('grain'), (t % 1000) / 10);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  };
  const ready = relief(stamp).then((data) => {
    if (!alive) return;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TW, TH, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.uniform2f(u('texel'), 1 / TW, 1 / TH);
    raf = requestAnimationFrame(frame);
  });
  return {
    ready,
    setLight(x, y) { led = true; want = { x, y }; },
    // frees what it made but keeps the context: a canvas hands back the same one, so a lost context would
    // leave a remount (React's strict mode does one) with nothing to draw with
    stop() {
      alive = false; cancelAnimationFrame(raf);
      gl.deleteTexture(tex); gl.deleteBuffer(buf); gl.deleteProgram(prog);
    },
  };
}
