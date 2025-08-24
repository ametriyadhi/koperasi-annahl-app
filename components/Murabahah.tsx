import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah } from '../types';
import { StatusKontrak } from '../types';
import Card from './shared/Card';
import Modal from './shared/Modal';
import MurabahahForm from './MurabahahForm';
import { PlusCircleIcon } from './icons';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const tabs = [
    StatusKontrak.BERJALAN,
    StatusKontrak.REVIEW,
    StatusKontrak.APPROVED,
    StatusKontrak.LUNAS,
    StatusKontrak.MACET,
];

const Murabahah: React.FC = () => {
    const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
    const [kontrakList, setKontrakList] = useState<KontrakMurabahah[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<StatusKontrak>(StatusKontrak.BERJALAN);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingKontrak, setEditingKontrak] = useState<KontrakMurabahah | null>(null);

    // Fetch anggota untuk dropdown di form
    useEffect(() => {
        const unsubAnggota = onSnapshot(collection(db, "anggota"), (snapshot) => {
            setAnggotaList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anggota)));
        });
        return () => unsubAnggota();
    }, []);
    
    // Fetch kontrak murabahah secara real-time
    useEffect(() => {
        setLoading(true);
        const unsubKontrak = onSnapshot(collection(db, "kontrak_murabahah"), (snapshot) => {
            const contracts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KontrakMurabahah));
            setKontrakList(contracts);
            setLoading(false);
        });
        return () => unsubKontrak();
    }, []);

    const handleOpenModal = (kontrak: KontrakMurabahah | null = null) => {
        setEditingKontrak(kontrak);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingKontrak(null);
    };

    const handleSaveKontrak = async (kontrakData: Omit<KontrakMurabahah, 'id'>) => {
        try {
            if (editingKontrak) {
                await updateDoc(doc(db, "kontrak_murabahah", editingKontrak.id), kontrakData);
            } else {
                await addDoc(collection(db, "kontrak_murabahah"), kontrakData);
            }
            handleCloseModal();
        } catch (error) {
            console.error("Error saving contract: ", error);
        }
    };

    const handleDeleteKontrak = async (id: string) => {
        if (confirm("Apakah Anda yakin ingin menghapus kontrak ini?")) {
            try {
                await deleteDoc(doc(db, "kontrak_murabahah", id));
            } catch (error) {
                console.error("Error deleting contract: ", error);
            }
        }
    };

    const filteredContracts = kontrakList.filter(k => k.status === activeTab);
    const getAnggotaName = (anggotaId: string) => anggotaList.find(a => a.id === anggotaId)?.nama || 'N/A';

    return (
        <>
            <Card>
                <div className="flex justify-between items-center p-4 sm:p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Pembiayaan Murabahah</h3>
                    <button onClick={() => handleOpenModal()} className="flex items-center px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-orange-600">
                        <PlusCircleIcon className="w-5 h-5 mr-2" />
                        Tambah Pengajuan
                    </button>
                </div>
                <div className="border-b border-gray-200 px-4 sm:px-6">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => (
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
                <div className="overflow-x-auto">
                    {loading ? <p className="p-6 text-center">Memuat data...</p> : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anggota</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barang</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Harga Jual</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cicilan / Bulan</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredContracts.map((kontrak) => (
                                    <tr key={kontrak.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getAnggotaName(kontrak.anggota_id)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{kontrak.nama_barang}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">{formatCurrency(kontrak.harga_jual)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">{formatCurrency(kontrak.cicilan_per_bulan)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                            <button onClick={() => handleOpenModal(kontrak)} className="text-primary hover:text-amber-600">Edit</button>
                                            <button onClick={() => handleDeleteKontrak(kontrak.id)} className="text-red-600 hover:text-red-800">Hapus</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                     {!loading && filteredContracts.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            Tidak ada data untuk status "{activeTab}".
                        </div>
                    )}
                </div>
            </Card>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingKontrak ? 'Edit Kontrak Murabahah' : 'Pengajuan Murabahah Baru'}>
                <MurabahahForm 
                    onSave={handleSaveKontrak}
                    onClose={handleCloseModal}
                    anggotaList={anggotaList}
                    initialData={editingKontrak}
                />
            </Modal>
        </>
    );
};

export default Murabahah;

