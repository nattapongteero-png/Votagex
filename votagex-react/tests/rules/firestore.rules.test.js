// Firestore security rules, tested on the local emulator (never the real project).
// Run: npm run test:rules   (starts the emulator, runs this file, stops it)
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  arrayRemove, arrayUnion, collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, query, setDoc, Timestamp,
  updateDoc, where,
} from 'firebase/firestore';

let env;
const DAY = 24 * 60 * 60 * 1000;
const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();
// write fixtures without rules
const seed = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));

const group = { name: 'แก๊งมหาลัย', icon: 'users', color: '#0EA5E9', createdBy: 'ton', memberIds: ['ton', 'fai'], archived: false };
const plan = { name: 'โอซาก้า', kind: 'abroad', startDate: '2026-11-15', endDate: '2026-11-20', memberIds: ['ton', 'fai'], currency: 'JPY', budget: 45000, createdBy: 'ton', groupId: 'g1' };
const stop = { name: 'โดทงโบริ', date: '2026-11-16', time: '18:00', lat: 34.669, lng: 135.5016, cat: 'food', checkIns: {} };
const expense = { title: 'ทาโกะยากิ', amount: 600, currency: 'JPY', toTHB: 0.22, cat: 'food', date: '2026-11-16', paidBy: 'ton', splitIds: ['ton', 'fai'], createdBy: 'ton' };
const payment = { from: 'fai', to: 'ton', amount: 66, status: 'sent', date: '2026-11-17', slip: true, by: 'fai' };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-votagex',
    firestore: { rules: readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed(async (db) => {
    await setDoc(doc(db, 'groups/g1'), group);
    await setDoc(doc(db, 'groups/g1/plans/p1'), plan);
    await setDoc(doc(db, 'groups/g1/plans/p1/stops/s1'), stop);
    await setDoc(doc(db, 'groups/g1/plans/p1/expenses/e1'), expense);
    await setDoc(doc(db, 'groups/g1/plans/p1/payments/x1'), payment);
    await setDoc(doc(db, 'groups/g1/plans/p1/slips/x1'), { from: 'fai', to: 'ton', image: 'data:image/jpeg;base64,AAAA' });
    await setDoc(doc(db, 'invites/OK123'), { groupId: 'g1', createdBy: 'ton', expiresAt: Timestamp.fromMillis(Date.now() + DAY) });
    await setDoc(doc(db, 'invites/OLD99'), { groupId: 'g1', createdBy: 'ton', expiresAt: Timestamp.fromMillis(Date.now() - DAY) });
    await setDoc(doc(db, 'users/fai'), { name: 'ฝ้าย' });
    await setDoc(doc(db, 'users/fai/private/settings'), { autoCheckIn: true });
  });
});

describe('users', () => {
  it('a signed-in friend can read my profile, a stranger without login cannot', async () => {
    await assertSucceeds(getDoc(doc(as('ton'), 'users/fai')));
    await assertFails(getDoc(doc(anon(), 'users/fai')));
  });
  it('nobody else can write my profile or read my private data', async () => {
    await assertFails(setDoc(doc(as('ton'), 'users/fai'), { name: 'แฮ็ก' }));
    await assertFails(getDoc(doc(as('ton'), 'users/fai/private/settings')));
    await assertSucceeds(getDoc(doc(as('fai'), 'users/fai/private/settings')));
  });
  it('my solo trips are mine only', async () => {
    await assertSucceeds(setDoc(doc(as('fai'), 'users/fai/plans/solo'), { ...plan, memberIds: ['fai'], groupId: null }));
    await assertFails(getDoc(doc(as('ton'), 'users/fai/plans/solo')));
  });
});

