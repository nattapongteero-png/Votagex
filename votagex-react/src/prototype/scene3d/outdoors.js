import * as THREE from 'three';
import { inkMaterial } from './ink';
import { add, group, rod } from './parts';

// What the places share: the day's light, and the day outside seen through glass (the sky, the sun, a tree, rain
// on the pane).

// the light: the room's or the park's all round, and the day's from `from` toward `to`, casting shadows only on a
// sunny day (`span` m either side covered); on both layers, as what's in front of us is drawn on its own
export function lights(scene, { wx, hot, ground, from, to, span, near = 1, far = 30 }) {
  const sunny = !['cloud', 'rain', 'storm', 'fog', 'snow'].includes(wx);
  const fill = new THREE.HemisphereLight(hot ? '#FFF4DE' : '#FFFFFF', ground, 1.6);
  const key = new THREE.DirectionalLight('#FFFFFF', sunny ? 2.2 : 1.2);
  key.position.set(...from);
  key.target.position.set(...to);
  key.castShadow = sunny;
  Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near, far });
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0008;
  [fill, key].forEach((l) => l.layers.enableAll());
  scene.add(fill, key, key.target);
  return { sunny, key };
}

// the sky out of the window, by the weather: [top, toward the horizon]
const SKY = {
  sun: ['#BFD9F2', '#E8F1F8'], partly: ['#CFE0EF', '#ECF2F6'], cloud: ['#D5DAE0', '#E8EAEC'], rain: ['#BAC3CC', '#D6DCE1'],
  storm: ['#9AA5B1', '#C2CAD2'], fog: ['#E8EBEC', '#F0F1F1'], snow: ['#D5DAE0', '#E8EAEC'], hot: ['#F6E7C4', '#FBF3E2'],
};

export function sky(kind) {
  const [top, low] = SKY[kind] || SKY.partly;
  return new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color(top) }, uLow: { value: new THREE.Color(low) } },
    vertexShader: 'varying float vY; void main() { vY = (modelMatrix * vec4(position, 1.0)).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vY; uniform vec3 uTop; uniform vec3 uLow; void main() { gl_FragColor = vec4(mix(uLow, uTop, smoothstep(0.0, 40.0, vY)), 1.0); }',
  });
}

// the glass, drawn as an architect draws it: a few groups of fine diagonal strokes for the light on it; on a wet
// day rain running down it too (thin streaks, leaning with the wind; a storm's thicker)
export function glassPane(rain, storm) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uInk: { value: new THREE.Color('#2B2B30') }, uRain: { value: rain ? 1 : 0 }, uDense: { value: storm ? 1.6 : 1 } },
    vertexShader: 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vP; uniform vec3 uInk; uniform float uRain; uniform float uDense;
      float h(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
      void main() {
        float u = vP.x * 0.9 + vP.y;
        float q = u * 16.0;
        float glint = (1.0 - smoothstep(0.0, 1.2, abs(fract(q) - 0.5) / fwidth(q))) * step(0.82, sin(u * 1.6 + 0.8) * 0.5 + 0.5);
        vec2 p = vec2(vP.x * 9.0 * uDense + vP.y * 0.6, vP.y * 1.4);
        float r = h(floor(p.x));
        float drop = uRain * step(0.55, r) * smoothstep(0.08, 0.0, abs(fract(p.x) - 0.5)) * step(0.35, fract(p.y + r * 7.0));
        gl_FragColor = vec4(uInk, max(glint * 0.32, drop * 0.38) + uRain * 0.05);
      }`,
  });
}

// a tree on the pavement outside, bare in the cold
export function streetTree(parent, at, cold) {
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
