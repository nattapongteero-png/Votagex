import { BEAT, FPS, cuesFor } from './recapShots';

// The recap's sound, synthesized in the browser (no sound files): a short track in F major on the film's beat
// grid (112.5 bpm), F–C–Dm–B♭ a bar each, that builds with the film — a plucked arpeggio and a pad under the
// opening, hats and claps from the big words, kick and bass from the trip's card, a riser into the numbers,
// then only the pad and a chime under the close. Over it, a sound for every cue the film draws to (recapShots
// cuesFor): pops pitched to the key, dings for the map's pins, typing ticks, a shutter for each photo,
// whooshes and an iris sweep on the cuts, impacts on the colour blocks. Noise is seeded (mulberry32), so the
// track is the same every time. The mix is measured as integrated loudness (ITU-R BS.1770: K-weighting,
// 400 ms blocks, gated) and set to -14 LUFS, with a soft limiter keeping peaks under -1 dBFS.

const SR = 44100;
const sec = (f) => f / FPS;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const CHORDS = [[65, 69, 72], [60, 64, 67], [62, 65, 69], [58, 62, 65]]; // F, C, Dm, B♭ (from F4)
const ROOTS = [41, 36, 38, 34];
const PENTA = [65, 67, 69, 72, 74, 77, 79, 81, 84]; // F major pentatonic, for the pops

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// integrated loudness (LUFS) of a stereo buffer, per BS.1770
async function loudness(buf) {
  const ctx = new OfflineAudioContext(2, buf.length, SR);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const shelf = ctx.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 1681; shelf.gain.value = 4;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38; hp.Q.value = 0.5;
  src.connect(shelf).connect(hp).connect(ctx.destination); src.start();
  const k = await ctx.startRendering();
  const L = k.getChannelData(0); const R = k.getChannelData(1);
  const size = Math.round(0.4 * SR); const hop = Math.round(0.1 * SR);
  const blocks = [];
  for (let i = 0; i + size <= L.length; i += hop) {
    let s = 0;
    for (let j = i; j < i + size; j += 1) s += L[j] * L[j] + R[j] * R[j];
    blocks.push(s / size);
  }
  const lufs = (ms) => -0.691 + 10 * Math.log10(ms);
  const abs = blocks.filter((ms) => lufs(ms) > -70);
  const rel = lufs(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((ms) => lufs(ms) > rel);
  return lufs(gated.reduce((a, b) => a + b, 0) / gated.length);
}

function wav(buf) {
  const n = buf.length; const out = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, SR, true);
  out.setUint32(28, SR * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
  const L = buf.getChannelData(0); const R = buf.getChannelData(1);
  for (let i = 0; i < n; i += 1) {
    out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
    out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true);
  }
  return new Blob([out], { type: 'audio/wav' });
}

