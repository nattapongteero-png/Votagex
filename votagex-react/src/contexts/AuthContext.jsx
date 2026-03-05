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
    setUser(null);
    setAuthUser(null);
  };

  const isAuthenticated = !!user || !isFirebaseConfigured();
  const username = authUser?.displayName || localStorage.getItem('votagex_username') || '';
  const [customImage, setCustomImage] = useState(localStorage.getItem('votagex_userimage') || '');
  const userImage = customImage || authUser?.photoURL || '';

  const updateUserImage = useCallback((url) => {
    localStorage.setItem('votagex_userimage', url);
    setCustomImage(url);
  }, []);

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
