import React, { useState, useEffect } from 'react';
import { useSettings } from './SettingsContext'; // <-- Gunakan hook kita
import Card from './shared/Card';
import type { AppSettings } from '../types';

const Settings: React.FC = () => {
  const { settings, loading, saveSettings } = useSettings();
  const [formState, setFormState] = useState<AppSettings>(settings);

  useEffect(() => {
    // Sinkronkan form dengan data dari context saat pertama kali dimuat atau berubah
    setFormState(settings);
  }, [settings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleSave = async (section: string) => {
    await saveSettings(formState);
    alert(`Pengaturan untuk "${section}" telah berhasil disimpan!`);
  };

  if (loading) {
    return <p>Memuat pengaturan...</p>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Pengaturan Sistem</h2>
      <div className="space-y-8">
        <Card title="Kebijakan Simpanan">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">Jumlah Simpanan Pokok (Rp)</label>
              <input
                  type="number"
                  name="simpanan_pokok"
                  value={formState.simpanan_pokok || ''}
                  onChange={handleInputChange}
                  className="w-48 p-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">Jumlah Simpanan Wajib Bulanan (Rp)</label>
              <input
                  type="number"
                  name="simpanan_wajib"
                  value={formState.simpanan_wajib || ''}
                  onChange={handleInputChange}
                  className="w-48 p-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <button onClick={() => handleSave('Kebijakan Simpanan')} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-lime-600">
                Simpan Perubahan
            </button>
          </div>
        </Card>
        {/* Di sini kita bisa menambahkan kartu pengaturan lain seperti Margin, SHU, dll. */}
      </div>
    </div>
  );
};

export default Settings;
