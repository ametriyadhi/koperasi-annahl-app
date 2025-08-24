import React, { useState } from 'react';
import type { Akun } from '../types';
import { AkunTipe } from '../types';

interface AccountFormProps {
  onSave: (akun: Omit<Akun, 'id' | 'saldo'>) => void;
  onClose: () => void;
  initialData?: Akun | null;
  parentAccounts: Akun[];
}

const AccountForm: React.FC<AccountFormProps> = ({ onSave, onClose, initialData, parentAccounts }) => {
  const [formData, setFormData] = useState({
    kode: initialData?.kode || '',
    nama: initialData?.nama || '',
    tipe: initialData?.tipe || AkunTipe.ASET,
    parent_kode: initialData?.parent_kode || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Kode Akun</label>
          <input type="text" name="kode" value={formData.kode} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nama Akun</label>
          <input type="text" name="nama" value={formData.nama} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipe Akun</label>
          <select name="tipe" value={formData.tipe} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            {Object.values(AkunTipe).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Akun Induk (Parent)</label>
          <select name="parent_kode" value={formData.parent_kode} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            <option value="">-- Tidak Ada --</option>
            {parentAccounts.map(p => <option key={p.id} value={p.kode}>{p.kode} - {p.nama}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">
          Batal
        </button>
        <button type="submit" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-amber-500">
          Simpan Akun
        </button>
      </div>
    </form>
  );
};

export default AccountForm;
