import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Akun, JurnalEntry, JurnalEntryLine, SaldoNormal } from '../types';
import { AkunTipe } from '../types';
import Card from './shared/Card';
import Modal from './shared/Modal';
import AccountForm from './AccountForm';
import JurnalUmum from './JurnalUmum';
import ManualJournalForm from './ManualJournalForm';
import { PlusCircleIcon } from './icons';

// ... (Komponen AccountRow dan formatCurrency tidak berubah)
type AccountingTab = 'Bagan Akun' | 'Jurnal Umum';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const AccountRow: React.FC<{ akun: Akun, level: number, onEdit: (akun: Akun) => void, onDelete: (id: string) => void }> = ({ akun, level, onEdit, onDelete }) => {
    const isParent = !akun.parent_kode;
    const paddingLeft = level * 20 + 24;

    return (
        <tr className={isParent ? "bg-gray-100 font-bold" : "hover:bg-gray-50"}>
            <td className="px-6 py-3 whitespace-nowrap" style={{ paddingLeft: `${paddingLeft}px` }}>
                <div className={`text-sm ${isParent ? 'text-gray-800' : 'text-gray-700'}`}>{akun.kode}</div>
            </td>
            <td className="px-6 py-3 whitespace-nowrap">
                <div className={`text-sm ${isParent ? 'text-gray-800' : 'text-gray-700'}`}>{akun.nama}</div>
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{akun.tipe}</td>
            <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold">
                <span className={akun.saldo_normal === 'Debit' ? 'text-blue-600' : 'text-green-600'}>
                    {akun.saldo_normal}
                </span>
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-800">{formatCurrency(akun.saldo)}</td>
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
    const [editingJurnal, setEditingJurnal] = useState<JurnalEntry | null>(null); // State baru untuk edit jurnal

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "chart_of_accounts"), (snapshot) => {
            const fetchedAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Akun));
            fetchedAccounts.sort((a, b) => a.kode.localeCompare(b.kode));
            setAccounts(fetchedAccounts);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenAccountModal = useCallback((akun: Akun | null = null) => {
        setEditingAccount(akun);
        setIsAccountModalOpen(true);
    }, []);

    const handleCloseAccountModal = useCallback(() => {
        setIsAccountModalOpen(false);
        setEditingAccount(null);
    }, []);
    
    // Fungsi baru untuk membuka modal jurnal
    const handleOpenJournalModal = useCallback((jurnal: JurnalEntry | null = null) => {
        setEditingJurnal(jurnal);
        setIsJournalModalOpen(true);
    }, []);

    // Fungsi baru untuk menutup modal jurnal
    const handleCloseJournalModal = useCallback(() => {
        setIsJournalModalOpen(false);
        setEditingJurnal(null);
    }, []);

    const handleSaveAccount = useCallback(async (akunData: Omit<Akun, 'id' | 'saldo'>) => {
        // ... (fungsi ini tidak berubah dari sebelumnya)
        try {
            if (editingAccount) {
                const docRef = doc(db, "chart_of_accounts", editingAccount.id);
                await updateDoc(docRef, akunData);
            } else {
                const saldoNormalMap: Record<AkunTipe, SaldoNormal> = {
                    [AkunTipe.ASET]: 'Debit',
                    [AkunTipe.BEBAN]: 'Debit',
                    [AkunTipe.LIABILITAS]: 'Kredit',
                    [AkunTipe.EKUITAS]: 'Kredit',
                    [AkunTipe.PENDAPATAN]: 'Kredit',
                };
                const finalData = {
                    ...akunData,
                    saldo: 0,
                    saldo_normal: saldoNormalMap[akunData.tipe]
                };
                await addDoc(collection(db, "chart_of_accounts"), finalData);
            }
            handleCloseAccountModal();
        } catch (error) {
            console.error("Error saving account: ", error);
            alert("Gagal menyimpan akun.");
        }
    }, [editingAccount, handleCloseAccountModal]);

    // --- FUNGSI BARU DAN LOGIKA UPDATE JURNAL ---
    const handleSaveOrUpdateJournal = useCallback(async (deskripsi: string, lines: JurnalEntryLine[], entryId?: string) => {
        try {
            await runTransaction(db, async (transaction) => {
                const accountsMap = new Map<string, Akun>();
                
                // Ambil data semua akun yang terlibat
                const allAccountIds = new Set(lines.map(l => l.akun_id));
                if (entryId) {
                    const oldJurnalDoc = await transaction.get(doc(db, "jurnal_umum", entryId));
                    if (oldJurnalDoc.exists()) {
                        oldJurnalDoc.data().lines.forEach((l: JurnalEntryLine) => allAccountIds.add(l.akun_id));
                    }
                }
                for (const accId of allAccountIds) {
                    const accDoc = await transaction.get(doc(db, "chart_of_accounts", accId));
                    if (accDoc.exists()) {
                        accountsMap.set(accId, accDoc.data() as Akun);
                    }
                }

                // Jika ini adalah EDIT, batalkan dulu efek jurnal lama
                if (entryId) {
                    const oldJurnalRef = doc(db, "jurnal_umum", entryId);
                    const oldJurnalDoc = await transaction.get(oldJurnalRef);
                    if (oldJurnalDoc.exists()) {
                        const oldLines = oldJurnalDoc.data().lines as JurnalEntryLine[];
                        for (const line of oldLines) {
                            const acc = accountsMap.get(line.akun_id);
                            if (acc) {
                                acc.saldo = acc.saldo_normal === 'Debit' 
                                    ? acc.saldo - line.debit + line.kredit 
                                    : acc.saldo + line.debit - line.kredit;
                            }
                        }
                    }
                }

                // Terapkan efek jurnal baru (baik untuk create maupun update)
                for (const line of lines) {
                    const acc = accountsMap.get(line.akun_id);
                    if (acc) {
                        acc.saldo = acc.saldo_normal === 'Debit'
                            ? acc.saldo + line.debit - line.kredit
                            : acc.saldo - line.debit + line.kredit;
                    } else {
                        throw new Error(`Akun dengan ID ${line.akun_id} tidak ditemukan.`);
                    }
                }

                // Simpan perubahan saldo ke semua akun yang terpengaruh
                for (const [id, acc] of accountsMap.entries()) {
                    transaction.update(doc(db, "chart_of_accounts", id), { saldo: acc.saldo });
                }

                // Simpan atau update dokumen jurnal itu sendiri
                if (entryId) {
                    transaction.update(doc(db, "jurnal_umum", entryId), { deskripsi, lines });
                } else {
                    const newJurnalRef = doc(collection(db, "jurnal_umum"));
                    transaction.set(newJurnalRef, { tanggal: new Date().toISOString(), deskripsi, lines });
                }
            });

            alert(`Jurnal berhasil ${entryId ? 'diperbarui' : 'disimpan'}!`);
            handleCloseJournalModal();

        } catch (error: any) {
            console.error("Gagal menyimpan jurnal: ", error);
            alert(`Terjadi kesalahan: ${error.message}`);
        }
    }, [handleCloseJournalModal]);


    const handleDeleteJurnal = useCallback(async (jurnalId: string) => {
        // ... (Fungsi ini tidak berubah dari sebelumnya)
         if (!window.confirm("Menghapus jurnal ini akan membalikkan saldo pada akun terkait. Lanjutkan?")) return;

        try {
            await runTransaction(db, async (transaction) => {
                const jurnalRef = doc(db, "jurnal_umum", jurnalId);
                const jurnalDoc = await transaction.get(jurnalRef);
                if (!jurnalDoc.exists()) throw new Error("Jurnal tidak ditemukan!");

                const jurnalData = jurnalDoc.data() as JurnalEntry;

                for (const line of jurnalData.lines) {
                    const accRef = doc(db, "chart_of_accounts", line.akun_id);
                    const accDoc = await transaction.get(accRef);
                    if (accDoc.exists()) {
                        const accountData = accDoc.data() as Akun;
                        const currentSaldo = accountData.saldo || 0;
                        
                        let newSaldo;
                        if (accountData.saldo_normal === 'Debit') {
                            newSaldo = currentSaldo - line.debit + line.kredit;
                        } else { 
                            newSaldo = currentSaldo + line.debit - line.kredit;
                        }
                        transaction.update(accRef, { saldo: newSaldo });
                    }
                }
                transaction.delete(jurnalRef);
            });
            alert("Jurnal berhasil dihapus dan saldo telah dikembalikan.");
        } catch (error: any) {
            console.error("Gagal menghapus jurnal: ", error);
            alert(`Terjadi kesalahan: ${error.message}`);
        }
    }, []);

    const renderedAccountTree = useMemo(() => {
        // ... (Fungsi ini tidak berubah dari sebelumnya)
        const renderRecursively = (parentId: string | undefined, allAccounts: Akun[], level = 0): JSX.Element[] => {
            return allAccounts
                .filter(a => a.parent_kode === parentId)
                .flatMap(akun => [
                    <AccountRow key={akun.id} akun={akun} level={level} onEdit={handleOpenAccountModal} onDelete={handleDeleteAccount} />,
                    ...renderRecursively(akun.kode, allAccounts, level + 1)
                ]);
        };

        const topLevelAccounts = accounts.filter(a => !a.parent_kode);
        return topLevelAccounts.flatMap(parent => [
            <AccountRow key={parent.id} akun={parent} level={0} onEdit={handleOpenAccountModal} onDelete={handleDeleteAccount} />,
            ...renderRecursively(parent.kode, accounts, 1)
        ]);
    }, [accounts, handleOpenAccountModal, handleDeleteAccount]);


    return (
        <>
            {/* ... (Bagian UI tidak banyak berubah, hanya pemanggilan fungsinya) ... */}
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
                        <button onClick={() => handleOpenAccountModal(null)} className="flex items-center px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-orange-600">
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo Normal</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {loading ? <tr><td colSpan={6} className="p-6 text-center">Memuat data...</td></tr> : renderedAccountTree}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'Jurnal Umum' && (
                <Card>
                    <div className="flex justify-between items-center p-4 sm:p-6 border-b">
                        <h3 className="text-lg font-semibold text-gray-800">Jurnal Umum</h3>
                        <button onClick={() => handleOpenJournalModal(null)} className="flex items-center px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-orange-600">
                            <PlusCircleIcon className="w-5 h-5 mr-2" />
                            Buat Jurnal Manual
                        </button>
                    </div>
                    <div className="p-6">
                        <JurnalUmum onDelete={handleDeleteJurnal} onEdit={handleOpenJournalModal} />
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

            <Modal isOpen={isJournalModalOpen} onClose={handleCloseJournalModal} title={editingJurnal ? 'Edit Jurnal Manual' : 'Buat Jurnal Manual'}>
                <ManualJournalForm
                    onSave={handleSaveOrUpdateJournal}
                    onClose={handleCloseJournalModal}
                    accounts={accounts}
                    initialData={editingJurnal}
                />
            </Modal>
        </>
    );
};

export default Accounting;



