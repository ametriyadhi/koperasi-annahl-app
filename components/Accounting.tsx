import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Akun } from '../types';
import Card from './shared/Card';
import Modal from './shared/Modal';
import AccountForm from './AccountForm';
import { PlusCircleIcon } from './icons';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const AccountRow: React.FC<{ akun: Akun, level: number, onEdit: (akun: Akun) => void, onDelete: (id: string) => void }> = ({ akun, level, onEdit, onDelete }) => {
    const isParent = !akun.parent_kode;
    const paddingLeft = level * 20 + 24; // 24px base padding

    return (
        <tr className={isParent ? "bg-gray-100" : "hover:bg-gray-50"}>
            <td className="px-6 py-3 whitespace-nowrap" style={{ paddingLeft: `${paddingLeft}px` }}>
                <div className={`text-sm ${isParent ? 'font-bold text-gray-800' : 'text-gray-700'}`}>
                    {akun.kode}
                </div>
            </td>
            <td className="px-6 py-3 whitespace-nowrap">
                <div className={`text-sm ${isParent ? 'font-bold text-gray-800' : 'text-gray-700'}`}>
                    {akun.nama}
                </div>
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{akun.tipe}</td>
            <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-800">
                {formatCurrency(akun.saldo)}
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button onClick={() => onEdit(akun)} className="text-primary hover:text-amber-600">Edit</button>
                <button onClick={() => onDelete(akun.id)} className="text-red-600 hover:text-red-800">Hapus</button>
            </td>
        </tr>
    );
};

const Accounting: React.FC = () => {
    const [accounts, setAccounts] = useState<Akun[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Akun | null>(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "chart_of_accounts"), (snapshot) => {
            const fetchedAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Akun));
            // Urutkan berdasarkan kode akun
            fetchedAccounts.sort((a, b) => a.kode.localeCompare(b.kode));
            setAccounts(fetchedAccounts);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenModal = (akun: Akun | null = null) => {
        setEditingAccount(akun);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAccount(null);
    };

    const handleSaveAccount = async (akunData: Omit<Akun, 'id' | 'saldo'>) => {
        try {
            if (editingAccount) {
                const docRef = doc(db, "chart_of_accounts", editingAccount.id);
                await updateDoc(docRef, akunData);
            } else {
                await addDoc(collection(db, "chart_of_accounts"), { ...akunData, saldo: 0 });
            }
            handleCloseModal();
        } catch (error) {
            console.error("Error saving account: ", error);
        }
    };

    const handleDeleteAccount = async (id: string) => {
        if (confirm("Apakah Anda yakin ingin menghapus akun ini? Ini tidak dapat diurungkan.")) {
            try {
                await deleteDoc(doc(db, "chart_of_accounts", id));
            } catch (error) {
                console.error("Error deleting account: ", error);
            }
        }
    };

    const renderAccounts = (parentId: string | undefined = undefined, level = 0) => {
        return accounts
            .filter(a => a.parent_kode === parentId)
            .flatMap(akun => [
                <AccountRow key={akun.id} akun={akun} level={level} onEdit={handleOpenModal} onDelete={handleDeleteAccount} />,
                ...renderAccounts(akun.kode, level + 1)
            ]);
    };
    
    return (
        <>
            <Card>
                 <div className="flex justify-between items-center p-4 sm:p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Bagan Akun (Chart of Accounts)</h3>
                    <button onClick={() => handleOpenModal()} className="flex items-center px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-orange-600">
                        <PlusCircleIcon className="w-5 h-5 mr-2" />
                        Tambah Akun
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode Akun</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Akun</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {loading ? <tr><td colSpan={5} className="p-6 text-center">Memuat data...</td></tr> : renderAccounts()}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}>
                <AccountForm 
                    onSave={handleSaveAccount}
                    onClose={handleCloseModal}
                    initialData={editingAccount}
                    parentAccounts={accounts}
                />
            </Modal>
        </>
    );
};

export default Accounting;
