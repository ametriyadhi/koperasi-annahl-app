import React, { useState, useEffect, useMemo } from 'react';
import type { Anggota, KontrakMurabahah } from '../types';
import { StatusKontrak } from '../types';

interface MurabahahFormProps {
  onSave: (kontrak: Omit<KontrakMurabahah, 'id'>) => void;
  onClose: () => void;
  anggotaList: Anggota[];
  initialData?: KontrakMurabahah | null;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const MurabahahForm: React.FC<MurabahahFormProps> = ({ onSave, onClose, anggotaList, initialData }) => {
  const [formData, setFormData] = useState({
    anggota_id: initialData?.anggota_id || '',
    nama_barang: initialData?.nama_barang || '',
    harga_pokok: initialData?.harga_pokok || 0,
    uang_muka: initialData?.uang_muka || 0,
    tenor: initialData?.tenor || 12,
    tanggal_akad: initialData?.tanggal_akad || new Date().toISOString().split('T')[0],
    status: initialData?.status || StatusKontrak.REVIEW,
  });

  const calculatedValues = useMemo(() => {
    const { harga_pokok, tenor } = formData;
    if (harga_pokok <= 0) return { margin: 0, harga_jual: 0, cicilan_per_bulan: 0 };

    let marginPersen;
    if (tenor <= 6) marginPersen = 0.10;
    else if (tenor <= 12) marginPersen = 0.15;
    else if (tenor <= 18) marginPersen = 0.20;
    else marginPersen = 0.30;

    const margin = harga_pokok * marginPersen;
    const harga_jual = harga_pokok + margin;
    const cicilan_per_bulan = harga_jual / tenor;

    return { margin, harga_jual, cicilan_per_bulan };
  }, [formData.harga_pokok, formData.tenor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['harga_pokok', 'uang_muka', 'tenor'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumber ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.anggota_id || !formData.nama_barang || formData.harga_pokok <= 0) {
        alert("Mohon lengkapi semua data yang diperlukan.");
        return;
    }
    onSave({ ...formData, ...calculatedValues });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Anggota</label>
          <select name="anggota_id" value={formData.anggota_id} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required>
            <option value="">Pilih Anggota...</option>
            {anggotaList.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nama Barang</label>
          <input type="text" name="nama_barang" value={formData.nama_barang} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Harga Pokok (Rp)</label>
          <input type="number" name="harga_pokok" value={formData.harga_pokok || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Uang Muka (Rp)</label>
          <input type="number" name="uang_muka" value={formData.uang_muka || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tenor (Bulan)</label>
          <select name="tenor" value={formData.tenor} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
             {Array.from({ length: 24 }, (_, i) => i + 1).map(bln => <option key={bln} value={bln}>{bln} Bulan</option>)}
          </select>
        </div>
         <div>
          <label className="block text-sm font-medium text-gray-700">Status Kontrak</label>
          <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            {Object.values(StatusKontrak).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
        <h4 className="font-semibold text-center">Rincian Perhitungan Otomatis</h4>
        <div className="flex justify-between text-sm"><span className="text-gray-600">Margin</span><span>{formatCurrency(calculatedValues.margin)}</span></div>
        <div className="flex justify-between text-sm font-bold"><span className="text-gray-600">Harga Jual</span><span>{formatCurrency(calculatedValues.harga_jual)}</span></div>
        <div className="flex justify-between text-lg font-bold text-primary"><span className="text-gray-800">Cicilan / Bulan</span><span>{formatCurrency(calculatedValues.cicilan_per_bulan)}</span></div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">
          Batal
        </button>
        <button type="submit" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-amber-500">
          Simpan Kontrak
        </button>
      </div>
    </form>
  );
};

export default MurabahahForm;
