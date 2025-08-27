import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah } from '../types';
import { StatusKontrak, Unit } from '../types'; // Impor Unit
import Card from './shared/Card';
import Modal from './shared/Modal';
import MurabahahForm from './MurabahahForm';
import MurabahahImporter from './MurabahahImporter';
import { PlusCircleIcon } from './icons';

// Fungsi helper untuk format mata uang
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const tabs = [
    StatusKontrak.BERJALAN, StatusKontrak.REVIEW, StatusKontrak.APPROVED,
    StatusKontrak.AKAD, StatusKontrak.LUNAS, StatusKontrak.MACET,
];

const Murabahah: React.FC = () => {
    // State yang sudah ada
    const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
    const [kontrakList, setKontrakList] = useState<KontrakMurabahah[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<StatusKontrak>(StatusKontrak.BERJALAN);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingKontrak, setEditingKontrak] = useState<KontrakMurabahah | null>(null);

    // --- STATE BARU UNTUK FILTER DAN PENCARIAN ---
    const [searchTerm, setSearchTerm] = useState('');
    const [unitFilter, setUnitFilter] = useState('Semua');

    useEffect(() => {
        const unsubAnggota = onSnapshot(collection(db, "anggota"), (snapshot) => {
            setAnggotaList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anggota)));
        });
        const unsubKontrak = onSnapshot(collection(db, "kontrak_murabahah"), (snapshot) => {
            const contracts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KontrakMurabahah));
            setKontrakList(contracts);
            setLoading(false);
        });
        return () => { unsubAnggota(); unsubKontrak(); };
    }, []);

    const handleOpenFormModal = (kontrak: KontrakMurabahah | null = null) => {
        setEditingKontrak(kontrak);
        setIsFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setIsFormModalOpen(false);
        setEditingKontrak(null);
    };
    
    const handleCloseImportModal = () => setIsImportModalOpen(false);

    const handleSaveKontrak = async (kontrakData: Omit<KontrakMurabahah, 'id'>) => {
        try {
            if (editingKontrak) {
                await updateDoc(doc(db, "kontrak_murabahah", editingKontrak.id), kontrakData);
            } else {
                await addDoc(collection(db, "kontrak_murabahah"), kontrakData);
            }
            handleCloseFormModal();
        } catch (error) { console.error("Error saving contract: ", error); }
    };

    const handleDeleteKontrak = async (id: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus kontrak ini?")) {
            try {
                await deleteDoc(doc(db, "kontrak_murabahah", id));
            } catch (error) { console.error("Error deleting contract: ", error); }
        }
    };

    const getAnggotaInfo = (anggotaId: string) => anggotaList.find(a => a.id === anggotaId);

    // --- LOGIKA BARU UNTUK MEMFILTER DATA ---
    const filteredContracts = useMemo(() => {
        const anggotaMap = new Map(anggotaList.map(a => [a.id, a]));
        
        return kontrakList.filter(kontrak => {
            const anggota = anggotaMap.get(kontrak.anggota_id);
            if (!anggota) return false;

            const statusMatch = kontrak.status === activeTab;
            const unitMatch = unitFilter === 'Semua' || anggota.unit === unitFilter;
            const searchMatch = searchTerm === '' || 
                                anggota.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                kontrak.nama_barang.toLowerCase().includes(searchTerm.toLowerCase());

            return statusMatch && unitMatch && searchMatch;
        });
    }, [kontrakList, anggotaList, activeTab, unitFilter, searchTerm]);

    // --- LOGIKA BARU UNTUK MENGHITUNG TOTAL ---
    const totalPembiayaanFiltered = useMemo(() => {
        return filteredContracts.reduce((total, kontrak) => total + (kontrak.harga_jual || 0), 0);
    }, [filteredContracts]);


    return (
        <>
            <Card>
                <div className="p-4 sm:p-6 border-b">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800">Pembiayaan Murabahah</h3>
                        <div className="flex space-x-2">
                            <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">Import CSV</button>
                            <button onClick={() => handleOpenFormModal()} className="flex items-center px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-orange-600">
                                <PlusCircleIcon className="w-5 h-5 mr-2" />
                                Tambah Pengajuan
                            </button>
                        </div>
                    </div>
                    {/* --- FORM FILTER DAN PENCARIAN BARU --- */}
                    <div className="mt-4 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                        <input 
                            type="text"
                            placeholder="Cari nama anggota/barang..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-1/3 border border-gray-300 rounded-md shadow-sm py-2 px-3"
                        />
                        <select
                            value={unitFilter}
                            onChange={(e) => setUnitFilter(e.target.value)}
                            className="w-full md:w-1/3 border border-gray-300 rounded-md shadow-sm py-2 px-3"
                        >
                            <option value="Semua">Semua Unit</option>
                            {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>
                <div className="border-b border-gray-200 px-4 sm:px-6">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="overflow-x-auto">
                    {loading ? <p className="p-6 text-center">Memuat data...</p> : (
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Nama</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Unit</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Barang</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Tgl Realisasi</th>
                                    <th className="px-4 py-2 text-center font-medium text-gray-500 uppercase">Tenor</th>
                                    <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase">Hrg Pokok</th>
                                    <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase">Margin</th>
                                    <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase">Total Pembiayaan</th>
                                    <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase">Angsuran</th>
                                    <th className="px-4 py-2 text-center font-medium text-gray-500 uppercase">Terbayar</th>
                                    <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase">Sisa Cicilan</th>
                                    <th className="px-4 py-2 text-center font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredContracts.map((kontrak) => {
                                    const anggota = getAnggotaInfo(kontrak.anggota_id);
                                    const sisaHutang = Math.max(0, (kontrak.harga_jual || 0) - ((kontrak.cicilan_terbayar || 0) * (kontrak.cicilan_per_bulan || 0)));
                                    
                                    return (
                                        <tr key={kontrak.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">{anggota?.nama || 'N/A'}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-500">{anggota?.unit || 'N/A'}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-500">{kontrak.nama_barang}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-500">{new Date(kontrak.tanggal_akad).toLocaleDateString('id-ID')}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-center text-gray-500">{kontrak.tenor}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-gray-500">{formatCurrency(kontrak.harga_pokok)}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-gray-500">{formatCurrency(kontrak.margin)}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right font-semibold text-gray-700">{formatCurrency(kontrak.harga_jual)}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-gray-700">{formatCurrency(kontrak.cicilan_per_bulan)}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-center text-gray-500">{kontrak.cicilan_terbayar} / {kontrak.tenor}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right font-bold text-gray-800">{formatCurrency(sisaHutang)}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-center font-medium space-x-2">
                                                <button onClick={() => handleOpenFormModal(kontrak)} className="text-primary hover:text-amber-600">Edit</button>
                                                <button onClick={() => handleDeleteKontrak(kontrak.id)} className="text-red-600 hover:text-red-800">Hapus</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {/* --- FOOTER BARU UNTUK TOTAL --- */}
                            <tfoot className="bg-gray-50 border-t-2">
                                <tr>
                                    <td colSpan={7} className="px-4 py-3 text-right font-bold text-gray-700">Total Pembiayaan (Hasil Filter)</td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(totalPembiayaanFiltered)}</td>
                                    <td colSpan={4}></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                     {!loading && filteredContracts.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            Tidak ada data untuk filter yang dipilih.
                        </div>
                    )}
                </div>
            </Card>
            <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal} title={editingKontrak ? 'Edit Kontrak Murabahah' : 'Pengajuan Murabahah Baru'}>
                <MurabahahForm onSave={handleSaveKontrak} onClose={handleCloseFormModal} anggotaList={anggotaList} initialData={editingKontrak} />
            </Modal>
            <Modal isOpen={isImportModalOpen} onClose={handleCloseImportModal} title="Impor Kontrak Murabahah dari CSV">
                <MurabahahImporter onClose={handleCloseImportModal} onImportSuccess={handleCloseImportModal} anggotaList={anggotaList} />
            </Modal>
        </>
    );
};

export default Murabahah;


