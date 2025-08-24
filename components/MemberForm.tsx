import React, { useState, useEffect } from 'react';
import type { Anggota } from '../types';
import { Unit } from '../types';

interface MemberFormProps {
  onSave: (anggota: Omit<Anggota, 'id'>) => void;
  onClose: () => void;
  initialData?: Anggota | null;
}

const MemberForm: React.FC<MemberFormProps> = ({ onSave, onClose, initialData }) => {
  const [formData, setFormData] = useState({
    nama: '',
    nip: '',
    unit: Unit.Supporting,
    tgl_gabung: new Date().toISOString().split('T')[0],
    status: 'Aktif',
    simpanan_pokok: 0,
    simpanan_wajib: 0,
    simpanan_sukarela: 0,
    ...initialData,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['simpanan_pokok', 'simpanan_wajib', 'simpanan_sukarela'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumber ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Kita hapus 'id' sebelum menyimpan karena Firestore akan mengelolanya
    const { id, ...dataToSave } = formData;
    onSave(dataToSave as Omit<Anggota, 'id'>);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
          <input type="text" name="nama" value={formData.nama} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">NIP</label>
          <input type="text" name="nip" value={formData.nip} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Unit</label>
          <select name="unit" value={formData.unit} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tanggal Bergabung</label>
          <input type="date" name="tgl_gabung" value={formData.tgl_gabung} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">
          Batal
        </button>
        <button type="submit" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-amber-500">
          Simpan
        </button>
      </div>
    </form>
  );
};

export default MemberForm;
