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
        gaji: '',
        cicilanBerjalan: '0',
        hargaBarang: '',
        jangkaWaktu: '12',
    });
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setInputs({ ...inputs, [e.target.id]: e.target.value });
    };

    const handleReset = () => {
        setInputs({ gaji: '', cicilanBerjalan: '0', hargaBarang: '', jangkaWaktu: '12' });
        setResult(null);
        setError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResult(null);

        const gaji = parseFloat(inputs.gaji);
        const cicilanBerjalan = parseFloat(inputs.cicilanBerjalan) || 0;
        const hargaBarang = parseFloat(inputs.hargaBarang);
        const jangkaWaktu = parseInt(inputs.jangkaWaktu);

        if (isNaN(gaji) || isNaN(hargaBarang) || isNaN(jangkaWaktu) || gaji <= 0 || hargaBarang <= 0) {
            setError('Mohon isi Gaji dan Harga Barang dengan angka yang valid.');
            return;
        }

        let isApproved = true;
        let rejectionReason = '';
        const maxHargaBarang = settings.plafon_pembiayaan_gaji * gaji;
        if (hargaBarang > maxHargaBarang) {
            isApproved = false;
            rejectionReason = `Harga barang (${formatCurrency(hargaBarang)}) melebihi batas maksimal ${settings.plafon_pembiayaan_gaji}x gaji (${formatCurrency(maxHargaBarang)}).`;
        }

        let marginPersen;
        if (jangkaWaktu <= 6) marginPersen = settings.margin_tenor_6;
        else if (jangkaWaktu <= 12) marginPersen = settings.margin_tenor_12;
        else if (jangkaWaktu <= 18) marginPersen = settings.margin_tenor_18;
        else marginPersen = settings.margin_tenor_24;
        
        const marginRupiah = hargaBarang * (marginPersen / 100);
        const totalHutang = hargaBarang + marginRupiah;
        const cicilanBaru = totalHutang / jangkaWaktu;
        const maxCicilanBulanan = gaji / settings.maksimal_cicilan_gaji;
        const totalCicilanBulanan = cicilanBaru + cicilanBerjalan;

        if (isApproved && totalCicilanBulanan > maxCicilanBulanan) {
            isApproved = false;
            rejectionReason = `Total cicilan per bulan (${formatCurrency(totalCicilanBulanan)}) melebihi batas maksimal 1/${settings.maksimal_cicilan_gaji} gaji (${formatCurrency(maxCicilanBulanan)}).`;
        }
        
        setResult({
            isApproved, rejectionReason, hargaBarang, marginRupiah, marginPersen,
            totalHutang, cicilanBaru, maxHargaBarang, maxCicilanBulanan, totalCicilanBulanan,
        });
    };

    if (settingsLoading) return <p className="text-center p-4">Memuat pengaturan...</p>;

    return (
        <div className="p-4 space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-bold text-primary">Simulator Pembiayaan</h2>
                <p className="text-sm text-gray-600">Hitung estimasi kelayakan pembiayaan Anda.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="gaji" className="block text-sm font-medium mb-1">Gaji Perbulan (Rp)</label>
                        <input type="number" id="gaji" value={inputs.gaji} onChange={handleInputChange} placeholder="Masukkan gaji Anda" className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label htmlFor="cicilanBerjalan" className="block text-sm font-medium mb-1">Cicilan Lain (Rp)</label>
                        <input type="number" id="cicilanBerjalan" value={inputs.cicilanBerjalan} onChange={handleInputChange} className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label htmlFor="hargaBarang" className="block text-sm font-medium mb-1">Harga Barang (Rp)</label>
                        <input type="number" id="hargaBarang" value={inputs.hargaBarang} onChange={handleInputChange} placeholder="Harga barang impian" className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label htmlFor="jangkaWaktu" className="block text-sm font-medium mb-1">Jangka Waktu</label>
                        <select id="jangkaWaktu" value={inputs.jangkaWaktu} onChange={handleInputChange} className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg">
                            {Array.from({ length: 24 }, (_, i) => i + 1).map(bln => <option key={bln} value={bln}>{bln} Bulan</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex space-x-2 pt-2">
                    <button type="submit" className="w-full bg-primary hover:bg-lime-600 text-white font-bold py-3 rounded-lg transition duration-300">Hitung</button>
                    <button type="button" onClick={handleReset} className="w-full bg-secondary hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition duration-300">Reset</button>
                </div>
            </form>

            {error && <p className="text-center text-red-600">{error}</p>}

            {result && (
                <div className="p-4 bg-white rounded-lg shadow-sm space-y-3">
                    <h3 className="font-bold text-center text-lg">{result.isApproved ? 'Hasil Simulasi - Disetujui' : 'Hasil Simulasi - Ditolak'}</h3>
                    {/* ... (Tampilan hasil lengkap seperti di admin simulator) ... */}
                </div>
            )}
        </div>
    );
};

export default MemberSimulator;

