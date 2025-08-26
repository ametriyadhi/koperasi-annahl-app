import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Tetap true di awal

  useEffect(() => {
    // Listener ini akan menangani perubahan status login dan pengambilan profil
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Jika ada user, ambil profilnya dari Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // User ada di Auth tapi tidak punya profil di Firestore
            setUserProfile(null);
          }
          // Loading selesai HANYA setelah profil didapatkan (atau dipastikan tidak ada)
          setLoading(false);
        });
        // Pastikan untuk membersihkan listener profil juga
        return () => unsubProfile();
      } else {
        // Jika tidak ada user (logout), reset profil dan selesaikan loading
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Membersihkan listener utama saat komponen unmount
    return () => unsubscribe();
  }, []);

  const value = { currentUser, userProfile, loading };

  return (
    <AuthContext.Provider value={value}>
      {/* Tampilkan children HANYA jika loading sudah selesai */}
      {!loading && children}
    </AuthContext.Provider>
  );
};