export async function buildSound(d, shots, total) {
  const ctx = new OfflineAudioContext(2, Math.ceil((sec(total) + 2.5) * SR), SR);
  const rnd = mulberry32(7);
  const noise = ctx.createBuffer(1, SR, SR);
  noise.getChannelData(0).forEach((_, i, a) => { a[i] = rnd() * 2 - 1; });
  const master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.008; comp.release.value = 0.18;
  master.connect(comp).connect(ctx.destination);
  const bus = (gain, pan = 0) => { const g = ctx.createGain(); g.gain.value = gain; const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(master); return g; };
  const music = bus(0.8); const drums = bus(0.9); const fx = bus(0.85);

  const shape = (g, t, attack, peak, decay) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  };
  const tone = (out, type, f, t, decay, peak, o = {}) => {
    const osc = ctx.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || decay));
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain(); shape(g, t, o.attack || 0.004, peak, decay);
    let node = osc;
    if (o.lp) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(o.lp, t); if (o.lpTo) lp.frequency.exponentialRampToValueAtTime(o.lpTo, t + decay); node.connect(lp); node = lp; }
    let dest = out;
    if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; p.connect(out); dest = p; }
    node.connect(g).connect(dest);
    osc.start(t); osc.stop(t + decay + 0.1);
  };
  const hiss = (out, t, len, peak, type, f, o = {}) => {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = o.q || 0.8;
    if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t + len);
    const g = ctx.createGain();
    if (o.swell) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + len * o.swell); g.gain.exponentialRampToValueAtTime(0.0001, t + len); } else shape(g, t, 0.002, peak, len);
    let dest = out;
    if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; p.connect(out); dest = p; }
    s.connect(flt).connect(g).connect(dest);
    s.start(t, rnd() * 0.8); s.stop(t + len + 0.05);
  };

  // instruments
  const kick = (t, peak = 0.9) => tone(drums, 'sine', 150, t, 0.34, peak, { to: 42, glide: 0.11 });
  const clap = (t) => { [0, 0.011, 0.022].forEach((dt) => hiss(drums, t + dt, 0.018, 0.22, 'bandpass', 1500)); hiss(drums, t + 0.03, 0.16, 0.26, 'bandpass', 1300); };
  const hat = (t, peak = 0.09) => hiss(drums, t, 0.045, peak, 'highpass', 8000, { pan: 0.25 });
  const bass = (t, n, len) => { tone(music, 'triangle', midi(n), t, len, 0.3, { lp: 900 }); tone(music, 'sine', midi(n), t, len, 0.22); };
  const pluck = (t, n, peak = 0.09) => { tone(music, 'triangle', midi(n), t, 0.26, peak, { lp: 3200, lpTo: 900, pan: (n % 3 - 1) * 0.3 }); tone(music, 'square', midi(n), t, 0.08, peak * 0.18, { lp: 2400 }); };
  const pad = (t, notes, len) => notes.forEach((n) => [-7, 7].forEach((det) => {
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = midi(n); osc.detune.value = det;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.018, t + 0.35);
    g.gain.setValueAtTime(0.018, t + Math.max(0.36, len - 0.2)); g.gain.linearRampToValueAtTime(0, t + len + 0.5);
    osc.connect(lp).connect(g).connect(music); osc.start(t); osc.stop(t + len + 0.6);
  }));
  const bell = (t, n, peak = 0.16) => { tone(fx, 'sine', midi(n), t, 0.9, peak); tone(fx, 'sine', midi(n) * 2.76, t, 0.28, peak * 0.22); };

  // sound effects, by cue
  const play = {
    pop: (t, n) => { const f = midi(PENTA[n % PENTA.length]); tone(fx, 'sine', f * 0.62, t, 0.12, 0.3, { to: f, glide: 0.035 }); hiss(fx, t, 0.012, 0.05, 'highpass', 4500); },
    thump: (t) => { tone(fx, 'sine', 110, t, 0.3, 0.6, { to: 48, glide: 0.12 }); play.pop(t + 0.02, 3); },
    ding: (t, n) => bell(t, PENTA[(n + 3) % PENTA.length] + 12, 0.13),
    tick: (t) => hiss(fx, t, 0.01, 0.045, 'highpass', 3800, { pan: rnd() * 0.4 - 0.2 }),
    click: (t) => { tone(fx, 'square', 1900, t, 0.02, 0.06); tone(fx, 'sine', 240, t, 0.07, 0.24); },
    boing: (t) => tone(fx, 'sine', 280, t, 0.32, 0.2, { to: 620, glide: 0.16 }),
    shutter: (t) => { hiss(fx, t, 0.02, 0.2, 'highpass', 2600); hiss(fx, t + 0.05, 0.03, 0.16, 'highpass', 2200); },
    whoosh: (t) => hiss(fx, t - 0.06, 0.42, 0.2, 'bandpass', 380, { to: 3400, swell: 0.55, q: 1.2 }),
    iris: (t) => { hiss(fx, t - 0.06, 0.5, 0.22, 'lowpass', 220, { to: 2600, swell: 0.6 }); tone(fx, 'sine', 70, t, 0.4, 0.25, { to: 120, glide: 0.3, attack: 0.12 }); },
    hit: (t) => { kick(t, 0.8); clap(t); },
    impact: (t, k) => {
      kick(t, 1); hiss(fx, t, 0.3, 0.28, 'lowpass', 900); hiss(fx, t, 0.7, 0.07, 'highpass', 6000);
      CHORDS[k % 4].forEach((n) => tone(fx, 'sawtooth', midi(n), t, 0.24, 0.05, { lp: 2200, lpTo: 600 }));
    },
    chime: (t) => [77, 81, 84, 89].forEach((n, i) => bell(t + i * 0.05, n, 0.12)),
  };

  // the arrangement, building with the film's shots
  const at = Object.fromEntries(shots.map((s) => [s.key, s.from]));
  const beat = sec(BEAT); const bar = beat * 4;
  const drumsIn = sec(at.say ?? 0); const kickIn = sec(at.brief ?? 0);
  const outro = sec(at.end ?? total); const riserTo = sec(at.blocks ?? total);
  for (let b = 0; b * bar < outro; b += 1) {
    const t0 = b * bar; const c = b % 4;
    pad(t0, CHORDS[c], bar);
    for (let e = 0; e < 8; e += 1) {
      const t = t0 + e * (beat / 2);
      if (t >= outro) break;
      pluck(t, CHORDS[c][[0, 2, 1, 2, 0, 2, 1, 2][e]] + (e > 3 ? 12 : 0), t < drumsIn ? 0.07 : 0.085);
      if (t >= drumsIn && e % 2 === 1) hat(t);
      if (t >= kickIn) { if (e % 2 === 0) kick(t); bass(t, ROOTS[c] + (e % 2 ? 12 : 0), beat / 2 - 0.02); }
      if (t >= drumsIn && (e === 2 || e === 6)) clap(t);
    }
  }
  hiss(fx, riserTo - bar, bar, 0.16, 'bandpass', 300, { to: 5000, swell: 0.97, q: 0.9 }); // the riser into the numbers
  pad(outro, CHORDS[0], 3.2);
  bass(outro, ROOTS[0], 1.6);
  cuesFor(d, shots).forEach((cue) => play[cue.kind]?.(sec(cue.f), cue.n));

  // render, then set the loudness to -14 LUFS with a soft limiter under -1 dBFS; the limiter takes a little
  // off, so measure again and correct (two or three passes land within 0.1 LU)
  const mix = await ctx.startRendering();
  const raw = [0, 1].map((c) => mix.getChannelData(c).slice());
  const ceil = 10 ** (-1 / 20);
  let gain = 10 ** ((-14 - (await loudness(mix))) / 20);
  let lufs = 0;
  for (let pass = 0; pass < 4; pass += 1) {
    for (let c = 0; c < 2; c += 1) {
      const x = mix.getChannelData(c); const r = raw[c];
      for (let i = 0; i < x.length; i += 1) x[i] = ceil * Math.tanh((r[i] * gain) / ceil);
    }
    lufs = await loudness(mix);
    if (Math.abs(lufs + 14) < 0.1) break;
    gain *= 10 ** ((-14 - lufs) / 20);
  }
  let peak = 0;
  for (let c = 0; c < 2; c += 1) mix.getChannelData(c).forEach((v) => { if (Math.abs(v) > peak) peak = Math.abs(v); });
  return { url: URL.createObjectURL(wav(mix)), lufs, peak: 20 * Math.log10(peak) };
}
