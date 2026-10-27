import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProtoCtx } from './useProto';
import {
  TODAY, ME, PEOPLE, addPeople, addDays, addYear, diffDays, seedData, seedPiggy, withSeedGroups, shiftData, planStatus, eventToPlace,
  splitByShare, jarCats, settleUp, fmtMoney, JAR_TEMPLATES, KINDS, DEMO_PROMPTPAY, nextOrder, SEED_GROUPS,
} from './data';

import * as cloud from './cloud';

// The app's data. Demo: sample data in memory + localStorage. Signed in: groups, trips with their stops,
// expenses and transfers, settings and saved places (events too) live in Firestore; the rest (memories, savings
// piggies) moves there piece by piece (docs/ROADMAP.md, phase 3) and until then is kept on this device, per account.
const KEY = 'votagex.proto.v1';
const emptyData = () => ({ v: 1, seededOn: TODAY, simMode: 'normal', plans: [], places: [], expenses: [], payments: [], memories: [], postcards: [], jars: [], piggyLog: [], groups: [], settings: {} });

// data saved while moods and piggies still used emoji
const OLD_MOODS = { '😍': 'moodLove', '😊': 'moodHappy', '🙂': 'moodSmile', '😐': 'moodMeh', '😮‍💨': 'moodTired' };
const OLD_JARS = { '🐷': 'piggy', '✈️': 'plane', '🏖️': 'beach', '⛰️': 'mountain', '🎌': 'sparkle', '🎢': 'ticket', '🎁': 'gift' };
const toIcons = (d) => ({
  ...d,
  memories: d.memories?.map((m) => (OLD_MOODS[m.mood] ? { ...m, mood: OLD_MOODS[m.mood] } : m)),
  jars: d.jars?.map(({ emoji, ...j }) => (emoji ? { ...j, icon: j.icon || OLD_JARS[emoji] || 'piggy' } : j)),
});

// saved before transfers were kept: each "โอนแล้ว" mark becomes a confirmed transfer of what was owed
const withPayments = (d) => (d.payments ? d : {
  ...d,
  payments: d.plans.flatMap((p) => (p.settled || []).map((key) => {
    const [from, to] = key.split('>');
    const t = settleUp(d.expenses.filter((e) => e.planId === p.id), p.members).find((x) => x.from === from && x.to === to);
    return t && { id: `pay-${p.id}-${from}-${to}`, planId: p.id, from, to, amount: t.amount, status: 'received', date: p.endDate || TODAY, slip: null };
  }).filter(Boolean)),
});

// sample plans added to the demo later, given to a device that already has demo data (once each, so a deleted one stays gone)
// bangsaen-recap: the year-ago day out got more stops, photos and spends for its recap; bangsaen-postcard: the
// postcard I sent myself from it
const LATER_SAMPLES = ['lunch', 'g-fam', 'bangsaen-recap', 'bangsaen-postcard'];
function withNewSamples(d) {
  const given = d.samplesGiven || [];
  if (!given.includes('bangsaen-postcard') && d.plans.some((p) => p.id === 'bangsaen') && !(d.postcards || []).some((x) => x.planId === 'bangsaen')) {
    d = { ...d, postcards: [...(d.postcards || []), ...seedData().postcards] };
  }
  if (!given.includes('bangsaen-recap') && d.plans.some((p) => p.id === 'bangsaen')) {
    const seed = seedData();
    const more = (list, from) => [...list, ...from.filter((x) => x.planId === 'bangsaen' && !list.some((y) => y.id === x.id))];
    const stops = seed.plans.find((p) => p.id === 'bangsaen').stops;
    d = { ...d, plans: d.plans.map((p) => (p.id === 'bangsaen' ? { ...p, stops: [...p.stops, ...stops.filter((x) => !p.stops.some((y) => y.id === x.id))] } : p)),
      memories: more(d.memories, seed.memories), expenses: more(d.expenses, seed.expenses) };
  }
  const fresh = (x, list) => LATER_SAMPLES.includes(x.id) && !given.includes(x.id) && !list.some((y) => y.id === x.id);
  const add = seedData().plans.filter((p) => fresh(p, d.plans));
  const addGroups = SEED_GROUPS.filter((g) => fresh(g, d.groups || [])).map((g) => ({ ...g }));
  return { ...d, plans: [...d.plans, ...add], groups: [...(d.groups || []), ...addGroups], samplesGiven: [...new Set([...given, ...LATER_SAMPLES])] };
}

