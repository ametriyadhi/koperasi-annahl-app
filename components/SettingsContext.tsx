import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { AppSettings } from '../types';

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  saveSettings: (newSettings: AppSettings) => Promise<void>;
}

// --- NILAI DEFAULT BARU DITAMBAHKAN DI SINI ---
const defaultSettings: AppSettings = {
  simpanan_pokok: 500000,
  simpanan_wajib: 50000,
  margin_tenor_6: 10,
  margin_tenor_12: 15,
  margin_tenor_18: 20,
  margin_tenor_24: 30,
  plafon_pembiayaan_gaji: 5,
  maksimal_cicilan_gaji: 3,
  menuAccess: {
    admin: ['Dashboard', 'Anggota', 'Simpanan', 'Murabahah', 'Simulator', 'Proses Bulanan', 'Akuntansi', 'Laporan', 'Pengaturan'],
    pengurus: ['Dashboard', 'Anggota', 'Simpanan', 'Murabahah', 'Simulator', 'Akuntansi', 'Laporan'],
  },
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
  saveSettings: async () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const settingsDocId = "main_settings";

  useEffect(() => {
    const settingsRef = doc(db, "pengaturan", settingsDocId);
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        // Gabungkan data dari DB dengan default untuk memastikan semua field ada
        setSettings({ ...defaultSettings, ...docSnap.data() });
      } else {
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

