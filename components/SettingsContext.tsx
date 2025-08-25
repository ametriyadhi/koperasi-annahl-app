import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { AppSettings } from '../types';

// Tipe untuk data yang disediakan oleh context
interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  saveSettings: (newSettings: AppSettings) => Promise<void>;
}

// Nilai default untuk context
const defaultSettings: AppSettings = {
  simpanan_pokok: 150000, // Nilai default jika di database kosong
  simpanan_wajib: 50000,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
  saveSettings: async () => {},
});

// Hook custom untuk mempermudah penggunaan context
export const useSettings = () => useContext(SettingsContext);

// Provider yang akan membungkus aplikasi kita
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  
  // ID dokumen yang pasti untuk pengaturan kita
  const settingsDocId = "main_settings";

  useEffect(() => {
    const settingsRef = doc(db, "pengaturan", settingsDocId);
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      } else {
        // Jika dokumen belum ada, buat dengan nilai default
        console.log("Dokumen pengaturan tidak ditemukan, membuat yang baru...");
        setDoc(settingsRef, defaultSettings);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveSettings = async (newSettings: AppSettings) => {
    const settingsRef = doc(db, "pengaturan", settingsDocId);
    await setDoc(settingsRef, newSettings, { merge: true });
  };

  const value = { settings, loading, saveSettings };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