function load(key, signedIn) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const d = JSON.parse(raw);
      if (d.v === 1) {
        const data = toIcons(shiftData(d, diffDays(d.seededOn, TODAY)));
        const withJars = data.jars?.every((j) => j.cats) ? data : { ...data, ...seedPiggy() }; // saved before piggies had categories
        // saved while events were kept apart from places: they become places with dates
        const { events, ...withEvents } = withJars;
        if (events) withEvents.places = [...events.map(eventToPlace), ...withEvents.places];
        const grouped = withPayments(withEvents.groups ? withEvents : withSeedGroups(withEvents)); // groups: saved before groups
        return signedIn ? grouped : withNewSamples(grouped);
      }
    }
  } catch { /* storage unavailable: fall back to seed */ }
  return signedIn ? emptyData() : seedData();
}

const NONE = [];
const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

// user: the signed-in Firebase user, or null for the demo
export function ProtoProvider({ children, user = null, exit }) {
  const key = user ? `${KEY}.${user.uid}` : KEY;
  const [data, setData] = useState(() => load(key, Boolean(user)));
  const [cloudGroups, setCloudGroups] = useState(null); // null until Firestore first answers
  const [cloudPlans, setCloudPlans] = useState([]);
  const [plansReadyFor, setPlansReadyFor] = useState(null); // the groups whose trips have all answered once
  const [pendingPlans, setPendingPlans] = useState([]); // just created, until Firestore sends them back
  const [, setPeopleVersion] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  // deleted, waiting out the undo toast: plan ids, "planId/stopId", expense, transfer and memory ids
  const [hidden, setHidden] = useState([]);

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota or private mode */ }
  }, [key, data]);

  // signed in: my profile for friends to see, and my groups, live
  useEffect(() => {
    if (!user) return undefined;
    cloud.saveProfile(user).catch(() => {});
    return cloud.watchGroups(user.uid, setCloudGroups);
  }, [user]);
  const myGroups = useMemo(() => cloudGroups || [], [cloudGroups]);

  // signed in: settings and saved places (mine and my groups'), live.
  // What this device kept before they moved goes up once.
  const [cloudSettings, setCloudSettings] = useState(null);
  const [cloudPlaces, setCloudPlaces] = useState([]);
  const local = useRef(data);
  useEffect(() => {
    if (!user) return undefined;
    const off = cloud.watchSettings(user.uid, setCloudSettings);
    // '1': settings and places went up before events joined them, so only the events are left
    const moved = `votagex.moved.${user.uid}`;
    let before;
    try {
      before = localStorage.getItem(moved);
      if (before === '2') return off;
      localStorage.setItem(moved, '2');
    } catch { return off; }
    const { settings = {}, places = [] } = local.current;
    if (!before && Object.keys(settings).length) cloud.saveSettings(user.uid, settings);
    places.filter((p) => !before || p.startDate).forEach((p) => cloud.addPlace(user.uid, p));
    return off;
  }, [user]);
  const settings = useMemo(() => (user ? cloudSettings || {} : data.settings || {}), [user, cloudSettings, data.settings]);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const groupKey = myGroups.map((g) => g.id).sort().join(',');
  useEffect(() => {
    if (!user) return undefined;
    return cloud.watchPlaces(user.uid, groupKey ? groupKey.split(',') : [], setCloudPlaces);
  }, [user, groupKey]);
  const places = useMemo(() => {
    const all = user ? cloudPlaces : data.places;
    return hidden.length ? all.filter((p) => !hidden.includes(p.id)) : all;
  }, [user, cloudPlaces, data.places, hidden]);
  const placesRef = useRef(places);
  useEffect(() => { placesRef.current = places; }, [places]);
  const findPlace = (id) => placesRef.current.find((p) => p.id === id);

  // signed in: my PromptPay, copied into each group I'm in whenever either changes
  useEffect(() => {
    if (!user || !cloudSettings || !groupKey) return;
    const mark = `votagex.pp.${user.uid}`;
    const now = `${groupKey}|${cloudSettings.promptpay || ''}`;
    try { if (localStorage.getItem(mark) === now) return; } catch { /* write anyway */ }
    cloud.savePromptPay(user.uid, groupKey.split(','), cloudSettings.promptpay)
      .then(() => { try { localStorage.setItem(mark, now); } catch { /* next time */ } }).catch(() => {});
  }, [user, cloudSettings, groupKey]);
  // signed in: my trips and every trip of my groups, with their stops, live
  useEffect(() => {
    if (!user) return undefined;
    return cloud.watchPlans(user.uid, groupKey ? groupKey.split(',') : [], (list, ready) => {
      setCloudPlans(list);
      if (ready) setPlansReadyFor(groupKey);
    });
  }, [user, groupKey]);
  // signed in, still waiting for the first answer: a trip that isn't there yet may only be on its way
  const loading = Boolean(user) && (!cloudGroups || plansReadyFor !== groupKey);
  const plans = useMemo(() => {
    const all = user ? [...cloudPlans, ...pendingPlans.filter((p) => !cloudPlans.some((c) => c.id === p.id))] : data.plans;
    if (!hidden.length) return all;
    const gone = (p, s) => hidden.includes(`${p.id}/${s.id}`);
    return all.filter((p) => !hidden.includes(p.id)).map((p) => (p.stops.some((s) => gone(p, s)) ? { ...p, stops: p.stops.filter((s) => !gone(p, s)) } : p));
  }, [user, cloudPlans, pendingPlans, data.plans, hidden]);
  // expenses and transfers, flat (signed in, each plan brings its own)
  const expenses = useMemo(() => {
    const all = user ? plans.flatMap((p) => p.expenses || []) : data.expenses;
    return hidden.length ? all.filter((e) => !hidden.includes(e.id)) : all;
  }, [user, plans, data.expenses, hidden]);
  const payments = useMemo(() => {
    const all = user ? plans.flatMap((p) => p.payments || []) : data.payments || [];
    return hidden.length ? all.filter((x) => !hidden.includes(x.id)) : all;
  }, [user, plans, data.payments, hidden]);
  const plansRef = useRef(plans);
  const moneyRef = useRef({ expenses, payments });
  useEffect(() => { plansRef.current = plans; moneyRef.current = { expenses, payments }; }, [plans, expenses, payments]);
  const findPlan = (id) => plansRef.current.find((p) => p.id === id);
  const findPay = (id) => moneyRef.current.payments.find((x) => x.id === id);

  // names and photos of the people in my groups
  const memberKey = [...new Set(myGroups.flatMap((g) => g.memberIds))].sort().join(',');
  useEffect(() => {
    const unknown = memberKey ? memberKey.split(',').filter((id) => !PEOPLE[id]) : [];
    if (!unknown.length) return;
    cloud.loadProfiles(unknown).then((found) => { addPeople(found); setPeopleVersion((v) => v + 1); });
  }, [memberKey]);

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

  // Delete with an undo: hidden at once, gone for real once the toast has had its time
  const removeLater = useCallback((key, msg, commit) => {
    setHidden((h) => [...h, key]);
    const unhide = () => setHidden((h) => h.filter((k) => k !== key));
    const timer = setTimeout(() => { commit(); unhide(); }, 5200);
    showToast(msg, { label: 'เลิกทำ', onClick: () => { clearTimeout(timer); unhide(); } });
  }, [showToast]);

  const openSheet = useCallback((name, props = {}) => setSheet({ name, props }), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const updatePlan = useCallback((id, fn) => {
    setData((d) => ({ ...d, plans: d.plans.map((p) => (p.id === id ? fn(p) : p)) }));
  }, []);

  const actions = useMemo(() => ({
    setSimMode: (simMode) => setData((d) => ({ ...d, simMode })),
    // autoCheckIn (on unless false), simStop (demo: pretend to stand at that stop), scope (home: 'me' or a group id)
    setSetting: (key, value) => {
      if (user) { cloud.saveSettings(user.uid, { [key]: value }); return; }
      setData((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));
    },
    // the PromptPay of someone I owe on this plan (demo: the sample number, never a real account)
    promptPayOf: (planId, who) => {
      if (!user) return Promise.resolve(DEMO_PROMPTPAY);
      const plan = findPlan(planId);
      return plan?.groupId ? cloud.readPromptPay(plan.groupId, who) : Promise.resolve(null);
    },

    addGroup: (group) => {
      if (user) return cloud.createGroup(user.uid, group); // friends join by invite link
      const id = uid('g');
      setData((d) => ({ ...d, groups: [...d.groups, { ...group, id, createdBy: ME }] }));
      return id;
    },
    // signed in: a link friends open to join (demo: a sample link)
    invite: (group) => (user ? cloud.createInvite(user.uid, group) : Promise.resolve('https://votagex.app/g/AB12CD')),
    leaveGroup: (id) => (user ? cloud.leaveGroup(user.uid, id) : setData((d) => ({ ...d, groups: d.groups.filter((g) => g.id !== id) }))),
    // the group goes; its trips stay, as mine (signed in: archived, members can still open its trips)
    removeGroup: (id) => (user ? cloud.archiveGroup(id).then(() => settingsRef.current.scope === id && cloud.saveSettings(user.uid, { scope: 'me' })) : setData((d) => ({
      ...d,
      groups: d.groups.filter((g) => g.id !== id),
      plans: d.plans.map((p) => (p.groupId === id ? { ...p, groupId: null } : p)),
      places: d.places.map((p) => (p.groupId === id ? { ...p, groupId: null } : p)),
      settings: d.settings?.scope === id ? { ...d.settings, scope: 'me' } : d.settings,
    }))),
    reset: () => setData(user ? emptyData() : seedData()),

    // places, events included (they have dates); groupId: shared with that group
    addPlace: (place) => {
      if (user) return cloud.addPlace(user.uid, { ...place, savedAt: TODAY });
      const id = uid('p');
      setData((d) => ({ ...d, places: [{ ...place, id, by: ME, savedAt: TODAY }, ...d.places] }));
      return id;
    },
    updatePlace: (id, fields) => {
      if (user) { cloud.updatePlace(user.uid, findPlace(id), fields); return; }
      setData((d) => ({ ...d, places: d.places.map((p) => (p.id === id ? { ...p, ...fields } : p)) }));
    },
    sharePlace: (id, groupId) => {
      const place = findPlace(id);
      if ((place.groupId || null) === (groupId || null)) return;
      if (user) { cloud.movePlace(user.uid, place, groupId); return; }
      setData((d) => ({ ...d, places: d.places.map((p) => (p.id === id ? { ...p, groupId } : p)) }));
    },
    removePlace: (id) => {
      const place = findPlace(id);
      removeLater(id, `ลบ “${place.name}” แล้ว`, () => {
        if (user) cloud.deletePlace(user.uid, place);
        else setData((d) => ({ ...d, places: d.places.filter((p) => p.id !== id) }));
      });
    },

    addPlan: (plan) => {
      if (user) {
        const { id, stopIds } = cloud.createPlan(user.uid, plan);
        setPendingPlans((ps) => [...ps, { ...plan, stops: (plan.stops || []).map((st, i) => ({ ...st, id: stopIds[i] })), id, groupId: plan.groupId || null }]);
        return id;
      }
      const id = uid('plan');
      const stops = (plan.stops || []).map((s) => ({ ...s, id: uid('s') }));
      setData((d) => ({ ...d, plans: [{ members: [ME], ...plan, stops, id }, ...d.plans] }));
      return id;
    },
    // the trip's own fields (members, dates…) and the stops its new dates moved
    editPlan: (planId, { members, ...fields }, stopDates = {}) => {
      if (user) { cloud.editPlan(user.uid, findPlan(planId), { ...fields, memberIds: members }, stopDates); return; }
      updatePlan(planId, (p) => ({ ...p, ...fields, members, stops: p.stops.map((s) => (s.id in stopDates ? { ...s, date: stopDates[s.id] } : s)) }));
    },
    removePlan: (planId) => {
      const plan = findPlan(planId);
      removeLater(planId, `ลบ “${plan.name}” แล้ว`, () => {
        if (user) { setPendingPlans((ps) => ps.filter((p) => p.id !== planId)); cloud.deletePlan(user.uid, plan); }
        // what's still on this device goes with it; the piggy stays, just no longer tied to the trip
        setData((d) => ({
          ...d,
          plans: d.plans.filter((p) => p.id !== planId),
          expenses: d.expenses.filter((e) => e.planId !== planId),
          memories: d.memories.filter((m) => m.planId !== planId),
          postcards: (d.postcards || []).filter((x) => x.planId !== planId),
          jars: d.jars.map((j) => (j.planId === planId ? { ...j, planId: null } : j)),
        }));
      });
    },
    // taking back a plan just made (the shuffle's undo): gone at once, nothing in it yet
    discardPlan: (planId) => {
      if (user) {
        const plan = findPlan(planId);
        setPendingPlans((ps) => ps.filter((p) => p.id !== planId));
        if (plan) cloud.deletePlan(user.uid, plan);
        return;
      }
      setData((d) => ({ ...d, plans: d.plans.filter((p) => p.id !== planId) }));
    },
    // not going after all: the trip stays with the group
    leavePlan: (planId) => {
      const plan = findPlan(planId);
      const members = plan.members.filter((id) => id !== ME);
      if (user) { cloud.updatePlanFields(user.uid, plan, { memberIds: members }); return; }
      updatePlan(planId, (p) => ({ ...p, members }));
    },
    addStop: (planId, newStop) => {
      // last on its day, after whatever's been dragged into order
      const order = nextOrder(findPlan(planId)?.stops || [], newStop.date);
      const stop = order == null ? newStop : { ...newStop, order };
      if (user) return cloud.addStop(user.uid, findPlan(planId), stop);
      const id = uid('s');
      updatePlan(planId, (p) => ({ ...p, stops: [...p.stops, { checkIns: {}, note: '', ...stop, id }] }));
      return id;
    },
    updateStop: (planId, stopId, fields) => {
      if (user) { cloud.updateStop(user.uid, findPlan(planId), stopId, fields); return; }
      updatePlan(planId, (p) => ({ ...p, stops: p.stops.map((s) => (s.id === stopId ? { ...s, ...fields } : s)) }));
    },
    // updates: [{ id, order, time }] for a day's stops after a drag; the toast can put them back
    reorderStops: (planId, updates) => {
      const plan = findPlan(planId);
      const before = updates.map(({ id }) => { const s = plan.stops.find((x) => x.id === id); return { id, order: s.order ?? null, time: s.time || '' }; });
      const apply = (list) => {
        if (user) { cloud.updateStops(user.uid, plan, list); return; }
        const by = Object.fromEntries(list.map(({ id, ...f }) => [id, f]));
        updatePlan(planId, (p) => ({ ...p, stops: p.stops.map((s) => (by[s.id] ? { ...s, ...by[s.id] } : s)) }));
      };
      apply(updates);
      showToast('ย้ายจุดแวะแล้ว', { label: 'เลิกทำ', onClick: () => apply(before) });
    },
    removeStop: (planId, stopId) => {
      const plan = findPlan(planId);
      removeLater(`${planId}/${stopId}`, `ลบ “${plan.stops.find((s) => s.id === stopId)?.name}” แล้ว`, () => {
        if (user) cloud.deleteStop(user.uid, plan, stopId);
        else updatePlan(planId, (p) => ({ ...p, stops: p.stops.filter((s) => s.id !== stopId) }));
      });
    },
    toggleCheckIn: (planId, stopId, late = false, auto = false) => {
      // checking in at a saved place means I've been: it leaves the "want" list (and the shuffle)
      const stop = findPlan(planId)?.stops.find((s) => s.id === stopId);
      const place = stop?.placeId && findPlace(stop.placeId);
      const me = user ? user.uid : ME;
      if (place && !stop.checkIns?.[me] && place.status === 'want' && !place.startDate && (!place.by || place.by === me)) {
        if (user) cloud.updatePlace(user.uid, place, { status: 'visited' });
        else setData((d) => ({ ...d, places: d.places.map((p) => (p.id === place.id ? { ...p, status: 'visited' } : p)) }));
      }
      if (user) {
        const plan = findPlan(planId);
        const now = new Date();
        const at = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const mine = plan?.stops.find((s) => s.id === stopId)?.checkIns?.[user.uid];
        cloud.setCheckIn(user.uid, plan, stopId, mine ? null : { at, late, ...(auto && { auto }) });
        return;
      }
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
      if (user) {
        const plan = findPlan(planId);
        cloud.updatePlanFields(user.uid, plan, { checklist: plan.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) });
        return;
      }
      updatePlan(planId, (p) => ({ ...p, checklist: p.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }));
    },

    // a plan made a moment ago (quick add) may not be back from Firestore yet; it's one of mine
    addExpense: (e) => {
      if (user) { cloud.addExpense(user.uid, findPlan(e.planId) || { id: e.planId, groupId: null }, e); return; }
      setData((d) => ({ ...d, expenses: [{ ...e, id: uid('e') }, ...d.expenses] }));
    },
    updateExpense: (id, fields) => {
      if (user) { const e = moneyRef.current.expenses.find((x) => x.id === id); cloud.updateExpense(user.uid, findPlan(e.planId), id, fields); return; }
      setData((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? { ...e, ...fields } : e)) }));
    },
    removeExpense: (id) => {
      const e = moneyRef.current.expenses.find((x) => x.id === id);
      removeLater(id, `ลบ “${e?.title}” แล้ว`, () => {
        if (user) cloud.deleteExpense(user.uid, findPlan(e.planId), id);
        else setData((d) => ({ ...d, expenses: d.expenses.filter((x) => x.id !== id) }));
      });
    },

    // Paying back. I sent it (with a slip, if I have one) and the friend confirms; or I got it (cash) and say so.
    sendPayment: (planId, { to, amount, slip = null }) => {
      const pay = { from: ME, to, amount, status: 'sent', date: TODAY };
      if (user) { cloud.addPayment(user.uid, findPlan(planId), { ...pay, slip }); return; }
      setData((d) => ({ ...d, payments: [...d.payments, { ...pay, id: uid('pay'), planId, slip }] }));
    },
    receivePayment: (planId, { from, amount }) => {
      const pay = { from, to: ME, amount, status: 'received', date: TODAY };
      const plan = findPlan(planId);
      const id = user ? cloud.addPayment(user.uid, plan, pay) : uid('pay');
      if (!user) setData((d) => ({ ...d, payments: [...d.payments, { ...pay, id, planId, slip: null }] }));
      showToast(`ได้รับ ${fmtMoney(amount)} แล้ว`, {
        label: 'เลิกทำ',
        onClick: () => (user ? cloud.deletePayment(user.uid, plan, { id }) : setData((d) => ({ ...d, payments: d.payments.filter((x) => x.id !== id) }))),
      });
    },
    // the receiver says the money arrived
    confirmPayment: (payId) => {
      const pay = findPay(payId);
      if (user) { cloud.confirmPayment(user.uid, findPlan(pay.planId), payId); return; }
      setData((d) => ({ ...d, payments: d.payments.map((x) => (x.id === payId ? { ...x, status: 'received' } : x)) }));
    },
    removePayment: (payId) => {
      const pay = findPay(payId);
      removeLater(payId, 'ลบรายการโอนแล้ว', () => {
        if (user) cloud.deletePayment(user.uid, findPlan(pay.planId), pay);
        else setData((d) => ({ ...d, payments: d.payments.filter((x) => x.id !== payId) }));
      });
    },
    loadSlip: (payId) => {
      const pay = findPay(payId);
      return user ? cloud.readSlip(user.uid, findPlan(pay.planId), payId) : Promise.resolve(pay?.slip || null);
    },
    addMemory: (m) => setData((d) => ({ ...d, memories: [{ ...m, id: uid('m') }, ...d.memories] })),
    // a postcard to myself from a trip, written `on` a day, delivered on the trip's first anniversary (one per trip)
    writePostcard: ({ planId, text, on }) => {
      const deliver = addYear(findPlan(planId)?.startDate || on);
      setData((d) => ({ ...d, postcards: [...(d.postcards || []).filter((x) => !(x.planId === planId && x.by === ME)), { id: uid('pc'), planId, by: ME, on, deliver, text }] }));
    },
    removeMemory: (id) => removeLater(id, 'ลบความทรงจำแล้ว', () => setData((d) => ({ ...d, memories: d.memories.filter((m) => m.id !== id) }))),

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
  }), [updatePlan, user, removeLater, showToast]);

  // The plan that quick-add attaches to: the ongoing plan today, else a same-day outing created on demand
  const activePlan = useMemo(() => {
    const live = plans.filter((p) => planStatus(p, today) === 'ongoing');
    return live.find((p) => p.kind !== 'outing') || live[0] || null;
  }, [plans, today]);

  const ensureActivePlan = useCallback(() => {
    if (activePlan) return activePlan.id;
    return actions.addPlan({
      name: 'ออกไปข้างนอก', kind: 'outing', country: 'TH', currency: 'THB',
      startDate: today, endDate: today, members: [ME], budget: 0,
      cover: { icon: 'sight', tint: '#E6F7F4' },
    });
  }, [activePlan, actions, today]);

  const value = {
    ...data, plans, expenses, payments, today, activePlan, ensureActivePlan, actions,
    memories: hidden.length ? data.memories.filter((m) => !hidden.includes(m.id)) : data.memories,
    postcards: data.postcards || NONE,
    groups: user ? myGroups : data.groups,
    loading,
    cloud: Boolean(user),
    exit, // sign out, or leave the demo
    settings,
    places,
    sheet, openSheet, closeSheet, toast, showToast, hideToast,
    kindLabel: (k) => KINDS[k]?.label || k,
  };
  return <ProtoCtx.Provider value={value}>{children}</ProtoCtx.Provider>;
}