describe('groups', () => {
  it('I can create a group with only me in it', async () => {
    await assertSucceeds(setDoc(doc(as('bew'), 'groups/g2'), { ...group, createdBy: 'bew', memberIds: ['bew'] }));
    await assertFails(setDoc(doc(as('bew'), 'groups/g3'), { ...group, createdBy: 'bew', memberIds: ['bew', 'prae'] }));
  });
  it('only members can read a group; "my groups" query works', async () => {
    await assertSucceeds(getDoc(doc(as('fai'), 'groups/g1')));
    await assertFails(getDoc(doc(as('bew'), 'groups/g1')));
    await assertSucceeds(getDocs(query(collection(as('fai'), 'groups'), where('memberIds', 'array-contains', 'fai'))));
  });
  it('joining needs a valid invite and adds only me', async () => {
    await assertSucceeds(updateDoc(doc(as('bew'), 'groups/g1'), { memberIds: arrayUnion('bew'), joinCode: 'OK123' }));
    await assertFails(updateDoc(doc(as('prae'), 'groups/g1'), { memberIds: arrayUnion('prae'), joinCode: 'OLD99' })); // expired
    await assertFails(updateDoc(doc(as('prae'), 'groups/g1'), { memberIds: arrayUnion('prae'), joinCode: 'NOPE' })); // no such invite
    await assertFails(updateDoc(doc(as('prae'), 'groups/g1'), { memberIds: arrayUnion('prae', 'x'), joinCode: 'OK123' })); // brings a friend
  });
  it('a member can leave; only the creator removes others or archives', async () => {
    await assertFails(updateDoc(doc(as('fai'), 'groups/g1'), { memberIds: arrayRemove('ton') }));
    await assertFails(updateDoc(doc(as('fai'), 'groups/g1'), { archived: true }));
    await assertSucceeds(updateDoc(doc(as('fai'), 'groups/g1'), { memberIds: arrayRemove('fai') }));
    await assertSucceeds(updateDoc(doc(as('ton'), 'groups/g1'), { archived: true }));
    await assertFails(deleteDoc(doc(as('ton'), 'groups/g1')));
  });
  it('members rename the group; outsiders cannot', async () => {
    await assertSucceeds(updateDoc(doc(as('fai'), 'groups/g1'), { name: 'แก๊งเที่ยว' }));
    await assertFails(updateDoc(doc(as('bew'), 'groups/g1'), { name: 'แก๊งเที่ยว' }));
  });
  it('only members create invites, and nobody can list them', async () => {
    const inv = (by) => ({ groupId: 'g1', createdBy: by, expiresAt: Timestamp.fromMillis(Date.now() + DAY) });
    await assertSucceeds(setDoc(doc(as('fai'), 'invites/NEW1'), inv('fai')));
    await assertFails(setDoc(doc(as('bew'), 'invites/NEW2'), inv('bew')));
    await assertFails(getDocs(collection(as('fai'), 'invites')));
  });
});

