import React, { useState, useEffect } from 'react';
import { JenisSimpanan } from '../types';
import type { TransaksiSimpanan } from '../types';

interface TransactionFormProps {
  onSave: (transaksi: Omit<TransaksiSimpanan, 'id' | 'anggota_id' | 'tanggal'>) => void;
  onClose: () => void;
  initialData?: TransaksiSimpanan | null;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onSave, onClose, initialData }) => {
  const [formData, setFormData] = useState({
    jenis: initialData?.jenis || JenisSimpanan.SUKARELA,
    tipe: initialData?.tipe || ('Setor' as 'Setor' | 'Tarik'),
    jumlah: initialData?.jumlah || 0,
    keterangan: initialData?.keterangan || '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        jenis: initialData.jenis,
        tipe: initialData.tipe,
        jumlah: initialData.jumlah,
        keterangan: initialData.keterangan,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'jumlah' ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.jumlah <= 0) {
      alert("Jumlah transaksi harus lebih dari 0");
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Jenis Simpanan</label>
          <select name="jenis" value={formData.jenis} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            {Object.values(JenisSimpanan).map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipe Transaksi</label>
          <select name="tipe" value={formData.tipe} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            <option value="Setor">Setor</option>
            <option value="Tarik">Tarik</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Jumlah (Rp)</label>
        <input type="number" name="jumlah" value={formData.jumlah || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Keterangan</label>
        <input type="text" name="keterangan" value={formData.keterangan} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">
          Batal
        </button>
        <button type="submit" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-amber-500">
          Simpan Transaksi
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
