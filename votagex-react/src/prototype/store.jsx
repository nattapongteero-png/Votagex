import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProtoCtx } from './useProto';
import { TODAY, ME, addDays, diffDays, seedData, seedPiggy, seedEvents, withSeedGroups, shiftData, planStatus, splitByShare, jarCats, JAR_TEMPLATES, KINDS } from './data';

// Prototype-only store: everything lives in memory + localStorage. No Firebase.
const KEY = 'votagex.proto.v1';

// data saved while moods and piggies still used emoji
const OLD_MOODS = { '😍': 'moodLove', '😊': 'moodHappy', '🙂': 'moodSmile', '😐': 'moodMeh', '😮‍💨': 'moodTired' };
const OLD_JARS = { '🐷': 'piggy', '✈️': 'plane', '🏖️': 'beach', '⛰️': 'mountain', '🎌': 'sparkle', '🎢': 'ticket', '🎁': 'gift' };
const toIcons = (d) => ({
  ...d,
  memories: d.memories?.map((m) => (OLD_MOODS[m.mood] ? { ...m, mood: OLD_MOODS[m.mood] } : m)),
  jars: d.jars?.map(({ emoji, ...j }) => (emoji ? { ...j, icon: j.icon || OLD_JARS[emoji] || 'piggy' } : j)),
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d.v === 1) {
        const data = toIcons(shiftData(d, diffDays(d.seededOn, TODAY)));
        const withJars = data.jars?.every((j) => j.cats) ? data : { ...data, ...seedPiggy() }; // saved before piggies had categories
        const withEvents = withJars.events ? withJars : { ...withJars, ...seedEvents() }; // saved before events
        return withEvents.groups ? withEvents : withSeedGroups(withEvents); // saved before groups
      }
    }
  } catch { /* storage unavailable: fall back to seed */ }
  return seedData();
}

