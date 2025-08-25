import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, TransaksiSimpanan } from '../types';
import { JenisSimpanan } from '../types';
import Card from './shared/Card';
import Modal from './shared/Modal';
import TransactionForm from './TransactionForm';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

const Savings: React.FC = () => {
    const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
    const [selectedAnggota, setSelectedAnggota] = useState<Anggota | null>(null);
    const [transaksiList, setTransaksiList] = useState<TransaksiSimpanan[]>([]);
    const [loading, setLoading] = useState({ anggota: true, transaksi: false });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaksi, setEditingTransaksi] = useState<TransaksiSimpanan | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "anggota"), (snapshot) => {
            const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Anggota[];
            setAnggotaList(members);
            setLoading(prev => ({ ...prev, anggota: false }));
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (selectedAnggota) {
            setLoading(prev => ({ ...prev, transaksi: true }));
            const transaksiCol = collection(db, "anggota", selectedAnggota.id, "transaksi");
            const unsubscribe = onSnapshot(transaksiCol, (snapshot) => {
                const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TransaksiSimpanan[];
                transactions.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
                setTransaksiList(transactions);
                setLoading(prev => ({ ...prev, transaksi: false }));
            });
            return () => unsubscribe();
        }
    }, [selectedAnggota]);

    const filteredAnggotaList = useMemo(() => {
        return anggotaList.filter(a => a.nama.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [anggotaList, searchTerm]);

    const handleOpenModal = (transaksi: TransaksiSimpanan | null = null) => {
        setEditingTransaksi(transaksi);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTransaksi(null);
    };

    const handleSaveTransaksi = async (transaksiData: Omit<TransaksiSimpanan, 'id' | 'anggota_id' | 'tanggal'>) => {
        if (!selectedAnggota) return;

        const memberRef = doc(db, "anggota", selectedAnggota.id);
        const transaksiCol = collection(db, "anggota", selectedAnggota.id, "transaksi");

        try {
            await runTransaction(db, async (transaction) => {
                const memberDoc = await transaction.get(memberRef);
                if (!memberDoc.exists()) throw new Error("Anggota tidak ditemukan!");
                const currentData = memberDoc.data() as Anggota;

                const fieldMap: Record<JenisSimpanan, keyof Anggota> = {
                    [JenisSimpanan.POKOK]: 'simpanan_pokok',
                    [JenisSimpanan.WAJIB]: 'simpanan_wajib',
                    [JenisSimpanan.SUKARELA]: 'simpanan_sukarela',
                };

                if (editingTransaksi) { // LOGIKA EDIT
                    const oldTransaksiRef = doc(db, "anggota", selectedAnggota.id, "transaksi", editingTransaksi.id);
                    const oldTransaksiData = transaksiList.find(t => t.id === editingTransaksi.id);
                    if (!oldTransaksiData) throw new Error("Transaksi lama tidak ditemukan!");

                    // 1. Batalkan efek transaksi lama
                    let balance = currentData[fieldMap[oldTransaksiData.jenis] as keyof Anggota] as number;
                    balance += oldTransaksiData.tipe === 'Tarik' ? oldTransaksiData.jumlah : -oldTransaksiData.jumlah;
                    
                    // 2. Terapkan efek transaksi baru
                    balance += transaksiData.tipe === 'Setor' ? transaksiData.jumlah : -transaksiData.jumlah;
                    if (balance < 0) throw new Error("Saldo tidak mencukupi!");

                    transaction.update(memberRef, { [fieldMap[transaksiData.jenis]]: balance });
                    transaction.update(oldTransaksiRef, { ...transaksiData, tanggal: editingTransaksi.tanggal });
                } else { // LOGIKA TAMBAH BARU
                    const fieldToUpdate = fieldMap[transaksiData.jenis];
                    const currentBalance = currentData[fieldToUpdate] as number || 0;
                    let newBalance = currentBalance;
                    newBalance += transaksiData.tipe === 'Setor' ? transaksiData.jumlah : -transaksiData.jumlah;
                    if (newBalance < 0) throw new Error("Saldo tidak mencukupi!");

                    transaction.update(memberRef, { [fieldToUpdate]: newBalance });
                    const newTransaksiRef = doc(transaksiCol);
                    transaction.set(newTransaksiRef, {
                        ...transaksiData,
                        anggota_id: selectedAnggota.id,
                        tanggal: new Date().toISOString(),
                    });
                }
            });
            handleCloseModal();
        } catch (error: any) {
            console.error("Gagal menyimpan transaksi: ", error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleDeleteTransaksi = async (transaksi: TransaksiSimpanan) => {
        if (!selectedAnggota || !confirm(`Yakin ingin menghapus transaksi "${transaksi.keterangan}"? Aksi ini akan mengubah saldo.`)) return;

        const memberRef = doc(db, "anggota", selectedAnggota.id);
        const transaksiRef = doc(db, "anggota", selectedAnggota.id, "transaksi", transaksi.id);

        try {
            await runTransaction(db, async (transaction) => {
                const memberDoc = await transaction.get(memberRef);
                if (!memberDoc.exists()) throw new Error("Anggota tidak ditemukan!");

                const currentData = memberDoc.data() as Anggota;
                const fieldMap: Record<JenisSimpanan, keyof Anggota> = {
                    [JenisSimpanan.POKOK]: 'simpanan_pokok',
                    [JenisSimpanan.WAJIB]: 'simpanan_wajib',
                    [JenisSimpanan.SUKARELA]: 'simpanan_sukarela',
                };
                
                const fieldToUpdate = fieldMap[transaksi.jenis];
                let currentBalance = currentData[fieldToUpdate] as number || 0;
                // Batalkan efek transaksi yang dihapus
                currentBalance += transaksi.tipe === 'Tarik' ? transaksi.jumlah : -transaksi.jumlah;
                if (currentBalance < 0) throw new Error("Saldo menjadi negatif setelah penghapusan!");

                transaction.update(memberRef, { [fieldToUpdate]: currentBalance });
                transaction.delete(transaksiRef);
            });
        } catch (error: any) {
            console.error("Gagal menghapus transaksi: ", error);
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Simpanan Anggota</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card title="Pilih Anggota">
                        <div className="p-4 border-b">
                            <input
                                type="text"
                                placeholder="Cari nama anggota..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        {loading.anggota ? <p className="p-4">Memuat...</p> : (
                            <ul className="max-h-96 overflow-y-auto">
                                {filteredAnggotaList.map(anggota => (
                                    <li key={anggota.id}>
                                        <button 
                                            onClick={() => setSelectedAnggota(anggota)}
                                            className={`w-full text-left p-3 text-sm ${selectedAnggota?.id === anggota.id ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>
                                            {anggota.nama}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
                <div className="md:col-span-2">
                    {selectedAnggota ? (
                        <div className="space-y-6">
                            <Card>
                                <div className="p-4 sm:p-6 border-b flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">Rekening - {selectedAnggota.nama}</h3>
                                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-orange-600">
                                        + Transaksi Baru
                                    </button>
                                </div>
                                <div className="p-4 sm:p-6 space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                                        <p className="font-semibold text-gray-700">Simpanan Pokok</p>
                                        <p className="text-lg font-bold text-primary">{formatCurrency(selectedAnggota.simpanan_pokok || 0)}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                                        <p className="font-semibold text-gray-700">Simpanan Wajib</p>
                                        <p className="text-lg font-bold text-primary">{formatCurrency(selectedAnggota.simpanan_wajib || 0)}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                                        <p className="font-semibold text-gray-700">Simpanan Sukarela</p>
                                        <p className="text-lg font-bold text-primary">{formatCurrency(selectedAnggota.simpanan_sukarela || 0)}</p>
                                    </div>
                                </div>
                            </Card>
                            <Card title="Riwayat Transaksi">
                                {loading.transaksi ? <p className="p-4">Memuat riwayat...</p> : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transaksiList.map(t => (
                                                    <tr key={t.id}>
                                                        <td className="px-4 py-2 text-sm">{new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">{t.jenis}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">{t.keterangan}</td>
                                                        <td className={`px-4 py-2 text-sm text-right font-semibold ${t.tipe === 'Setor' ? 'text-green-600' : 'text-red-600'}`}>
                                                            {t.tipe === 'Tarik' && '- '}{formatCurrency(t.jumlah)}
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-sm space-x-2">
                                                            <button onClick={() => handleOpenModal(t)} className="text-primary hover:text-amber-600">Edit</button>
                                                            <button onClick={() => handleDeleteTransaksi(t)} className="text-red-600 hover:text-red-800">Hapus</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {transaksiList.length === 0 && <p className="text-center text-gray-500 py-4">Belum ada transaksi.</p>}
                                    </div>
                                )}
                            </Card>
                        </div>
                    ) : (
                        <Card title="Detail Simpanan">
                            <p>Pilih anggota dari daftar untuk melihat detail simpanan.</p>
                        </Card>
                    )}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingTransaksi ? 'Edit Transaksi' : `Transaksi Baru untuk ${selectedAnggota?.nama}`}>
                <TransactionForm onSave={handleSaveTransaksi} onClose={handleCloseModal} initialData={editingTransaksi} />
            </Modal>
        </>
    );
};

export default Savings;



