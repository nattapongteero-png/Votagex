import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useProto } from './useProto';
import { ME, countryOf, distanceKm, localHM, stopState } from './data';

// Checks me in at today's stops by location, so nobody has to tap "เช็คอิน". A web app only gets the location
// while it is open (no background geofencing, iPhone least of all), so this runs while the app is on screen:
// - the first good fix after opening counts at once (I opened the app because I'm there);
// - after that I have to stay inside for DWELL, so driving past doesn't count;
// - only from an hour before the stop's time, and each check-in can be undone from the toast.
// The location never leaves the device; only "checked in" does. Off in the profile settings, or simulated
// there for the demo (simStop: stand at that stop, ignoring the hour).

const DWELL = 2 * 60 * 1000;
const EARLY = 60; // minutes before the stop's time it may start counting
const GOOD_FIX = 150; // m; a fix vaguer than this doesn't count straight away
// how close is "there", by kind of place (a market or a mall is big; a café is not)
const RADIUS = { food: 80, cafe: 60, sight: 150, shop: 200, stay: 120, move: 200, event: 150 };
const minutes = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

export default function AutoCheckIn() {
  const { plans, today, actions, showToast, settings } = useProto();
  const on = settings.autoCheckIn !== false;
  const sim = settings.simStop || null;

  // today's stops on any trip happening today that I haven't checked in at
  const candidates = useMemo(() => plans.flatMap((p) => (p.startDate && today >= p.startDate && today <= (p.endDate || p.startDate)
    ? p.stops.filter((s) => s.date === today && s.lat != null && !s.checkIns?.[ME]).map((s) => ({ plan: p, stop: s }))
    : [])), [plans, today]);

  const latest = useRef(candidates);
  const inside = useRef({}); // stop id → when I was first seen inside
  const skipped = useRef(new Set()); // undone this session: never again
  const justOpened = useRef(true);
  useEffect(() => { latest.current = candidates; }, [candidates]);

  const check = useCallback((pos, { immediate = false, anyTime = false } = {}) => {
    const now = Date.now();
    latest.current.forEach(({ plan, stop }) => {
      if (skipped.current.has(stop.id)) return;
      const hm = localHM(countryOf(plan.country).utc);
      if (!anyTime && stop.time && minutes(hm) < minutes(stop.time) - EARLY) return;
      const m = distanceKm(pos, stop) * 1000;
      if (m > (RADIUS[stop.cat] || 100) + Math.min(pos.acc, 100)) { delete inside.current[stop.id]; return; }
      const since = inside.current[stop.id] ??= now;
      if (!(immediate && pos.acc <= GOOD_FIX) && now - since < DWELL) return;
      delete inside.current[stop.id];
      actions.toggleCheckIn(plan.id, stop.id, stopState(stop, today, hm) === 'due', true);
      showToast(`เช็คอิน “${stop.name}” แล้ว`, {
        label: 'ยกเลิก',
        onClick: () => { skipped.current.add(stop.id); actions.toggleCheckIn(plan.id, stop.id); },
      });
    });
  }, [actions, showToast, today]);

  const has = candidates.length > 0;
  // demo: standing at the simulated stop
  useEffect(() => {
    if (!on || !sim) return;
    const c = latest.current.find(({ stop }) => stop.id === sim);
    if (c) check({ lat: c.stop.lat, lng: c.stop.lng, acc: 10 }, { immediate: true, anyTime: true });
  }, [on, sim, has, check]);

  // the real location, only while there's something to check in at today
  useEffect(() => {
    if (!on || sim || !has || !navigator.geolocation) return undefined;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        check({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }, { immediate: justOpened.current });
        justOpened.current = false;
      },
      () => {}, // denied or no fix: the check-in button is still there
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 },
    );
    // coming back to the app counts as opening it
    const onShow = () => { if (document.visibilityState === 'visible') justOpened.current = true; };
    document.addEventListener('visibilitychange', onShow);
    return () => { navigator.geolocation.clearWatch(id); document.removeEventListener('visibilitychange', onShow); };
  }, [on, sim, has, check]);

  return null;
}
