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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener ini hanya untuk memeriksa status login awal dari Firebase Auth
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      // Setelah pemeriksaan awal selesai, loading dianggap selesai.
      setLoading(false); 
    });

    // Membersihkan listener saat komponen tidak lagi digunakan
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Listener ini khusus untuk mengambil data profil dari Firestore
    // jika ada pengguna yang sedang login.
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          // Jika pengguna ada di Auth tapi tidak punya data peran di Firestore
          setUserProfile(null); 
        }
      });

      // Mengembalikan fungsi cleanup untuk listener profil
      return () => unsubscribeProfile();
    } else {
      // Jika pengguna logout, pastikan profil juga kosong
      setUserProfile(null);
    }
  }, [currentUser]); // Efek ini berjalan setiap kali currentUser berubah

  const value = { currentUser, userProfile, loading };

  return (
    <AuthContext.Provider value={value}>
      {/* Selalu tampilkan children jika tidak sedang loading awal */}
      {!loading && children}
    </AuthContext.Provider>
  );
};


