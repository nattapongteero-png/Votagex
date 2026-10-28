import * as THREE from 'three';
import { inkMaterial } from './ink';
import { lights } from './outdoors';
import { add, bench, box, bush, group, lamp, sala, tree } from './parts';

// A day out anywhere else: a park, seen as the people are, from a little over their heads. We stand on a paved
// walk that runs straight on back between rows of trees, lamps and benches beside it, to a line of trees and
// the town's towers far off, lighter and lighter with the distance (the sky's drawn behind, with the sun and
// the clouds going over: DayScene). On a wet day we're in a sala, out of the rain, the walk going on past it
// to one side (never through it). In the cold the trees are bare; in fog the far end's lost in it.
// `at`: where each of us stands [x, z] (me first); `wx`, `hot`, `cold`: the weather.

const GRASS = { sun: '#E3EBD8', partly: '#E5EADF', cloud: '#E0E5DE', rain: '#DCE3E2', storm: '#D3DAD9', fog: '#E7EAE8', snow: '#E0E5DE' };
const HAZE = { sun: '#EAF0EA', partly: '#EBEFEA', cloud: '#E6E9E8', rain: '#E0E6E9', storm: '#D9DFE4', fog: '#EDEFEE', snow: '#E6E9E8' };

export function park({ at, wx, hot, cold }) {
  const scene = new THREE.Scene();
  const wet = wx === 'rain' || wx === 'storm';
  const grass = hot ? '#EEE1C6' : cold ? '#E1E8EA' : GRASS[wx] || GRASS.partly;
  const haze = hot ? '#F6ECD8' : HAZE[wx] || HAZE.partly;
  // further off, the paler: the air between (in fog, close in)
  scene.fog = wx === 'fog' ? new THREE.Fog(haze, 5, 34) : new THREE.Fog(haze, 22, 150);

  const { key } = lights(scene, { wx, hot, ground: grass, from: [-14, 22, 2], to: [0, 0, -16], span: 26, far: 90 });

  // the ground, the walk (paving in slabs, a kerb each side), a paved pad where we stand on a wet day
  const ground = add(scene, new THREE.PlaneGeometry(400, 400), inkMaterial(grass, { hatch: 0.3 }), [0, 0, -150], [-Math.PI / 2, 0, 0]);
  ground.castShadow = false;
  const cx = at.reduce((s, [x]) => s + x, 0) / at.length;
  const walk = wet ? [cx + 2.3, cx + 5.0] : [-1.5, 1.5];
  const len = 160;
  const paving = inkMaterial('#F3F1EA', { grid: [0.75, 0.75], hatch: 0.35 });
  const slab = add(scene, box(walk[1] - walk[0], 0.04, len), paving, [(walk[0] + walk[1]) / 2, 0.02, 3 - len / 2]);
  slab.castShadow = false;
  walk.forEach((x, i) => { const k = add(scene, box(0.14, 0.08, len), inkMaterial('#E6E1D6'), [x + (i ? 0.07 : -0.07), 0.04, 3 - len / 2]); k.castShadow = false; });
  if (wet) {
    const pad = add(scene, box(4.4, 0.04, 3.8), paving, [cx, 0.02, at[0][1] - 0.2]);
    pad.castShadow = false;
    sala(scene, [cx, 0, at[0][1] - 0.35]);
  }

  // down each side of the walk: trees in a row, lamps between, a bench or two facing it. Nothing stands behind
  // us: on a wet day the walk's left-hand row goes, and the trees on our side stand well off to the left
  const side = wet ? [cx - 3.2, walk[1] + 1.7] : [walk[0] - 1.7, walk[1] + 1.7];
  for (let i = 0; i < 9; i += 1) {
    const z = -2.5 - i * 6.5;
    side.forEach((x, s) => {
      if (wet && s === 0 && z > -8) return; // (none by the sala)
      tree(scene, [x, 0, z], { size: 1.05 - (i % 3) * 0.06, cold, seed: i * 2 + s + 1 });
      if (i < 6) lamp(scene, [walk[s ? 1 : 0] + (s ? 0.45 : -0.45), 0, z - 3.25]);
    });
  }
  if (!wet) bench(scene, [walk[0] - 0.75, 0, -9.0], Math.PI / 2);
  bench(scene, [walk[1] + 0.75, 0, -15.5], -Math.PI / 2);
  bush(scene, [wet ? cx - 3.8 : walk[0] - 2.6, 0, -6.6], { size: 1.2, seed: 3 });
  bush(scene, [walk[1] + 2.8, 0, -11.5], { size: 1.0, seed: 5 });

  // far off: a line of trees across the end of the park, and the town's towers beyond
  for (let x = -60; x <= 60; x += 7) tree(scene, [x + ((x * 13) % 5), 0, -78 - ((x * 7) % 9)], { size: 1.3, cold, seed: x + 100 });
  const town = group(scene, [0, 0, -150]);
  [[-48, 30, 14], [-30, 46, 12], [-14, 26, 16], [4, 58, 13], [20, 34, 15], [38, 48, 12], [56, 28, 16]].forEach(([x, h, w], i) => {
    add(town, box(w, h, 12), inkMaterial(['#EAE7E1', '#E3E7EA', '#ECE5DC'][i % 3], { grid: [3, 3.2], axes: 'xy', hatch: 0 }), [x, h / 2, 0]);
  });
  return { scene, key: key.intensity };
}
