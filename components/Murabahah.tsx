import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah } from '../types';
import { StatusKontrak, Unit } from '../types';
import Card from './shared/Card';
import Modal from './shared/Modal';
import MurabahahForm from './MurabahahForm';
import MurabahahImporter from './MurabahahImporter';
import MurabahahHistory from './MurabahahHistory';
import { PlusCircleIcon, ArrowDownUpIcon } from './icons';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const tabs = [
    StatusKontrak.BERJALAN, StatusKontrak.REVIEW, StatusKontrak.APPROVED,
    StatusKontrak.AKAD, StatusKontrak.LUNAS, StatusKontrak.MACET,
];

// Tipe data diperkaya dengan rincian angsuran
type CombinedKontrak = KontrakMurabahah & { 
    anggotaNama: string; 
    anggotaUnit: Unit; 
    sisaHutang: number;
    angsuranPokok: number;
    angsuranMargin: number;
};
type SortConfig = { key: keyof CombinedKontrak; direction: 'ascending' | 'descending'; };

const Murabahah: React.FC = () => {
    const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
    const [kontrakList, setKontrakList] = useState<KontrakMurabahah[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<StatusKontrak>(StatusKontrak.BERJALAN);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingKontrak, setEditingKontrak] = useState<KontrakMurabahah | null>(null);
    const [viewingHistoryKontrak, setViewingHistoryKontrak] = useState<KontrakMurabahah | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [unitFilter, setUnitFilter] = useState('Semua');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    useEffect(() => {
        const unsubAnggota = onSnapshot(collection(db, "anggota"), (snapshot) => {
            setAnggotaList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anggota)));
        });
        const unsubKontrak = onSnapshot(collection(db, "kontrak_murabahah"), (snapshot) => {
            setKontrakList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KontrakMurabahah)));
            setLoading(false);
        });
        return () => { unsubAnggota(); unsubKontrak(); };
    }, []);
    
    const sortedAndFilteredContracts = useMemo(() => {
        const anggotaMap = new Map(anggotaList.map(a => [a.id, a]));
        let combinedData: CombinedKontrak[] = kontrakList.map(kontrak => {
            const anggota = anggotaMap.get(kontrak.anggota_id);
            const sisaHutang = Math.max(0, (kontrak.harga_jual || 0) - ((kontrak.cicilan_terbayar || 0) * (kontrak.cicilan_per_bulan || 0)));
            // --- KALKULASI BARU UNTUK RINCIAN ANGSURAN ---
            const angsuranPokok = kontrak.tenor > 0 ? (kontrak.harga_pokok - (kontrak.uang_muka || 0)) / kontrak.tenor : 0;
            const angsuranMargin = kontrak.tenor > 0 ? (kontrak.margin || 0) / kontrak.tenor : 0;
            return {
                ...kontrak,
                anggotaNama: anggota?.nama || 'N/A',
                anggotaUnit: anggota?.unit || Unit.Supporting,
                sisaHutang,
                angsuranPokok,
                angsuranMargin,
            };
        });
        combinedData = combinedData.filter(k => {
            const statusMatch = k.status === activeTab;
            const unitMatch = unitFilter === 'Semua' || k.anggotaUnit === unitFilter;
            const searchMatch = searchTerm === '' || 
                                k.anggotaNama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                k.nama_barang.toLowerCase().includes(searchTerm.toLowerCase());
            return statusMatch && unitMatch && searchMatch;
        });
        if (sortConfig !== null) {
            combinedData.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        } else {
            const unitOrder = [Unit.PGTK, Unit.SD, Unit.SMP, Unit.SMA, Unit.Supporting, Unit.Manajemen];
            combinedData.sort((a, b) => {
                const unitComp = unitOrder.indexOf(a.anggotaUnit) - unitOrder.indexOf(b.anggotaUnit);
                if (unitComp !== 0) return unitComp;
                return a.anggotaNama.localeCompare(b.anggotaNama);
            });
        }
        return combinedData;
    }, [kontrakList, anggotaList, activeTab, unitFilter, searchTerm, sortConfig]);
    
    const requestSort = (key: keyof CombinedKontrak) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
          direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleExportCsv = () => {
        // --- HEADER CSV DIPERBARUI ---
        const headers = ['Nama Anggota', 'Unit', 'Nama Barang', 'Total Pembiayaan', 'Angsuran Pokok', 'Angsuran Margin', 'Total Angsuran', 'Tenor', 'Terbayar', 'Sisa Cicilan'];
        const csvRows = sortedAndFilteredContracts.map(k => 
            [`"${k.anggotaNama}"`, k.anggotaUnit, `"${k.nama_barang}"`,
                Math.round(k.harga_jual), Math.round(k.angsuranPokok), Math.round(k.angsuranMargin),
                Math.round(k.cicilan_per_bulan), k.tenor, k.cicilan_terbayar, Math.round(k.sisaHutang)
            ].join(',')
        );
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `laporan_murabahah_${activeTab}_${new Date().toLocaleDateString('id-ID')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenFormModal = (kontrak: KontrakMurabahah | null = null) => {
        setViewingHistoryKontrak(null);
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
        if (window.confirm("Apakah Anda yakin ingin menghapus kontrak ini? Semua riwayatnya juga akan terhapus.")) {
            try {
                await deleteDoc(doc(db, "kontrak_murabahah", id));
                setViewingHistoryKontrak(null);
            } catch (error) { console.error("Error deleting contract: ", error); }
        }
    };

    return (
        <>
            <Card>
                <div className="p-4 sm:p-6 border-b">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800">Pembiayaan Murabahah</h3>
                        <div className="flex space-x-2">
                            <button onClick={handleExportCsv} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">Export CSV</button>
                            <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">Import CSV</button>
                            <button onClick={() => handleOpenFormModal()} className="flex items-center px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-orange-600">
                                <PlusCircleIcon className="w-5 h-5 mr-2" />
                                Tambah Pengajuan
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                        <input type="text" placeholder="Cari nama anggota/barang..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-1/3 border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                        <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="w-full md:w-1/3 border border-gray-300 rounded-md shadow-sm py-2 px-3">
                            <option value="Semua">Semua Unit</option>
                            {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>
                <div className="border-b border-gray-200 px-4 sm:px-6">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}>{tab}</button>
                        ))}
                    </nav>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                        {/* --- HEADER TABEL DIPERBARUI --- */}
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Nama</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Barang</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase">Total Pembiayaan</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase">Angsuran Pokok</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase">Angsuran Margin</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase">Total Angsuran</th>
                                <th className="px-4 py-2 text-center font-medium text-gray-500 uppercase">Tenor</th>
                                <th className="px-4 py-2 text-center font-medium text-gray-500 uppercase">Terbayar</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase">Sisa Cicilan</th>
                                <th className="px-4 py-2 text-center font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (<tr><td colSpan={10} className="p-6 text-center">Memuat data...</td></tr>)
                            : sortedAndFilteredContracts.length === 0 ? (<tr><td colSpan={10} className="text-center py-10 text-gray-500">Tidak ada data untuk filter yang dipilih.</td></tr>)
                            : sortedAndFilteredContracts.map((kontrak) => (
                                <tr key={kontrak.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">{kontrak.anggotaNama}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{kontrak.nama_barang}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-right font-semibold text-gray-700">{formatCurrency(kontrak.harga_jual)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-right text-gray-500">{formatCurrency(kontrak.angsuranPokok)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-right text-gray-500">{formatCurrency(kontrak.angsuranMargin)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-right font-semibold text-gray-700">{formatCurrency(kontrak.cicilan_per_bulan)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-center text-gray-500">{kontrak.tenor} bln</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-center text-gray-500">{kontrak.cicilan_terbayar}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-right font-bold text-gray-800">{formatCurrency(kontrak.sisaHutang)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-center font-medium">
                                        <button onClick={() => setViewingHistoryKontrak(kontrak)} className="text-primary hover:underline">
                                            Riwayat & Aksi
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal} title={editingKontrak ? 'Edit Kontrak Murabahah' : 'Pengajuan Murabahah Baru'}>
                <MurabahahForm onSave={handleSaveKontrak} onClose={handleCloseFormModal} anggotaList={anggotaList} initialData={editingKontrak} />
            </Modal>
            
            <Modal isOpen={isImportModalOpen} onClose={handleCloseImportModal} title="Impor Kontrak Murabahah dari CSV">
                <MurabahahImporter onClose={handleCloseImportModal} onImportSuccess={handleCloseImportModal} anggotaList={anggotaList} />
            </Modal>

            <Modal 
                isOpen={!!viewingHistoryKontrak} 
                onClose={() => setViewingHistoryKontrak(null)} 
                title={`Riwayat: ${viewingHistoryKontrak?.nama_barang}`}
            >
                {viewingHistoryKontrak && 
                    <MurabahahHistory 
                        kontrak={viewingHistoryKontrak}
                        onEdit={handleOpenFormModal}
                        onDelete={handleDeleteKontrak}
                    />
                }
            </Modal>
        </>
    );
};

export default Murabahah;




