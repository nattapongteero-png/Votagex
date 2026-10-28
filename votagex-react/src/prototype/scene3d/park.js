import * as THREE from 'three';
import { inkMaterial } from './ink';
import { lights, tintOf } from './outdoors';
import { add, bench, box, bush, group, lamp, tree } from './parts';

// A day out anywhere else: a park, taken as a photographer would: from beside the walk and turned across it, so
// it runs off at a slant past us to the far end of the park (the picture's strongest line, leading on to where
// the friend says hi), its row of trees and lamps going with it; a big tree near us on the left, its trunk cut
// by the edge of the picture and its leaves up over the top behind the header (the picture's frame); behind us
// open lawn, the far trees and the town's towers, paler and paler with the distance. There's no sun in the sky:
// the day is in the light itself, coming in from the right (ink.js tint, DayScene's glow): warm, the shadows
// cool, on a fair day; high and white-hot, the shadows short, on a scorcher; low and thin, the shadows long, in
// the cold; none on a dull one. We cast our shadows with the trees.
// On a wet day we're in a long sala, the camera under its roof too: its ceiling's boards come on down from over
// the header, the rain's only seen where the outside shows past its posts (`outside`, for SceneWeather), water
// running off its eaves; the walk goes on past outside. In the cold the trees are bare; in fog the far end's
// lost in it.
// `at`: where each of us stands [x, z] (me first); `see`: where a point [x, y, z] is in the picture, px;
// `faces`: how far across the picture each face is, px; `wx`, `hot`, `cold`: the weather.

const GRASS = { sun: '#E3EBD8', partly: '#E5EADF', cloud: '#E0E5DE', rain: '#DCE3E2', storm: '#D3DAD9', fog: '#E7EAE8', snow: '#E0E5DE' };
const HAZE = { sun: '#EAF0EA', partly: '#EBEFEA', cloud: '#E6E9E8', rain: '#E0E6E9', storm: '#D9DFE4', fog: '#EDEFEE', snow: '#E6E9E8' };
// where the light comes from: the right, a little in front of us (so what faces us is in it); high on a
// scorcher, low in the cold
const SUN = { fair: [14, 16, 6], hot: [6, 30, 5], cold: [17, 9.5, 4] };
const SALA = { eave: 2.6, bench: 0.45, post: '#E9DCC8', wood: '#D9B98F' };