const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function ProtoProvider({ children }) {
  const [data, setData] = useState(load);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* quota or private mode */ }
  }, [data]);

  // "today" can be simulated to show the in-trip mode
  const today = data.simMode === 'trip'
    ? addDays(data.plans.find((p) => p.id === 'osaka')?.startDate || TODAY, 1)
    : TODAY;

  // action: { label, onClick } for a toast that can be undone; it stays a little longer
  const showToast = useCallback((msg, action = null) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, action });
    toastTimer.current = setTimeout(() => setToast(null), action ? 5000 : 2400);
  }, []);
  const hideToast = useCallback(() => { clearTimeout(toastTimer.current); setToast(null); }, []);

  const openSheet = useCallback((name, props = {}) => setSheet({ name, props }), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const updatePlan = useCallback((id, fn) => {
    setData((d) => ({ ...d, plans: d.plans.map((p) => (p.id === id ? fn(p) : p)) }));
  }, []);

  const actions = useMemo(() => ({
    setSimMode: (simMode) => setData((d) => ({ ...d, simMode })),
    // autoCheckIn (on unless false), simStop (demo: pretend to stand at that stop), scope (home: 'me' or a group id)
    setSetting: (key, value) => setData((d) => ({ ...d, settings: { ...d.settings, [key]: value } })),

    addGroup: (group) => {
      const id = uid('g');
      setData((d) => ({ ...d, groups: [...d.groups, { ...group, id, createdBy: ME }] }));
      return id;
    },
    // the group goes; its trips stay, as mine
    removeGroup: (id) => setData((d) => ({
      ...d,
      groups: d.groups.filter((g) => g.id !== id),
      plans: d.plans.map((p) => (p.groupId === id ? { ...p, groupId: null } : p)),
      events: d.events.map((e) => (e.groupId === id ? { ...e, groupId: null } : e)),
      settings: d.settings?.scope === id ? { ...d.settings, scope: 'me' } : d.settings,
    })),
    reset: () => setData(seedData()),

    addPlace: (place) => {
      const id = uid('p');
      setData((d) => ({ ...d, places: [{ ...place, id, savedAt: TODAY }, ...d.places] }));
      return id;
    },
    addEvent: (ev) => {
      const id = uid('ev');
      setData((d) => ({ ...d, events: [{ ...ev, id, by: ME, savedAt: TODAY }, ...(d.events || [])] }));
      return id;
    },
    shareEvent: (id, groupId) => setData((d) => ({ ...d, events: d.events.map((e) => (e.id === id ? { ...e, groupId } : e)) })),
    removeEvent: (id) => setData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) })),
    removePlace: (id) => setData((d) => ({ ...d, places: d.places.filter((p) => p.id !== id) })),

    addPlan: (plan) => {
      const id = uid('plan');
      setData((d) => ({ ...d, plans: [{ stops: [], members: [ME], ...plan, id }, ...d.plans] }));
      return id;
    },
    addStop: (planId, stop) => {
      updatePlan(planId, (p) => ({ ...p, stops: [...p.stops, { checkIns: {}, note: '', ...stop, id: uid('s') }] }));
    },
    toggleCheckIn: (planId, stopId, late = false, auto = false) => {
      updatePlan(planId, (p) => ({
        ...p,
        stops: p.stops.map((s) => {
          if (s.id !== stopId) return s;
          const checkIns = { ...s.checkIns };
          if (checkIns[ME]) delete checkIns[ME];
          else {
            const now = new Date();
            checkIns[ME] = { at: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, late, ...(auto && { auto }) };
          }
          return { ...s, checkIns };
        }),
      }));
    },
    toggleChecklist: (planId, itemId) => {
      updatePlan(planId, (p) => ({ ...p, checklist: p.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }));
    },
    markSettled: (planId, key) => {
      updatePlan(planId, (p) => ({ ...p, settled: [...(p.settled || []), key] }));
    },
    addExpense: (e) => setData((d) => ({ ...d, expenses: [{ ...e, id: uid('e') }, ...d.expenses] })),
    addMemory: (m) => setData((d) => ({ ...d, memories: [{ ...m, id: uid('m') }, ...d.memories] })),

    // Piggies: 'in' splits across the jar's categories by share (target 'split') or goes to one category;
    // 'use' takes money out of one category
    addPiggy: ({ jarId, type, amount, target, note = '' }) => setData((d) => {
      const jar = d.jars.find((j) => j.id === jarId);
      if (!jar) return d;
      const alloc = type === 'in' && target === 'split' ? splitByShare(amount, jarCats(jar)) : { [target]: amount };
      return { ...d, piggyLog: [{ id: uid('pg'), jar: jarId, date: TODAY, type, amount, alloc, note }, ...d.piggyLog] };
    }),
    setShares: (jarId, shares) => setData((d) => ({ ...d, jars: d.jars.map((j) => (j.id === jarId ? { ...j, cats: { ...j.cats, ...shares } } : j)) })),
    addJar: ({ name, goal, planId, icon, kind }) => {
      const id = uid('jar');
      setData((d) => ({ ...d, jars: [...d.jars, { id, name, goal, icon: icon || 'piggy', planId: planId || null, cats: { ...(JAR_TEMPLATES[kind] || JAR_TEMPLATES.trip) } }] }));
      return id;
    },
  }), [updatePlan]);

  // The plan that quick-add attaches to: the ongoing plan today, else a same-day outing created on demand
  const activePlan = useMemo(() => {
    const live = data.plans.filter((p) => planStatus(p, today) === 'ongoing');
    return live.find((p) => p.kind !== 'outing') || live[0] || null;
  }, [data.plans, today]);

  const ensureActivePlan = useCallback(() => {
    if (activePlan) return activePlan.id;
    return actions.addPlan({
      name: 'ออกไปข้างนอก', kind: 'outing', country: 'TH', currency: 'THB',
      startDate: today, endDate: today, members: [ME], budget: 0,
      cover: { icon: 'sight', tint: '#E6F7F4' },
    });
  }, [activePlan, actions, today]);

  const value = {
    ...data, today, activePlan, ensureActivePlan, actions,
    settings: data.settings || {},
    sheet, openSheet, closeSheet, toast, showToast, hideToast,
    kindLabel: (k) => KINDS[k]?.label || k,
  };
  return <ProtoCtx.Provider value={value}>{children}</ProtoCtx.Provider>;
}
