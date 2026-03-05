// Firebase Configuration
// TODO: Replace with your own Firebase config from https://console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyBbKuNSRzpyMQbLY6zX7A6ouI3RqdPMYzQ",
  authDomain: "votagex-7ab43.firebaseapp.com",
  projectId: "votagex-7ab43",
  storageBucket: "votagex-7ab43.firebasestorage.app",
  messagingSenderId: "457463606141",
  appId: "1:457463606141:web:810289c6d2fe0c05bbfa14"
};

// Initialize Firebase
let db = null;
let storage = null;
let auth = null;

function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY";
}

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      firebase.initializeApp(firebaseConfig);
      // Firestore & Storage disabled — ใช้ localStorage แทนจนกว่าจะเปิด Firestore API
      // db = firebase.firestore();
      // storage = firebase.storage();
      if (firebase.auth) {
        auth = firebase.auth();
      }
      console.log('Firebase initialized (localStorage mode, Auth only)');
      return true;
    }
  } catch (e) {
    console.warn('Firebase not available, using localStorage fallback');
  }
  return false;
}

// ===== Auth Functions =====

function signInWithGoogle() {
  if (!auth) return Promise.reject(new Error('Auth not initialized'));
  const provider = new firebase.auth.GoogleAuthProvider();
  return auth.signInWithPopup(provider).then(result => result.user);
}

function signOutUser() {
  if (!auth) return Promise.resolve();
  return auth.signOut();
}

function onAuthStateChange(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return auth.onAuthStateChanged(callback);
}

function getCurrentUser() {
  if (!auth) return null;
  return auth.currentUser;
}

function storeAuthUserData(user) {
  if (!user) return;
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
    localStorage.setItem('votagex_userimage', userData.photoURL);
  }
  return userData;
}

function clearAuthUserData() {
  localStorage.removeItem('votagex_auth_user');
}

function getStoredAuthUser() {
  const data = localStorage.getItem('votagex_auth_user');
  return data ? JSON.parse(data) : null;
}

// ===== Data Functions =====

function saveTrip(tripData) {
  if (db && isFirebaseConfigured()) {
    return db.collection('trips').add({
      ...tripData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  // localStorage fallback
  const trips = JSON.parse(localStorage.getItem('votagex_trips') || '[]');
  tripData.id = 'trip_' + Date.now();
  tripData.createdAt = new Date().toISOString();
  trips.push(tripData);
  localStorage.setItem('votagex_trips', JSON.stringify(trips));
  return Promise.resolve(tripData);
}

function getTrips() {
  if (db && isFirebaseConfigured()) {
    return db.collection('trips').orderBy('createdAt', 'desc').get()
      .then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }
  const trips = JSON.parse(localStorage.getItem('votagex_trips') || '[]');
  return Promise.resolve(trips);
}

// Update existing trip
function updateTrip(tripId, updatedData) {
  if (db && isFirebaseConfigured()) {
    return db.collection('trips').doc(tripId).update(updatedData);
  }
  const trips = JSON.parse(localStorage.getItem('votagex_trips') || '[]');
  const index = trips.findIndex(t => t.id === tripId);
  if (index !== -1) {
    trips[index] = { ...trips[index], ...updatedData };
    localStorage.setItem('votagex_trips', JSON.stringify(trips));
  }
  return Promise.resolve();
}

// Join a trip (add member to trip's members array)
function joinTrip(tripId, member) {
  if (db && isFirebaseConfigured()) {
    return db.collection('trips').doc(tripId).update({
      members: firebase.firestore.FieldValue.arrayUnion(member)
    });
  }
  const trips = JSON.parse(localStorage.getItem('votagex_trips') || '[]');
  const index = trips.findIndex(t => t.id === tripId);
  if (index !== -1) {
    if (!trips[index].members) trips[index].members = [];
    trips[index].members.push(member);
    localStorage.setItem('votagex_trips', JSON.stringify(trips));
  }
  return Promise.resolve();
}

// Delete a trip
function deleteTrip(tripId) {
  if (db && isFirebaseConfigured()) {
    return db.collection('trips').doc(tripId).delete();
  }
  const trips = JSON.parse(localStorage.getItem('votagex_trips') || '[]');
  const filtered = trips.filter(t => t.id !== tripId);
  localStorage.setItem('votagex_trips', JSON.stringify(filtered));
  return Promise.resolve();
}

// Upload profile image (Firebase Storage or base64 in localStorage)
function uploadProfileImage(file) {
  return new Promise((resolve, reject) => {
    if (storage && isFirebaseConfigured()) {
      const ref = storage.ref('profiles/' + Date.now() + '_' + file.name);
      ref.put(file).then(snapshot => snapshot.ref.getDownloadURL()).then(resolve).catch(reject);
    } else {
      // Convert to base64 for localStorage
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });
}