export function park({ at, see, faces, wx, hot, cold }) {
  const scene = new THREE.Scene();
  const wet = wx === 'rain' || wx === 'storm';
  const grass = hot ? '#EEE6CF' : cold ? '#E1E8EA' : GRASS[wx] || GRASS.partly;
  const haze = hot ? '#F7F0E0' : HAZE[wx] || HAZE.partly;
  // further off, the paler: the air between (in fog, close in)
  scene.fog = wx === 'fog' ? new THREE.Fog(haze, 5, 34) : new THREE.Fog(haze, 22, 150);
  const sun = SUN[hot ? 'hot' : cold ? 'cold' : 'fair'];
  const { sunny, key } = lights(scene, { wx, hot, ground: grass, from: sun, to: [0, 0, 0], span: 26, far: 90 });
  key.target.position.set(-2, 0, -8);
  key.position.set(-2 + sun[0], sun[1], -8 + sun[2]);
  // (nothing busy behind or in front of a face: a thing within 60 px of one across the picture goes elsewhere)
  const clear = (p) => faces.every((fx) => Math.abs(see(p)[0] - fx) > 60);

  const ground = add(scene, new THREE.PlaneGeometry(400, 400), inkMaterial(grass, { hatch: 0.3 }), [0, 0, -150], [-Math.PI / 2, 0, 0]);
  ground.castShadow = false;
  const [[mx]] = at;
  const xs = at.map(([x]) => x); const zs = at.map(([, z]) => z);

  // the sala (wet): its floor round us and on back past the camera, its back a little behind us; posts only at
  // the corners (a beam spans between), benches along its back and left side
  const s = wet ? { x0: Math.min(...xs, 0) - 1.5, x1: Math.max(...xs, 0) + 1.4, z0: Math.min(...zs) - 1.1, z1: 0.8 } : null;

  // the walk: through where we stand, slabs of paving, a kerb each side; on a wet day out past the sala's left
  const walk = wet ? [s.x0 - 3.6, s.x0 - 0.9] : [mx - 0.9, mx + 2.1];
  const len = 170;
  const paving = inkMaterial('#F3F1EA', { grid: [0.75, 0.75], hatch: 0.35 });
  add(scene, box(walk[1] - walk[0], 0.04, len), paving, [(walk[0] + walk[1]) / 2, 0.02, 8 - len / 2]).castShadow = false;
  walk.forEach((x, i) => { add(scene, box(0.14, 0.08, len), inkMaterial('#E6E1D6'), [x + (i ? 0.07 : -0.07), 0.04, 8 - len / 2]).castShadow = false; });

  // down each side of the walk: trees in a row, lamps between, a bench or two facing it; on the near side only a
  // few, near the camera (behind us it opens out onto the lawn)
  const rows = [walk[0] - 1.7, walk[1] + 1.7];
  for (let i = 0; i < 12; i += 1) {
    const z = 2 - i * 6.5;
    rows.forEach((x, k) => {
      // (none in the sala, nor behind it: past its back it opens out onto the lawn)
      const inSala = s && x > s.x0 - 0.6 && x < s.x1 + 0.6;
      if (inSala || (k === 0 && !wet && z < -10)) return;
      if (clear([x, 2, z])) tree(scene, [x, 0, z], { size: 1.05 - (i % 3) * 0.06, cold, seed: i * 2 + k + 1 });
      const lz = z - 3.25; const lx = walk[k] + (k ? 0.45 : -0.45);
      if (i < 8 && clear([lx, 2, lz]) && !(s && lx > s.x0 - 0.3 && lz > s.z0 - 0.3)) lamp(scene, [lx, 0, lz]);
    });
  }
  // (the big tree near us on the left, framing the picture: on the near side, as close in as it'll still stand
  // at the edge of the picture)
  if (!wet) {
    const x = walk[0] - 2.2;
    let z = -1;
    while (z > -12 && see([x, 0, z])[0] < 4) z -= 0.25;
    tree(scene, [x, 0, z], { size: 1.25, cold, seed: 41 });
  }
  [[walk[1] + 0.75, -9.5, -Math.PI / 2], [walk[0] - 0.75, -4.5, Math.PI / 2], [walk[1] + 0.75, -22, -Math.PI / 2]]
    .filter(([x, z]) => clear([x, 0.6, z]) && !(s && x > s.x0 - 0.5 && x < s.x1 + 0.5))
    .forEach(([x, z, turn]) => bench(scene, [x, 0, z], turn));
  [[walk[1] + 2.9, -13.5, 1.0, 5], [walk[0] - 3.2, -7, 1.2, 3], [walk[1] + 3.1, -28, 1.1, 7]]
    .filter(([x, z]) => clear([x, 0.5, z]) && !(s && x > s.x0 - 1 && x < s.x1 + 1))
    .forEach(([x, z, size, seed]) => bush(scene, [x, 0, z], { size, seed }));

  // far off: a line of trees across the end of the park, and the town's towers beyond (we look off to the left
  // of the walk, so they run on further that way)
  for (let x = -110; x <= 50; x += 7) tree(scene, [x + ((x * 13) % 5), 0, -78 - ((Math.abs(x) * 7) % 9)], { size: 1.3, cold, seed: x + 200 });
  const town = group(scene, [0, 0, -150]);
  [[-104, 34, 15], [-84, 26, 13], [-66, 44, 12], [-48, 30, 14], [-30, 46, 12], [-14, 26, 16], [4, 58, 13], [20, 34, 15], [38, 48, 12]].forEach(([x, h, w], i) => {
    add(town, box(w, h, 12), inkMaterial(['#EAE7E1', '#E3E7EA', '#ECE5DC'][i % 3], { grid: [3, 3.2], axes: 'xy', hatch: 0 }), [x, h / 2, 0]);
  });

  // our shadows on the ground with the trees' (each of us, roughly, as the light sees us: a body and a head;
  // never drawn, only casting: ink.js)
  if (sunny) {
    const shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    const tall = hot ? 1.05 : 1.62; // (sat on the ground in the heat)
    at.forEach(([x, z]) => {
      const body = add(scene, new THREE.CapsuleGeometry(0.17, tall * 0.62, 4, 10), shadowOnly, [x, tall * 0.5, z]);
      const headM = add(scene, new THREE.SphereGeometry(0.12, 10, 8), shadowOnly, [x, tall - 0.06, z]);
      [body, headM].forEach((o) => { o.receiveShadow = false; o.userData.shadowOnly = true; });
    });
  }

  let outside = null;
  if (s) {
    const { eave, bench: seat } = SALA;
    const { x0, x1, z0, z1 } = s;
    const w = x1 - x0; const d = z1 - z0; const cx = (x0 + x1) / 2; const cz = (z0 + z1) / 2;
    const shell = (m) => { m.castShadow = false; return m; };
    // floor, raised a step; the ceiling of boards under the roof (its joints running back, from over the header);
    // a beam round the eaves; posts at the far corners; benches along the back and the left
    add(scene, box(w + 0.3, 0.12, d + 0.3), inkMaterial('#EFEBE2', { grid: [0.6, 0.6], hatch: 0.4 }), [cx, 0.06, cz]).castShadow = false;
    shell(add(scene, box(w + 0.4, 0.08, d + 0.4), inkMaterial('#EADBC6', { hatch: 0, grid: [0.32, 0], axes: 'xz', joints: 0.22 }), [cx, eave + 0.24, cz]));
    const wood = inkMaterial(SALA.wood);
    add(scene, box(w + 0.4, 0.22, 0.14), wood, [cx, eave + 0.09, z0 - 0.13]);
    add(scene, box(0.14, 0.22, d + 0.4), wood, [x0 - 0.13, eave + 0.09, cz]);
    add(scene, box(0.14, 0.22, d + 0.4), wood, [x1 + 0.13, eave + 0.09, cz]);
    const posts = [[x0, z0], [x1, z0]];
    posts.forEach(([x, z]) => add(scene, box(0.18, eave, 0.18), inkMaterial(SALA.post), [x, eave / 2 + 0.12, z]));
    add(scene, box(w - 0.3, 0.05, 0.42), wood, [cx, seat, z0 + 0.3]);
    add(scene, box(w - 0.3, seat - 0.12, 0.06), wood, [cx, (seat + 0.12) / 2, z0 + 0.12]);
    add(scene, box(0.42, 0.05, d - 1.6), wood, [x0 + 0.3, seat, z0 + (d - 1.6) / 2 + 0.3]);
    // where the outside shows: past the back and the left side, between the bench and the eaves (not the right:
    // it's off the picture), the corner posts in the way; water off the eaves, falling just outside
    const near = -0.4; // (as near as the left side's seen: in front of the camera)
    outside = {
      shapes: [[[x0, seat, z0], [x1, seat, z0], [x1, eave, z0], [x0, eave, z0]], [[x0, seat, near], [x0, seat, z0], [x0, eave, z0], [x0, eave, near]]],
      cuts: posts.map(([x, z]) => [[x - 0.09, 0, z], [x + 0.09, 0, z], [x + 0.09, eave + 0.2, z], [x - 0.09, eave + 0.2, z]]),
      drips: [],
    };
    for (let x = x0 + 0.15; x < x1; x += 0.42) outside.drips.push([[x, eave, z0 - 0.2], [x, 0, z0 - 0.2]]);
    for (let z = z0 + 0.3; z < near - 0.5; z += 0.42) outside.drips.push([[x0 - 0.2, eave, z], [x0 - 0.2, 0, z]]);
  }
  return { scene, key: key.intensity, tint: tintOf({ sunny, hot, cold }), outside };
}
