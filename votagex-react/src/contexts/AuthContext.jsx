import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  initFirebase,
  isFirebaseConfigured,
  signInWithGoogle as firebaseSignIn,
  signOutUser as firebaseSignOut,
  onAuthStateChange,
  storeAuthUserData,
  clearAuthUserData,
  getStoredAuthUser
} from '../services/firebase';
import { updateProfileImageInTrips } from '../services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(getStoredAuthUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initFirebase();

    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        const userData = storeAuthUserData(firebaseUser);
        setUser(firebaseUser);
        setAuthUser(userData);
      } else {
        clearAuthUserData();
        setUser(null);
        setAuthUser(null);
      }
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const signIn = async () => {
    return firebaseSignIn();
  };

  const signOut = async () => {
    await firebaseSignOut();
    clearAuthUserData();
    setUser(null);
    setAuthUser(null);
    setCustomImage('');
  };

  const isAuthenticated = !!user || (import.meta.env.DEV && !isFirebaseConfigured());
  const username = authUser?.displayName || localStorage.getItem('votagex_username') || '';
  const [customImage, setCustomImage] = useState(localStorage.getItem('votagex_userimage') || '');
  const userImage = customImage || authUser?.photoURL || '';

  const updateUserImage = useCallback((url) => {
    localStorage.setItem('votagex_userimage', url);
    setCustomImage(url);
    // Update profile image in all trips this user belongs to
    const name = authUser?.displayName || localStorage.getItem('votagex_username') || '';
    if (name) {
      updateProfileImageInTrips(name, url).catch(err => console.error('Error updating trip images:', err));
    }
  }, [authUser]);

  return (
    <AuthContext.Provider value={{
      user,
      authUser,
      loading,
      isAuthenticated,
      username,
      userImage,
      updateUserImage,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
