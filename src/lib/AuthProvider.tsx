import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppUser } from '../types';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  appUser: null, 
  loading: true 
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);

        try {
          const snap = await getDoc(userRef);
          const nowIso = new Date().toISOString();

          if (!snap.exists()) {
            const initialUserData: AppUser = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Pengguna',
              photoURL: currentUser.photoURL || '',
              role: currentUser.email === 'febrianataum@gmail.com' ? 'Admin' : 'Operator',
              bidang: 'Semua Bidang',
              lastLoginAt: nowIso,
              createdAt: nowIso
            };
            await setDoc(userRef, initialUserData);
          } else {
            // Update lastLoginAt and latest photo/displayName if changed
            await setDoc(userRef, {
              lastLoginAt: nowIso,
              displayName: currentUser.displayName || snap.data()?.displayName || currentUser.email?.split('@')[0] || 'Pengguna',
              photoURL: currentUser.photoURL || snap.data()?.photoURL || '',
              email: currentUser.email || snap.data()?.email || ''
            }, { merge: true });
          }
        } catch (err) {
          console.error("Error initializing user profile:", err);
        }

        // Subscribe to live user doc updates (role, bidang changes)
        unsubUserDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setAppUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setLoading(false);
        });
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

