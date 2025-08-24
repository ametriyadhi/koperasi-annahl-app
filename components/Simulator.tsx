import React, { useState } from 'react';
import Card from './shared/Card';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const MurabahahSimulator: React.FC = () => {
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
        setInputs({
            gaji: '',
            cicilanBerjalan: '0',
            hargaBarang: '',
            jangkaWaktu: '12',
        });
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
            setError('Mohon isi semua kolom dengan angka yang valid.');
            return;
        }

        let isApproved = true;
        let rejectionReason = '';

        const maxHargaBarang = 5 * gaji;
        if (hargaBarang > maxHargaBarang) {
            isApproved = false;
            rejectionReason = `Harga barang (${formatCurrency(hargaBarang)}) melebihi batas maksimal 5x gaji (${formatCurrency(maxHargaBarang)}).`;
        }

        let marginPersen;
        if (jangkaWaktu <= 6) marginPersen = 0.10;
        else if (jangkaWaktu <= 12) marginPersen = 0.15;
        else if (jangkaWaktu <= 18) marginPersen = 0.20;
        else marginPersen = 0.30;

        const marginRupiah = hargaBarang * marginPersen;
        const totalHutang = hargaBarang + marginRupiah;
        const cicilanBaru = totalHutang / jangkaWaktu;
        const maxCicilanBulanan = gaji / 3;
        const totalCicilanBulanan = cicilanBaru + cicilanBerjalan;

        if (isApproved && totalCicilanBulanan > maxCicilanBulanan) {
            isApproved = false;
            rejectionReason = `Total cicilan per bulan (${formatCurrency(totalCicilanBulanan)}) melebihi batas maksimal 1/3 gaji (${formatCurrency(maxCicilanBulanan)}).`;
        }
        
        setResult({
            isApproved,
            rejectionReason,
            hargaBarang,
            marginRupiah,
            marginPersen,
            totalHutang,
            cicilanBaru,
            maxHargaBarang,
            maxCicilanBulanan,
            totalCicilanBulanan,
        });
    };

    return (
        <Card>
            {/* --- PERBAIKAN DI SINI: Menambahkan div dengan padding --- */}
            <div className="p-6 md:p-10">
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-primary">Simulasi Kredit Murabahah</h1>
                    <p className="text-gray-600 mt-2">Uji kelayakan pengajuan pembiayaan Anda</p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ... sisa form tetap sama ... */}
                    <div>
                        <label htmlFor="gaji" className="block text-sm font-medium mb-2">Gaji Perbulan (Rp)</label>
                        <input type="number" id="gaji" value={inputs.gaji} onChange={handleInputChange} placeholder="Contoh: 5000000" className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label htmlFor="cicilanBerjalan" className="block text-sm font-medium mb-2">Total Cicilan Berjalan (Rp)</label>
                        <input type="number" id="cicilanBerjalan" value={inputs.cicilanBerjalan} onChange={handleInputChange} placeholder="Isi 0 jika tidak ada" className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label htmlFor="hargaBarang" className="block text-sm font-medium mb-2">Harga Barang Diajukan (Rp)</label>
                        <input type="number" id="hargaBarang" value={inputs.hargaBarang} onChange={handleInputChange} placeholder="Harga barang yang ingin dibeli" className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label htmlFor="jangkaWaktu" className="block text-sm font-medium mb-2">Jangka Waktu (Bulan)</label>
                        <select id="jangkaWaktu" value={inputs.jangkaWaktu} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg">
                            {Array.from({ length: 24 }, (_, i) => i + 1).map(bln => <option key={bln} value={bln}>{bln} Bulan</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2 flex justify-center space-x-4 mt-4">
                        <button type="submit" className="w-full md:w-auto bg-primary hover:bg-lime-600 text-white font-bold py-3 px-8 rounded-lg transition duration-300 shadow-md">
                            Hitung Simulasi
                        </button>
                        <button type="button" onClick={handleReset} className="w-full md:w-auto bg-secondary hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition duration-300 shadow-md">
                            Reset
                        </button>
                    </div>
                </form>

                {error && <div className="mt-4 p-4 text-center text-red-700 bg-red-100 rounded-lg">{error}</div>}
                
                {result && (
                    <div className="mt-10 p-6 rounded-lg bg-gray-50">
                        {/* ... sisa hasil simulasi tetap sama ... */}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default MurabahahSimulator;

