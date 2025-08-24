import React, { useState, useEffect } from 'react';
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

    // 1. Fetch semua anggota secara real-time
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "anggota"), (snapshot) => {
            const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Anggota[];
            setAnggotaList(members);
            setLoading(prev => ({ ...prev, anggota: false }));
        });
        return () => unsubscribe();
    }, []);

    // 2. Fetch transaksi untuk anggota yang dipilih secara real-time
    useEffect(() => {
        if (selectedAnggota) {
            setLoading(prev => ({ ...prev, transaksi: true }));
            const transaksiCol = collection(db, "anggota", selectedAnggota.id, "transaksi");
            const unsubscribe = onSnapshot(transaksiCol, (snapshot) => {
                const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TransaksiSimpanan[];
                // Urutkan transaksi dari yang terbaru
                transactions.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
                setTransaksiList(transactions);
                setLoading(prev => ({ ...prev, transaksi: false }));
            });
            return () => unsubscribe();
        }
    }, [selectedAnggota]);

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
                
                const fieldToUpdate = fieldMap[transaksiData.jenis];
                const currentBalance = currentData[fieldToUpdate] as number || 0;
                let newBalance;

                if (transaksiData.tipe === 'Setor') {
                    newBalance = currentBalance + transaksiData.jumlah;
                } else { // Tarik
                    if (transaksiData.jenis !== JenisSimpanan.SUKARELA) {
                        throw new Error("Penarikan hanya bisa dari Simpanan Sukarela!");
                    }
                    newBalance = currentBalance - transaksiData.jumlah;
                    if (newBalance < 0) throw new Error("Saldo tidak mencukupi!");
                }

                // Update saldo di dokumen anggota
                transaction.update(memberRef, { [fieldToUpdate]: newBalance });

                // Buat dokumen transaksi baru di sub-collection
                const newTransaksiRef = doc(transaksiCol); // Buat ref baru
                transaction.set(newTransaksiRef, {
                    ...transaksiData,
                    anggota_id: selectedAnggota.id,
                    tanggal: new Date().toISOString(),
                });
            });
            setIsModalOpen(false);
        } catch (error: any) {
            console.error("Gagal menyimpan transaksi: ", error);
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Simpanan Anggota</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card title="Pilih Anggota">
                        {loading.anggota ? <p>Memuat...</p> : (
                            <ul className="max-h-96 overflow-y-auto">
                                {anggotaList.map(anggota => (
                                    <li key={anggota.id}>
                                        <button 
                                            onClick={() => setSelectedAnggota(anggota)}
                                            className={`w-full text-left p-3 rounded-lg text-sm ${selectedAnggota?.id === anggota.id ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>
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
                                    <h3 className="text-lg font-semibold">Rekening Simpanan - {selectedAnggota.nama}</h3>
                                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-lime-600">
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
                                {loading.transaksi ? <p>Memuat riwayat...</p> : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Transaksi Baru untuk ${selectedAnggota?.nama}`}>
                <TransactionForm onSave={handleSaveTransaksi} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </>
    );
};

export default Savings;


