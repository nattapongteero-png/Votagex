import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import {
  arrayRemove, arrayUnion, collection, connectFirestoreEmulator, doc, getDoc, getFirestore, onSnapshot, query,
  serverTimestamp, setDoc, Timestamp, updateDoc, where,
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
  db = getFirestore(app);
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
