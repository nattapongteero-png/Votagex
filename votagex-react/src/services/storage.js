import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion
} from 'firebase/firestore';
import { getDb } from './firebase';

const DEFAULT_TRIP_DESCRIPTION = 'ออกเดินทางไปสัมผัสประสบการณ์ใหม่ๆ ด้วยกัน! วางแผนทริปสนุกๆ พร้อมเพื่อนร่วมเดินทาง สร้างความทรงจำดีๆ ที่จะอยู่ในใจตลอดไป';

export async function saveTrip(tripData) {
  const db = getDb();
  const trip = { ...tripData };
  trip.createdAt = new Date().toISOString();
  if (!trip.description) trip.description = DEFAULT_TRIP_DESCRIPTION;
  const docRef = await addDoc(collection(db, 'trips'), trip);
  return { ...trip, id: docRef.id };
}

export async function getTrips() {
  const db = getDb();
  const snapshot = await getDocs(collection(db, 'trips'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateTrip(tripId, updatedData) {
  const db = getDb();
  await updateDoc(doc(db, 'trips', tripId), updatedData);
}

export async function joinTrip(tripId, member, uid) {
  const db = getDb();
  const updates = { members: arrayUnion(member) };
  if (uid) updates.memberUids = arrayUnion(uid);
  await updateDoc(doc(db, 'trips', tripId), updates);
}

export async function deleteTrip(tripId) {
  const db = getDb();
  await deleteDoc(doc(db, 'trips', tripId));
}

export function uploadProfileImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function backfillTripDescriptions() {
  // No longer needed with Firestore
}
