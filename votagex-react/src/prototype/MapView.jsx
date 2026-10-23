import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { PLACE_CATS, HOME } from './data';

// Same stack as ThaiWell: MapLibre GL + OpenFreeMap tiles (free, no API key)
maplibregl.setWorkerUrl(workerUrl);
const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const EMPTY_LINE = { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } };

/**
 * points: [{ id, lat, lng, cat, label? }] — label shows a number inside the pin
 * route: draw a dashed line through the points in order
 * fitKey: change it to re-fit the camera to the points
 */
export default function MapView({ points, route = false, selectedId, onSelect, fitKey, className = '', interactive = true, padding = 56, me = false }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const onSelectRef = useRef(onSelect);
  const pointsRef = useRef(points);
  useEffect(() => {
    onSelectRef.current = onSelect;
    pointsRef.current = points;
  });

  const drawRoute = () => {
    const map = mapRef.current;
    const src = map?.getSource('route');
    if (!src) return;
    const coords = route ? pointsRef.current.map((p) => [p.lng, p.lat]) : [];
    src.setData({ ...EMPTY_LINE, geometry: { type: 'LineString', coordinates: coords } });
  };

  const fit = (animate) => {
    const map = mapRef.current;
    const pts = pointsRef.current;
    if (!map || !pts.length) return;
    if (pts.length === 1) {
      map.jumpTo({ center: [pts[0].lng, pts[0].lat], zoom: 14 });
      return;
    }
    const b = new maplibregl.LngLatBounds();
    pts.forEach((p) => b.extend([p.lng, p.lat]));
    map.fitBounds(b, { padding, maxZoom: 15, duration: animate ? 600 : 0 });
  };

  // create the map once
  useEffect(() => {
    const map = new maplibregl.Map({
      container: boxRef.current,
      style: STYLE,
      center: [HOME.lng, HOME.lat],
      zoom: 10,
      interactive,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: EMPTY_LINE });
      map.addLayer({
        id: 'route', type: 'line', source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#111827', 'line-width': 3, 'line-opacity': 0.8, 'line-dasharray': [1, 2] },
      });
      drawRoute();
    });
    fit(false);
    if (me) {
      const el = document.createElement('div');
      el.className = 'pt-me-dot';
      new maplibregl.Marker({ element: el }).setLngLat([HOME.lng, HOME.lat]).addTo(map);
    }
    return () => { map.remove(); mapRef.current = null; markersRef.current = {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  // markers
  const pointsSig = points.map((p) => `${p.id}:${p.lat}:${p.lng}:${p.label ?? ''}:${p.cat}`).join('|');
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(markersRef.current).forEach((m) => m.marker.remove());
    markersRef.current = {};
    pointsRef.current.forEach((p) => {
      // MapLibre owns the outer element's position/transform; the pin shape lives inside it
      const el = document.createElement('div');
      el.className = 'pt-marker';
      el.style.setProperty('--pin', (PLACE_CATS[p.cat] || PLACE_CATS.sight).color);
      el.innerHTML = `<button type="button" class="pt-pin">${p.label != null ? `<span>${p.label}</span>` : '<i></i>'}</button>`;
      el.addEventListener('click', (ev) => { ev.stopPropagation(); onSelectRef.current?.(p.id); });
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map);
      markersRef.current[p.id] = { marker, el };
    });
    drawRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsSig, route]);

  // re-fit when asked
  useEffect(() => {
    fit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // selection: highlight + fly
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, { el }]) => el.classList.toggle('selected', id === selectedId));
    const p = pointsRef.current.find((x) => x.id === selectedId);
    if (p && mapRef.current) {
      mapRef.current.easeTo({ center: [p.lng, p.lat], zoom: Math.max(mapRef.current.getZoom(), 13), duration: 600 });
    }
  }, [selectedId, pointsSig]);

  return <div ref={boxRef} className={`pt-map ${className}`} />;
}
