import React, { useState } from 'react';
import Card from './shared/Card';
import Modal from './shared/Modal';
import ManualJournal from './ManualJournal';
import { CHART_OF_ACCOUNTS } from '../constants';
import type { Akun } from '../types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const AccountRow: React.FC<{ akun: Akun, level: number }> = ({ akun, level }) => {
    const isParent = !akun.parent_kode;
    const paddingLeft = level * 20 + 16; // 16px base padding

    return (
        <tr className={isParent ? "bg-gray-100" : "hover:bg-gray-50"}>
            <td className="px-4 py-3 whitespace-nowrap" style={{ paddingLeft: `${paddingLeft}px` }}>
                <div className={`text-sm ${isParent ? 'font-bold text-gray-800' : 'text-gray-700'}`}>
                    {akun.kode}
                </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <div className={`text-sm ${isParent ? 'font-bold text-gray-800' : 'text-gray-700'}`}>
                    {akun.nama}
                </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{akun.tipe}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-800">
                {formatCurrency(akun.saldo)}
            </td>
        </tr>
    );
};

const Accounting: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const renderAccounts = (parentId: string | undefined = undefined, level = 0) => {
        return CHART_OF_ACCOUNTS
            .filter(a => a.parent_kode === parentId)
            .flatMap(akun => [
                <AccountRow key={akun.kode} akun={akun} level={level} />,
                ...renderAccounts(akun.kode, level + 1)
            ]);
    };
    
    const handleSaveJournal = (journalData: any) => {
        console.log("Saving Journal:", journalData);
        alert('Jurnal manual berhasil disimpan! (Lihat console untuk data)');
        setIsModalOpen(false);
    };

    return (
        <>
            <Card title="Bagan Akun (Chart of Accounts)">
                 <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Bagan Akun (Chart of Accounts)</h3>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary">
                        Buat Jurnal Manual
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode Akun</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Akun</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {renderAccounts()}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Jurnal Manual">
                <ManualJournal onSave={handleSaveJournal} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </>
    );
};

export default Accounting;