import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "REMOVED",
  authDomain: "votagex-7ab43.firebaseapp.com",
  projectId: "votagex-7ab43",
  storageBucket: "votagex-7ab43.firebasestorage.app",
  messagingSenderId: "REMOVED",
  appId: "1:REMOVED:web:810289c6d2fe0c05bbfa14"
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
    console.log('Firebase initialized (Firestore + Auth)');
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
}

export function getStoredAuthUser() {
  const data = localStorage.getItem('votagex_auth_user');
  return data ? JSON.parse(data) : null;
}
