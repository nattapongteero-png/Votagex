import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// A physically-based daytime sky for the weather card (three.js' Sky: Rayleigh + Mie scattering, as in a
// lighting simulator's "procedural sky"). The sun sits where it really is at that hour: low and warm in the
// morning, high and bright at noon, orange-pink at dusk. The camera looks just below the sun, so the sun and its
// glow sit at the top of the card, clear of the text. Rendered once and again each minute; nothing loops.
// hour: local hour of the day (decimal); hazy: a little milkier (sun with clouds about)

// sun elevation (deg) through a 06:00–18:00 day, peaking ~75° at noon
const elevationAt = (hour) => Math.max(-4, Math.sin(Math.PI * Math.min(1, Math.max(0, (hour - 6) / 12))) * 75);

export default function SunSky({ hour = 12, hazy = false }) {
  const box = useRef(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);
    const u = sky.material.uniforms;
    u.turbidity.value = hazy ? 5 : 2.6;
    u.rayleigh.value = hazy ? 2.2 : 3;
    u.mieCoefficient.value = 0.0035;
    u.mieDirectionalG.value = 0.94; // a tight sun glow, not a white wash over the card
    u.cloudCoverage.value = hazy ? 0.25 : 0; // the card's own clouds drift on top; keep the sky's few and thin

    const camera = new THREE.PerspectiveCamera(40, 2, 1, 1e6);
    const sun = new THREE.Vector3();

    const draw = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const elev = elevationAt(hour);
      // morning sun in the east, evening in the west; 180° = south (Thailand looks at a southern sun)
      const azimuth = THREE.MathUtils.degToRad(90 + ((hour - 6) / 12) * 180);
      sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elev), azimuth);
      u.sunPosition.value.copy(sun);
      // aim just below the sun so it sits at the top, between the date (left) and the temperature (right);
      // never so low that the grey ground under the horizon comes into view (half the vertical fov is 20°)
      const pitch = THREE.MathUtils.degToRad(Math.max(22, elev - 15));
      const yaw = azimuth + THREE.MathUtils.degToRad(6);
      camera.lookAt(new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 - pitch, yaw));
      // brighter when the sun is high, gentler near sunrise and sunset
      renderer.toneMappingExposure = 0.1 + Math.min(1, Math.max(0, elev / 60)) * 0.05;
      renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    draw();
    const id = setInterval(draw, 60000);

    return () => {
      clearInterval(id);
      ro.disconnect();
      sky.geometry.dispose();
      sky.material.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [hour, hazy]);

  return <div ref={box} className="pt-sunsky" aria-hidden="true" />;
}
