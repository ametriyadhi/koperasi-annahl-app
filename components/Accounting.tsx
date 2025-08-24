import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import type { Akun, JurnalEntryLine } from '../types';
import Card from './shared/Card';
import Modal from './shared/Modal';
import AccountForm from './AccountForm';
import JurnalUmum from './JurnalUmum';
import ManualJournalForm from './ManualJournalForm';
import { PlusCircleIcon } from './icons';

type AccountingTab = 'Bagan Akun' | 'Jurnal Umum';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const AccountRow: React.FC<{ akun: Akun, level: number, onEdit: (akun: Akun) => void, onDelete: (id: string) => void }> = ({ akun, level, onEdit, onDelete }) => {
    const isParent = !akun.parent_kode;
    const paddingLeft = level * 20 + 24;

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
    const [activeTab, setActiveTab] = useState<AccountingTab>('Bagan Akun');
    const [accounts, setAccounts] = useState<Akun[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Akun | null>(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "chart_of_accounts"), (snapshot) => {
            const fetchedAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Akun));
            fetchedAccounts.sort((a, b) => a.kode.localeCompare(b.kode));
            setAccounts(fetchedAccounts);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenAccountModal = (akun: Akun | null = null) => {
        setEditingAccount(akun);
        setIsAccountModalOpen(true);
    };

    const handleCloseAccountModal = () => {
        setIsAccountModalOpen(false);
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
            handleCloseAccountModal();
        } catch (error) {
            console.error("Error saving account: ", error);
            alert("Gagal menyimpan akun.");
        }
    };

    const handleDeleteAccount = async (id: string) => {
        if (confirm("Apakah Anda yakin ingin menghapus akun ini? Ini tidak dapat diurungkan.")) {
            try {
                await deleteDoc(doc(db, "chart_of_accounts", id));
            } catch (error) {
                console.error("Error deleting account: ", error);
                alert("Gagal menghapus akun.");
            }
        }
    };

    const handleSaveManualJournal = async (deskripsi: string, lines: JurnalEntryLine[]) => {
        try {
            await runTransaction(db, async (transaction) => {
                const jurnalRef = doc(collection(db, "jurnal_umum"));
                transaction.set(jurnalRef, {
                    tanggal: new Date().toISOString(),
                    deskripsi,
                    lines,
                });

                for (const line of lines) {
                    const accountRef = doc(db, "chart_of_accounts", line.akun_id);
                    const accDoc = await transaction.get(accountRef);
                    if (!accDoc.exists()) throw new Error(`Akun ${line.akun_nama} tidak ditemukan!`);
                    
                    const currentSaldo = accDoc.data().saldo || 0;
                    const newSaldo = currentSaldo + line.debit - line.kredit;
                    transaction.update(accountRef, { saldo: newSaldo });
                }
            });
            alert("Jurnal manual berhasil disimpan!");
            setIsJournalModalOpen(false);
        } catch (error) {
            console.error("Gagal menyimpan jurnal manual: ", error);
            alert(`Terjadi kesalahan: ${error}`);
        }
    };

    const renderAccounts = (parentId: string | undefined = undefined, level = 0) => {
        return accounts
            .filter(a => a.parent_kode === parentId)
            .flatMap(akun => [
                <AccountRow key={akun.id} akun={akun} level={level} onEdit={handleOpenAccountModal} onDelete={handleDeleteAccount} />,
                ...renderAccounts(akun.kode, level + 1)
            ]);
    };

    return (
        <>
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {(['Bagan Akun', 'Jurnal Umum'] as AccountingTab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`shrink-0 ${
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

            {activeTab === 'Bagan Akun' && (
                <Card>
                    <div className="flex justify-between items-center p-4 sm:p-6 border-b">
                        <h3 className="text-lg font-semibold text-gray-800">Bagan Akun (Chart of Accounts)</h3>
                        <button onClick={() => handleOpenAccountModal()} className="flex items-center px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-orange-600">
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
            )}

            {activeTab === 'Jurnal Umum' && (
                <Card>
                    <div className="flex justify-between items-center p-4 sm:p-6 border-b">
                        <h3 className="text-lg font-semibold text-gray-800">Jurnal Umum</h3>
                        <button onClick={() => setIsJournalModalOpen(true)} className="flex items-center px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-orange-600">
                            <PlusCircleIcon className="w-5 h-5 mr-2" />
                            Buat Jurnal Manual
                        </button>
                    </div>
                    <div className="p-6">
                        <JurnalUmum />
                    </div>
                </Card>
            )}

            <Modal isOpen={isAccountModalOpen} onClose={handleCloseAccountModal} title={editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}>
                <AccountForm 
                    onSave={handleSaveAccount}
                    onClose={handleCloseAccountModal}
                    initialData={editingAccount}
                    parentAccounts={accounts}
                />
            </Modal>

            <Modal isOpen={isJournalModalOpen} onClose={() => setIsJournalModalOpen(false)} title="Buat Jurnal Manual">
                <ManualJournalForm
                    onSave={handleSaveManualJournal}
                    onClose={() => setIsJournalModalOpen(false)}
                    accounts={accounts}
                />
            </Modal>
        </>
    );
};

export default Accounting;


