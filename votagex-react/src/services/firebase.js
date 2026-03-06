import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let auth = null;
let db = null;

export function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY";
}

export function initFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    if (import.meta.env.VITE_USE_EMULATOR === 'true' && location.hostname === 'localhost') {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    return true;
  } catch (e) {
    console.warn('Firebase not available');
    return false;
  }
}

export function getDb() {
  return db;
}

export function signInWithGoogle() {
  if (!auth) return Promise.reject(new Error('Auth not initialized'));
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider).then(result => result.user);
}

export function signOutUser() {
  if (!auth) return Promise.resolve();
  return signOut(auth);
}

export function onAuthStateChange(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  if (!auth) return null;
  return auth.currentUser;
}

export function storeAuthUserData(user) {
  if (!user) return null;
  const userData = {
    uid: user.uid,
    displayName: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || ''
  };
  localStorage.setItem('votagex_auth_user', JSON.stringify(userData));
  if (userData.displayName) {
    localStorage.setItem('votagex_username', userData.displayName);
  }
  if (userData.photoURL) {
    // Save Google photo separately; only set userimage if no custom image exists
    localStorage.setItem('votagex_google_photo', userData.photoURL);
    if (!localStorage.getItem('votagex_userimage')) {
      localStorage.setItem('votagex_userimage', userData.photoURL);
    }
  }
  return userData;
}

export function clearAuthUserData() {
  localStorage.removeItem('votagex_auth_user');
  localStorage.removeItem('votagex_username');
  localStorage.removeItem('votagex_google_photo');
  localStorage.removeItem('votagex_userimage');
}

export function getStoredAuthUser() {
  try {
    const data = localStorage.getItem('votagex_auth_user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
