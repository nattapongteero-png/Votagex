import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
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

const DEMO_KEY = 'votagex.proto.demo';
const readDemo = () => { try { return localStorage.getItem(DEMO_KEY) === '1'; } catch { return false; } };

// signed in (user), looking at the sample data (demo), or neither yet (out)
export function useSession() {
  const [state, setState] = useState(() => ({ status: cloudReady ? 'loading' : 'demo', user: null }));
  useEffect(() => {
    if (!cloudReady) return undefined;
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
// my groups, live; archived ones drop out of the list
export function watchGroups(uid, onChange) {
  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', uid));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data(), members: d.data().memberIds })).filter((g) => !g.archived));
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
  // stops get their own ids in Firestore
  stops.forEach((st) => { const fields = { ...st }; delete fields.id; batch.set(doc(collection(ref, 'stops')), { checkIns: {}, ...fields }); });
  batch.commit();
  return ref.id;
}
export const updatePlanFields = (uid, plan, fields) => updateDoc(planRef(uid, plan), fields);
// the trip's own fields and, when its dates moved, each stop's new day, in one go
export function editPlan(uid, plan, fields, stopDates = {}) {
  const batch = writeBatch(db);
  batch.update(planRef(uid, plan), fields);
  Object.entries(stopDates).forEach(([id, date]) => batch.update(doc(planRef(uid, plan), 'stops', id), { date }));
  return batch.commit();
}
// the trip with its stops, expenses, transfers and slips (its memories are still kept on each device)
export function deletePlan(uid, plan) {
  const ref = planRef(uid, plan);
  const batch = writeBatch(db);
  plan.stops.forEach((s) => batch.delete(doc(ref, 'stops', s.id)));
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
