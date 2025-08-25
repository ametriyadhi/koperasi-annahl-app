import React, { useState } from 'react';
import { useSettings } from './SettingsContext';
import type { Anggota } from '../types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

interface MemberSimulatorProps {
    anggota: Anggota;
}

const MemberSimulator: React.FC<MemberSimulatorProps> = ({ anggota }) => {
    const { settings, loading: settingsLoading } = useSettings();
    const [inputs, setInputs] = useState({
        gaji: '', // Gaji akan diisi oleh anggota
        cicilanBerjalan: '0',
        hargaBarang: '',
        jangkaWaktu: '12',
    });
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setInputs({ ...inputs, [e.target.id]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResult(null);

        const gaji = parseFloat(inputs.gaji);
        const hargaBarang = parseFloat(inputs.hargaBarang);
        const jangkaWaktu = parseInt(inputs.jangkaWaktu);
        
        if (isNaN(gaji) || isNaN(hargaBarang) || gaji <= 0 || hargaBarang <= 0) {
            setError('Mohon isi Gaji dan Harga Barang dengan angka yang valid.');
            return;
        }
        
        // Logika perhitungan sama seperti simulator utama, tapi menggunakan data dari settings
        let isApproved = true;
        let rejectionReason = '';
        const maxHargaBarang = settings.plafon_pembiayaan_gaji * gaji;
        if (hargaBarang > maxHargaBarang) {
            isApproved = false;
            rejectionReason = `Harga barang melebihi batas maksimal ${settings.plafon_pembiayaan_gaji}x gaji.`;
        }
        // ... (sisa logika perhitungan)
        
        // Placeholder untuk hasil
        setResult({ isApproved, rejectionReason, hargaBarang });
    };

    if (settingsLoading) return <p className="text-center p-4">Memuat pengaturan...</p>;

    return (
        <div className="p-4 space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-bold text-primary">Simulator Pembiayaan</h2>
                <p className="text-sm text-gray-600">Hitung estimasi kelayakan pembiayaan Anda.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Form inputs */}
                <div>
                    <label htmlFor="gaji" className="block text-sm font-medium mb-1">Gaji Perbulan (Rp)</label>
                    <input type="number" id="gaji" value={inputs.gaji} onChange={handleInputChange} placeholder="Masukkan gaji Anda" className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg" />
                </div>
                <div>
                    <label htmlFor="hargaBarang" className="block text-sm font-medium mb-1">Harga Barang (Rp)</label>
                    <input type="number" id="hargaBarang" value={inputs.hargaBarang} onChange={handleInputChange} placeholder="Harga barang impian Anda" className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg" />
                </div>
                {/* Tombol Aksi */}
                <button type="submit" className="w-full bg-primary hover:bg-lime-600 text-white font-bold py-3 px-8 rounded-lg transition duration-300 shadow-md">
                    Hitung
                </button>
            </form>
            {result && (
                <div className={`p-4 rounded-lg ${result.isApproved ? 'bg-green-100' : 'bg-red-100'}`}>
                    <h3 className="font-bold">{result.isApproved ? 'DISETUJUI (Estimasi)' : 'DITOLAK (Estimasi)'}</h3>
                    {!result.isApproved && <p className="text-sm">{result.rejectionReason}</p>}
                </div>
            )}
        </div>
    );
};

export default MemberSimulator;