describe('group trips', () => {
  it('members read and edit; outsiders cannot even read', async () => {
    await assertSucceeds(updateDoc(doc(as('fai'), 'groups/g1/plans/p1'), { name: 'โอซาก้า–เกียวโต' }));
    await assertFails(getDoc(doc(as('bew'), 'groups/g1/plans/p1')));
  });
  it('who goes must be in the group', async () => {
    await assertFails(setDoc(doc(as('fai'), 'groups/g1/plans/p2'), { ...plan, createdBy: 'fai', memberIds: ['fai', 'bew'] }));
    await assertSucceeds(setDoc(doc(as('fai'), 'groups/g1/plans/p2'), { ...plan, createdBy: 'fai', memberIds: ['fai'] }));
  });
  it('"my calendar" finds every trip I go on', async () => {
    const snap = await assertSucceeds(getDocs(query(collectionGroup(as('fai'), 'plans'), where('memberIds', 'array-contains', 'fai'))));
    if (snap.size !== 1) throw new Error(`expected 1 plan, got ${snap.size}`);
  });
  it('I can check in only for myself', async () => {
    await assertSucceeds(updateDoc(doc(as('fai'), 'groups/g1/plans/p1/stops/s1'), { 'checkIns.fai': { at: '18:05', late: true } }));
    await assertFails(updateDoc(doc(as('fai'), 'groups/g1/plans/p1/stops/s1'), { 'checkIns.ton': { at: '18:05', late: false } }));
  });
  it('expenses: valid amounts, only people on the trip, only the writer or payer edits', async () => {
    const col = (u) => collection(as(u), 'groups/g1/plans/p1/expenses');
    await assertSucceeds(setDoc(doc(col('fai'), 'e2'), { ...expense, createdBy: 'fai' }));
    await assertFails(setDoc(doc(col('fai'), 'e3'), { ...expense, createdBy: 'fai', amount: -5 }));
    await assertFails(setDoc(doc(col('fai'), 'e4'), { ...expense, createdBy: 'fai', splitIds: ['fai', 'bew'] }));
    await assertFails(setDoc(doc(col('fai'), 'e5'), { ...expense, createdBy: 'ton' })); // pretending to be someone else
    await assertFails(deleteDoc(doc(as('fai'), 'groups/g1/plans/p1/expenses/e1'))); // ton wrote it and paid
    await assertSucceeds(deleteDoc(doc(as('ton'), 'groups/g1/plans/p1/expenses/e1')));
  });
  it('"spent this month" finds every expense I share in', async () => {
    await assertSucceeds(getDocs(query(collectionGroup(as('fai'), 'expenses'), where('splitIds', 'array-contains', 'fai'))));
  });
  it('only the trip or group creator deletes a trip', async () => {
    await assertFails(deleteDoc(doc(as('fai'), 'groups/g1/plans/p1')));
    await assertSucceeds(deleteDoc(doc(as('ton'), 'groups/g1/plans/p1')));
  });
  it('paying back: the sender says "sent", only the receiver confirms; cash is recorded by the receiver', async () => {
    const col = (u) => collection(as(u), 'groups/g1/plans/p1/payments');
    await assertSucceeds(setDoc(doc(col('fai'), 'x2'), { ...payment, slip: false }));
    await assertFails(setDoc(doc(col('fai'), 'x3'), { ...payment, from: 'ton', to: 'fai', slip: false })); // saying ton sent it
    await assertFails(setDoc(doc(col('fai'), 'x4'), { ...payment, to: 'bew', slip: false })); // not on the trip
    await assertSucceeds(setDoc(doc(col('ton'), 'x5'), { ...payment, status: 'received', slip: false, by: 'ton' })); // cash
    const x1 = (u) => doc(as(u), 'groups/g1/plans/p1/payments/x1');
    await assertFails(updateDoc(x1('fai'), { status: 'received' })); // the sender can't confirm it
    await assertFails(updateDoc(x1('ton'), { status: 'received', amount: 1 }));
    await assertSucceeds(updateDoc(x1('ton'), { status: 'received' }));
  });
  it('a slip is seen only by the two people', async () => {
    await seed((db) => updateDoc(doc(db, 'groups/g1'), { memberIds: ['ton', 'fai', 'prae'] }));
    await assertSucceeds(getDoc(doc(as('ton'), 'groups/g1/plans/p1/slips/x1')));
    await assertSucceeds(getDoc(doc(as('fai'), 'groups/g1/plans/p1/slips/x1')));
    await assertFails(getDoc(doc(as('prae'), 'groups/g1/plans/p1/slips/x1')));
    await assertFails(setDoc(doc(as('ton'), 'groups/g1/plans/p1/slips/x9'), { from: 'fai', to: 'ton', image: 'data:' })); // as fai
    await assertFails(deleteDoc(doc(as('prae'), 'groups/g1/plans/p1/slips/x1')));
  });
  it("whoever may delete the trip may clear out what's in it", async () => {
    await seed((db) => setDoc(doc(db, 'groups/g1/plans/p1/expenses/e9'), { ...expense, paidBy: 'fai', createdBy: 'fai' }));
    await assertSucceeds(deleteDoc(doc(as('ton'), 'groups/g1/plans/p1/expenses/e9')));
    await assertSucceeds(deleteDoc(doc(as('ton'), 'groups/g1/plans/p1/slips/x1')));
    await assertSucceeds(deleteDoc(doc(as('ton'), 'groups/g1/plans/p1/payments/x1')));
  });
});

describe('old app trips (until it is retired)', () => {
  beforeEach(() => seed(async (db) => {
    await setDoc(doc(db, 'trips/legacy'), { name: 'ทริปเก่า', members: [] }); // saved before ownerUid existed
    await setDoc(doc(db, 'trips/t1'), { name: 'ทริป', ownerUid: 'ton', members: [{ name: 'ต้น' }], memberUids: ['ton'] });
  }));
  it('no more open reads or edits by strangers', async () => {
    await assertFails(getDoc(doc(anon(), 'trips/t1')));
    await assertFails(updateDoc(doc(as('bew'), 'trips/legacy'), { name: 'แก้' }));
    await assertFails(deleteDoc(doc(as('bew'), 'trips/legacy')));
    await assertFails(updateDoc(doc(as('bew'), 'trips/t1'), { memberUids: ['bew', 'x', 'ton'], members: [] }));
  });
  it('joining still works: add only myself', async () => {
    await assertSucceeds(updateDoc(doc(as('bew'), 'trips/t1'), { memberUids: arrayUnion('bew'), members: arrayUnion({ name: 'บิว' }) }));
  });
});
