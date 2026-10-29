import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithCustomToken, signInWithPopup, signInWithRedirect, signOut, updateProfile,
} from 'firebase/auth';
import {
  arrayRemove, arrayUnion, collection, connectFirestoreEmulator, deleteDoc, deleteField, doc, getDoc,
  initializeFirestore, onSnapshot, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { DEFAULT_AVATAR } from './data';

// Firebase for the new app (free Spark plan). Data layout and who may do what: docs/DATA_MODEL.md.
// With VITE_USE_EMULATOR=true (npm run dev:emu) it talks to the local emulators, never the real project.

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const EMULATOR = import.meta.env.VITE_USE_EMULATOR === 'true';
export const cloudReady = Boolean(config.apiKey && config.projectId);

let auth = null;
let db = null;
if (cloudReady) {
  const app = initializeApp(config, 'votagex');
  auth = getAuth(app);
  db = initializeFirestore(app, { ignoreUndefinedProperties: true }); // optional fields left undefined are just skipped
  if (EMULATOR) {
    connectAuthEmulator(auth, `http://${location.hostname}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, location.hostname, 8080);
  }
}

// Back from LINE (workers/line-login): #line=<Firebase custom token>&name=…&pic=…, or #line_error=…
// Read once, then taken off the address so a reload or a shared link never carries it.
const fromLine = (() => {
  const h = new URLSearchParams(location.hash.slice(1));
  if (!h.has('line') && !h.has('line_error')) return null;
  history.replaceState(null, '', location.pathname + location.search);
  return { token: h.get('line'), name: h.get('name') || '', pic: h.get('pic') || '', error: h.get('line_error') };
})();
export const lineError = fromLine?.error || null;

const DEMO_KEY = 'votagex.proto.demo';
const readDemo = () => { try { return localStorage.getItem(DEMO_KEY) === '1'; } catch { return false; } };

// signed in (user), looking at the sample data (demo), or neither yet (out)
export function useSession() {
  const [state, setState] = useState(() => ({ status: cloudReady ? 'loading' : 'demo', user: null }));
  useEffect(() => {
    if (!cloudReady) return undefined;
    if (fromLine?.token) finishLine(fromLine).then((named) => named && setState((st) => ({ ...st, named: true })));
    return onAuthStateChanged(auth, (u) => {
      if (u) setState({ status: 'in', user: u });
      else setState({ status: readDemo() ? 'demo' : 'out', user: null });
    });
  }, []);
  const enterDemo = () => { try { localStorage.setItem(DEMO_KEY, '1'); } catch { /* fine */ } setState({ status: 'demo', user: null }); };
  const leaveDemo = () => { try { localStorage.removeItem(DEMO_KEY); } catch { /* fine */ } setState({ status: cloudReady ? 'out' : 'demo', user: null }); };
  return { ...state, enterDemo, leaveDemo };
}

export const signInGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const signInGoogleRedirect = () => signInWithRedirect(auth, new GoogleAuthProvider());
export const signOutCloud = () => signOut(auth);

// LINE: the Worker's address (VITE_LINE_LOGIN_URL); unset, the button stays "soon".
// It comes back to this same page (an invite link included).
export const lineReady = cloudReady && Boolean(import.meta.env.VITE_LINE_LOGIN_URL);
export const signInLine = () => location.assign(`${import.meta.env.VITE_LINE_LOGIN_URL}/start?return=${encodeURIComponent(location.href.split('#')[0])}`);
// the name and photo come from LINE (friends see them), the first time and whenever they change there
async function finishLine({ token, name, pic }) {
  try {
    const { user } = await signInWithCustomToken(auth, token);
    if (name && (user.displayName !== name || user.photoURL !== (pic || null))) {
      await updateProfile(user, pic ? { displayName: name.slice(0, 60), photoURL: pic } : { displayName: name.slice(0, 60) });
      saveProfile(user).catch(() => {});
      return true;
    }
  } catch (e) {
    console.warn('LINE sign-in failed:', e?.code);
  }
  return false;
}

// my public profile (name, photo): what friends in my groups see
export const profileOf = (u) => ({ id: u.uid, name: (u.displayName || 'ฉัน').slice(0, 60), avatar: u.photoURL || DEFAULT_AVATAR });
export const saveProfile = (u) => {
  const p = profileOf(u);
  return setDoc(doc(db, 'users', u.uid), { name: p.name, avatar: p.avatar, updatedAt: serverTimestamp() }, { merge: true });
};
export async function loadProfiles(uids) {
  const out = {};
  await Promise.all(uids.map(async (id) => {
    const snap = await getDoc(doc(db, 'users', id)).catch(() => null);
    if (snap?.exists()) out[id] = { id, name: snap.data().name, avatar: snap.data().avatar || DEFAULT_AVATAR };
  }));
  return out;
}

/* ---------- groups ---------- */
// my groups, live, archived ones too (their trips can still be looked at)
export function watchGroups(uid, onChange) {
  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', uid));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data(), members: d.data().memberIds })));
  }, () => onChange([]));
}
// a new group starts with only me; friends come in through an invite link
export function createGroup(uid, { name, icon, color }) {
  const ref = doc(collection(db, 'groups'));
  setDoc(ref, { name, icon, color, createdBy: uid, memberIds: [uid], archived: false, createdAt: serverTimestamp() });
  return ref.id;
}
export const archiveGroup = (gid) => updateDoc(doc(db, 'groups', gid), { archived: true });
export const leaveGroup = (uid, gid) => updateDoc(doc(db, 'groups', gid), { memberIds: arrayRemove(uid) });

/* ---------- invites ---------- */
const CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const INVITE_DAYS = 14;
export async function createInvite(uid, group) {
  const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => CODE[b % CODE.length]).join('');
  await setDoc(doc(db, 'invites', code), {
    groupId: group.id, groupName: group.name, createdBy: uid,
    expiresAt: Timestamp.fromMillis(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
  });
  return `${location.origin}/proto/join/${code}`;
}
// what the link points at (null: no such link, or it has expired)
export async function readInvite(code) {
  const snap = await getDoc(doc(db, 'invites', code)).catch(() => null);
  if (!snap?.exists()) return null;
  const inv = snap.data();
  return inv.expiresAt.toMillis() > Date.now() ? { code, ...inv } : null;
}
export const joinGroup = (uid, invite) => updateDoc(doc(db, 'groups', invite.groupId), { memberIds: arrayUnion(uid), joinCode: invite.code });

/* ---------- trips, their stops, expenses and transfers ---------- */
// A group's trip lives under the group (everyone in it plans together); a trip of my own under me.
// In the app a plan looks like the demo's: { id, ...fields, members, stops: [...] }, and carries its
// expenses (split = splitIds in Firestore) and transfers, which the store lays out flat as the demo has them.
const plansPath = (uid, groupId) => (groupId ? `groups/${groupId}/plans` : `users/${uid}/plans`);
const planRef = (uid, plan) => doc(db, plansPath(uid, plan.groupId), plan.id);

// what each of a plan's lists holds, in the app's shape
const CHILDREN = {
  stops: (x) => ({ id: x.id, ...x.data() }),
  expenses: (x, planId) => ({ id: x.id, ...x.data(), split: x.data().splitIds, planId }),
  payments: (x, planId) => ({ id: x.id, ...x.data(), planId }),
  memories: (x, planId) => ({ id: x.id, ...x.data(), planId }),
};

// Every trip I can see: mine, and every trip of each of my groups (whether I go or not), each with its stops,
// expenses and transfers, live. onChange gets the whole list whenever anything changes, and whether every
// place has answered yet (until then a trip that isn't there may only not have loaded).
// Returns a function that stops listening.
export function watchPlans(uid, groupIds, onChange) {
  const plans = new Map(); // key "root/id" → plan without its lists
  const lists = new Map(); // "root/id|stops" → docs
  const subs = new Map(); // same key → stop listening
  const heard = new Set(); // roots that have answered at least once
  const emit = () => onChange([...plans.entries()].map(([k, p]) => ({
    ...p, ...Object.fromEntries(Object.keys(CHILDREN).map((name) => [name, lists.get(`${k}|${name}`) || []])),
  })), heard.size > groupIds.length);
  const watchRoot = (groupId) => onSnapshot(collection(db, plansPath(uid, groupId)), (snap) => {
    const root = groupId || 'me';
    heard.add(root);
    const seen = new Set();
    snap.docs.forEach((d) => {
      const k = `${root}/${d.id}`;
      seen.add(k);
      plans.set(k, { id: d.id, ...d.data(), groupId: groupId || null, members: d.data().memberIds });
      Object.entries(CHILDREN).forEach(([name, read]) => {
        const key = `${k}|${name}`;
        if (subs.has(key)) return;
        subs.set(key, onSnapshot(collection(d.ref, name), (ss) => {
          lists.set(key, ss.docs.map((x) => read(x, d.id)));
          emit();
        }, (e) => { console.warn(`${name} listener:`, e.code); subs.delete(key); })); // dropped: the next snapshot listens again
      });
    });
    [...plans.keys()].filter((k) => k.startsWith(`${root}/`) && !seen.has(k)).forEach((k) => {
      plans.delete(k);
      Object.keys(CHILDREN).forEach((name) => { const key = `${k}|${name}`; lists.delete(key); subs.get(key)?.(); subs.delete(key); });
    });
    emit();
  }, (e) => { console.warn('plans listener:', e.code); heard.add(groupId || 'me'); emit(); });
  const roots = [watchRoot(null), ...groupIds.map(watchRoot)];
  return () => { roots.forEach((u) => u()); subs.forEach((u) => u()); };
}

// a new trip (and its first stops); the id is known at once, the write finishes in the background
export function createPlan(uid, { members, stops = [], ...plan }) {
  const ref = doc(collection(db, plansPath(uid, plan.groupId)));
  const batch = writeBatch(db);
  batch.set(ref, { ...plan, groupId: plan.groupId || null, memberIds: members, createdBy: uid, createdAt: serverTimestamp() });
  // stops get their own ids in Firestore, known at once so the plan can be shown (or taken back) before it syncs
  const stopIds = stops.map((st) => {
    const fields = { ...st };
    delete fields.id;
    const stopRef = doc(collection(ref, 'stops'));
    batch.set(stopRef, { checkIns: {}, ...fields });
    return stopRef.id;
  });
  batch.commit();
  return { id: ref.id, stopIds };
}
export const updatePlanFields = (uid, plan, fields) => updateDoc(planRef(uid, plan), fields);
// the trip's own fields and, when its dates moved, each stop's new day, in one go
export function editPlan(uid, plan, fields, stopDates = {}) {
  const batch = writeBatch(db);
  batch.update(planRef(uid, plan), fields);
  Object.entries(stopDates).forEach(([id, date]) => batch.update(doc(planRef(uid, plan), 'stops', id), { date }));
  return batch.commit();
}
// the trip with its stops, expenses, transfers and slips, memories and their photos
export function deletePlan(uid, plan) {
  const ref = planRef(uid, plan);
  const batch = writeBatch(db);
  plan.stops.forEach((s) => batch.delete(doc(ref, 'stops', s.id)));
  (plan.memories || []).forEach((m) => {
    batch.delete(doc(ref, 'memories', m.id));
    (m.photoIds || []).forEach((id) => batch.delete(doc(ref, 'photos', id)));
  });
  (plan.expenses || []).forEach((e) => batch.delete(doc(ref, 'expenses', e.id)));
  (plan.payments || []).forEach((x) => {
    batch.delete(doc(ref, 'payments', x.id));
    if (x.slip) batch.delete(doc(ref, 'slips', x.id));
  });
  batch.delete(ref);
  return batch.commit();
}
// a new stop; its id is known at once (to open it right after)
export function addStop(uid, plan, stop) {
  const ref = doc(collection(planRef(uid, plan), 'stops'));
  setDoc(ref, { note: '', ...stop, checkIns: {} });
  return ref.id;
}
export const updateStop = (uid, plan, stopId, fields) => updateDoc(doc(planRef(uid, plan), 'stops', stopId), fields);
// several stops at once (a day dragged into a new order)
export function updateStops(uid, plan, updates) {
  const batch = writeBatch(db);
  updates.forEach(({ id, ...fields }) => batch.update(doc(planRef(uid, plan), 'stops', id), fields));
  return batch.commit();
}
export const deleteStop = (uid, plan, stopId) => deleteDoc(doc(planRef(uid, plan), 'stops', stopId));
// my own check-in only (the rules refuse anyone else's): set it, or take it back with null
export const setCheckIn = (uid, plan, stopId, value) => updateDoc(doc(planRef(uid, plan), 'stops', stopId), { [`checkIns.${uid}`]: value ?? deleteField() });

/* ---------- expenses ---------- */
const expenseFields = ({ split, ...e }) => {
  const f = { ...e, splitIds: split };
  delete f.id; delete f.planId;
  return f;
};
export function addExpense(uid, plan, e) {
  const ref = doc(collection(planRef(uid, plan), 'expenses'));
  setDoc(ref, { ...expenseFields(e), createdBy: uid });
  return ref.id;
}
export const updateExpense = (uid, plan, id, e) => updateDoc(doc(planRef(uid, plan), 'expenses', id), expenseFields(e));
export const deleteExpense = (uid, plan, id) => deleteDoc(doc(planRef(uid, plan), 'expenses', id));

/* ---------- paying friends back ---------- */
// "โอนแล้ว" from the one who sent it (the other one confirms), or "ได้รับแล้ว" by the one who got it (cash).
// A slip goes in its own doc that only those two can read.
export function addPayment(uid, plan, { slip, ...pay }) {
  const ref = doc(collection(planRef(uid, plan), 'payments'));
  const batch = writeBatch(db);
  batch.set(ref, { ...pay, slip: Boolean(slip), by: uid, createdAt: serverTimestamp() });
  if (slip) batch.set(doc(planRef(uid, plan), 'slips', ref.id), { from: pay.from, to: pay.to, image: slip });
  batch.commit();
  return ref.id;
}
export const confirmPayment = (uid, plan, id) => updateDoc(doc(planRef(uid, plan), 'payments', id), { status: 'received' });
export function deletePayment(uid, plan, pay) {
  const batch = writeBatch(db);
  batch.delete(doc(planRef(uid, plan), 'payments', pay.id));
  if (pay.slip) batch.delete(doc(planRef(uid, plan), 'slips', pay.id));
  return batch.commit();
}
export async function readSlip(uid, plan, id) {
  const snap = await getDoc(doc(planRef(uid, plan), 'slips', id)).catch(() => null);
  return snap?.data()?.image || null;
}

/* ---------- memories ---------- */
// A memory names its photos (photoIds); each photo, a shrunk JPEG, is a doc of its own under the trip so the
// memories load light. Photos never change, so each is fetched once and kept on the device (IndexedDB).
const PHOTO_DB = 'votagex-photos';
let photoDb = null;
const openPhotos = () => {
  photoDb ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTO_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch(() => null); // private mode: no cache, fetched each time
  return photoDb;
};
async function keptPhoto(id, image) {
  const idb = await openPhotos();
  if (!idb) return image ?? null;
  return new Promise((resolve) => {
    const tx = idb.transaction('photos', image ? 'readwrite' : 'readonly');
    const req = image ? tx.objectStore('photos').put(image, id) : tx.objectStore('photos').get(id);
    req.onsuccess = () => resolve(image ?? req.result ?? null);
    req.onerror = () => resolve(image ?? null);
  });
}
// a photo's data URL (null: gone, or not mine to see)
export async function loadPhoto(uid, plan, id) {
  const kept = await keptPhoto(id);
  if (kept) return kept;
  const snap = await getDoc(doc(planRef(uid, plan), 'photos', id)).catch(() => null);
  const image = snap?.data()?.image;
  return image ? keptPhoto(id, image) : null;
}
// photos: data URLs; the id is known at once, the write finishes in the background
export function addMemory(uid, plan, { photos = [], ...m }) {
  const ref = doc(collection(planRef(uid, plan), 'memories'));
  const batch = writeBatch(db);
  const photoIds = photos.map((image) => {
    const photoRef = doc(collection(planRef(uid, plan), 'photos'));
    batch.set(photoRef, { memoryId: ref.id, by: uid, image });
    keptPhoto(photoRef.id, image);
    return photoRef.id;
  });
  const fields = { ...m, stopId: m.stopId || null, photoIds, by: uid, createdAt: serverTimestamp() };
  delete fields.id; delete fields.planId;
  batch.set(ref, fields);
  batch.commit();
  return ref.id;
}
export function deleteMemory(uid, plan, memory) {
  const batch = writeBatch(db);
  batch.delete(doc(planRef(uid, plan), 'memories', memory.id));
  (memory.photoIds || []).forEach((id) => batch.delete(doc(planRef(uid, plan), 'photos', id)));
  return batch.commit();
}

/* ---------- my piggies ---------- */
// Mine alone, under me: the piggies, and what went in or came out of them (each a doc of its own, never
// changed, so two phones putting money in at once both count)
export function watchPiggy(uid, onChange) {
  const got = { jars: null, piggyLog: null };
  const emit = () => got.jars && got.piggyLog && onChange({ ...got });
  const watch = (name) => onSnapshot(collection(db, 'users', uid, name), (snap) => {
    got[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    emit();
  }, () => { got[name] = got[name] || []; emit(); });
  const offs = [watch('jars'), watch('piggyLog')];
  return () => offs.forEach((off) => off());
}
const without = (x, ...keys) => { const f = { ...x }; keys.forEach((k) => delete f[k]); return f; };
export function addJar(uid, jar) {
  const ref = jar.id ? doc(db, 'users', uid, 'jars', jar.id) : doc(collection(db, 'users', uid, 'jars'));
  setDoc(ref, { ...without(jar, 'id'), createdAt: serverTimestamp() });
  return ref.id;
}
export const updateJar = (uid, jarId, fields) => updateDoc(doc(db, 'users', uid, 'jars', jarId), fields);
export function addPiggyLog(uid, entry) {
  const ref = entry.id ? doc(db, 'users', uid, 'piggyLog', entry.id) : doc(collection(db, 'users', uid, 'piggyLog'));
  setDoc(ref, without(entry, 'id'));
  return ref.id;
}

/* ---------- my own: settings, saved places, PromptPay ---------- */
const settingsRef = (uid) => doc(db, 'users', uid, 'private', 'settings');
export const watchSettings = (uid, onChange) => onSnapshot(settingsRef(uid), (s) => onChange(s.data() || {}), () => onChange({}));
// a value of null or undefined clears the setting
export const saveSettings = (uid, fields) => setDoc(settingsRef(uid), Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v ?? deleteField()])), { merge: true });

// Saved places (events are places with dates): mine, and those shared with each of my groups, newest first
const placesCol = (uid, groupId) => (groupId ? collection(db, 'groups', groupId, 'places') : collection(db, 'users', uid, 'places'));
export function watchPlaces(uid, groupIds, onChange) {
  const lists = new Map();
  const emit = () => onChange([...lists.values()].flat().sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || '')));
  const watchRoot = (groupId) => onSnapshot(placesCol(uid, groupId), (snap) => {
    lists.set(groupId || 'me', snap.docs.map((d) => ({ id: d.id, ...d.data(), groupId: groupId || null })));
    emit();
  }, () => { lists.set(groupId || 'me', []); emit(); });
  const offs = [watchRoot(null), ...groupIds.map(watchRoot)];
  return () => offs.forEach((off) => off());
}
const placeFields = (place) => {
  const f = { ...place };
  delete f.id; delete f.groupId;
  return f;
};
export function addPlace(uid, place) {
  const ref = doc(placesCol(uid, place.groupId));
  setDoc(ref, { ...placeFields(place), by: uid });
  return ref.id;
}
export const updatePlace = (uid, place, fields) => updateDoc(doc(placesCol(uid, place.groupId), place.id), fields);
export const deletePlace = (uid, place) => deleteDoc(doc(placesCol(uid, place.groupId), place.id));
// share with a group, or take it back to just me: the place moves there, keeping its id
export function movePlace(uid, place, groupId) {
  const batch = writeBatch(db);
  batch.set(doc(placesCol(uid, groupId), place.id), placeFields(place));
  batch.delete(doc(placesCol(uid, place.groupId), place.id));
  return batch.commit();
}

// My PromptPay goes into each of my groups (only people there can read it, to make the QR that pays me back)
export function savePromptPay(uid, groupIds, promptpay) {
  const batch = writeBatch(db);
  groupIds.forEach((gid) => batch.set(doc(db, 'groups', gid, 'members', uid), { promptpay: promptpay || deleteField() }, { merge: true }));
  return batch.commit();
}
export async function readPromptPay(groupId, uid) {
  const snap = await getDoc(doc(db, 'groups', groupId, 'members', uid)).catch(() => null);
  return snap?.data()?.promptpay || null;
}
