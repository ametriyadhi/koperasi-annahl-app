
import React, { useState } from 'react';
import Card from './shared/Card';
import { MOCK_ANGGOTA, MOCK_KONTRAK } from '../constants';
import { StatusKontrak } from '../types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const tabs = [
    StatusKontrak.BERJALAN,
    StatusKontrak.APPROVED,
    StatusKontrak.REVIEW,
    StatusKontrak.LUNAS,
];

const Murabahah: React.FC = () => {
    const [activeTab, setActiveTab] = useState<StatusKontrak>(StatusKontrak.BERJALAN);

    const filteredContracts = MOCK_KONTRAK.filter(k => k.status === activeTab);

    return (
        <Card title="Pembiayaan Murabahah">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`${
                                activeTab === tab
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anggota</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barang</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Jual</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cicilan / Bulan</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tenor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Akad</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredContracts.map((kontrak) => {
                            const anggota = MOCK_ANGGOTA.find(a => a.id === kontrak.anggota_id);
                            return (
                                <tr key={kontrak.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{anggota?.nama}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{kontrak.nama_barang}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">{formatCurrency(kontrak.harga_jual)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">{formatCurrency(kontrak.cicilan_per_bulan)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{kontrak.tenor} bln</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(kontrak.tanggal_akad).toLocaleDateString('id-ID')}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {filteredContracts.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        Tidak ada data untuk status "{activeTab}".
                    </div>
                )}
            </div>
        </Card>
    );
};

export default Murabahah;
