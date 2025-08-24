
import React, { useState } from 'react';
import Card from './shared/Card';
import { MOCK_ANGGOTA, MOCK_REKENING, MOCK_TRANSAKSI } from '../constants';
import type { Anggota, RekeningSimpanan, TransaksiSimpanan } from '../types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

const Savings: React.FC = () => {
    const [selectedAnggota, setSelectedAnggota] = useState<Anggota | null>(MOCK_ANGGOTA[0]);

    const memberAccounts = selectedAnggota ? MOCK_REKENING.filter(r => r.anggota_id === selectedAnggota.id) : [];
    const memberTransactions = selectedAnggota ? MOCK_TRANSAKSI.filter(t => memberAccounts.map(a => a.id).includes(t.rekening_id)) : [];

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Simpanan Anggota</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card title="Pilih Anggota">
                        <ul className="max-h-96 overflow-y-auto">
                            {MOCK_ANGGOTA.map(anggota => (
                                <li key={anggota.id}>
                                    <button 
                                    onClick={() => setSelectedAnggota(anggota)}
                                    className={`w-full text-left p-3 rounded-lg text-sm ${selectedAnggota?.id === anggota.id ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>
                                        {anggota.nama}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
                <div className="md:col-span-2">
                    {selectedAnggota ? (
                        <div className="space-y-6">
                            <Card title={`Rekening Simpanan - ${selectedAnggota.nama}`}>
                                <div className="space-y-4">
                                    {memberAccounts.map(rekening => (
                                        <div key={rekening.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-gray-700">{rekening.jenis}</p>
                                                <p className="text-xs text-gray-500">No. Rek: {rekening.id}</p>
                                            </div>
                                            <p className="text-lg font-bold text-primary">{formatCurrency(rekening.saldo)}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                            <Card title="Riwayat Transaksi">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jenis Rek.</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {memberTransactions.map(transaksi => {
                                                const rekening = MOCK_REKENING.find(r => r.id === transaksi.rekening_id);
                                                return (
                                                    <tr key={transaksi.id}>
                                                        <td className="px-4 py-2 text-sm">{new Date(transaksi.tanggal).toLocaleDateString('id-ID')}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">{rekening?.jenis}</td>
                                                        <td className="px-4 py-2 text-sm">{transaksi.tipe}</td>
                                                        <td className={`px-4 py-2 text-sm text-right font-semibold ${transaksi.tipe === 'Setor' ? 'text-green-600' : 'text-red-600'}`}>
                                                            {formatCurrency(transaksi.jumlah)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    ) : (
                        <Card title="Detail Simpanan">
                            <p>Pilih anggota dari daftar untuk melihat detail simpanan.</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Savings;
