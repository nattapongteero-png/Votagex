import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  onSnapshot
} from 'firebase/firestore';
import { getDb } from './firebase';

export const DEFAULT_TRIP_DESCRIPTION = 'ออกเดินทางไปสัมผัสประสบการณ์ใหม่ๆ ด้วยกัน! วางแผนทริปสนุกๆ พร้อมเพื่อนร่วมเดินทาง สร้างความทรงจำดีๆ ที่จะอยู่ในใจตลอดไป';

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

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function compressImage(file, maxWidth = 200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return reject(new Error('รองรับเฉพาะไฟล์ JPG, PNG, WebP, GIF'));
    }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function uploadProfileImage(file) {
  return compressImage(file, 200, 0.7);
}

export function uploadCoverImage(file) {
  return compressImage(file, 600, 0.6);
}

export async function updateProfileImageInTrips(username, newImage) {
  const db = getDb();
  if (!db || !username) return;
  const snapshot = await getDocs(collection(db, 'trips'));
  const batch = [];
  snapshot.docs.forEach(d => {
    const data = d.data();
    const updates = {};

    // Update profileImage if this user is the creator
    if (data.profileName === username && data.profileImage !== newImage) {
      updates.profileImage = newImage;
    }

    // Update image in members array
    if (Array.isArray(data.members)) {
      let memberChanged = false;
      const newMembers = data.members.map(m => {
        if (m.name === username && m.image !== newImage) {
          memberChanged = true;
          return { ...m, image: newImage };
        }
        return m;
      });
      if (memberChanged) updates.members = newMembers;
    }

    if (Object.keys(updates).length > 0) {
      batch.push(updateDoc(doc(db, 'trips', d.id), updates));
    }
  });
  await Promise.all(batch);
}

export function subscribeTrips(callback) {
  const db = getDb();
  if (!db) {
    const timer = setTimeout(() => subscribeTrips(callback), 500);
    return () => clearTimeout(timer);
  }
  return onSnapshot(collection(db, 'trips'), (snapshot) => {
    const trips = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(trips);
  });
}
