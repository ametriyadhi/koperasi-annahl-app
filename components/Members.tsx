import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import type { Anggota, UserProfile } from '../types';
import { Unit } from '../types';
import Card from './shared/Card';
import Modal from './shared/Modal';
import MemberForm from './MemberForm';
import MemberImporter from './MemberImporter';
import { PlusCircleIcon, ArrowDownUpIcon } from './icons';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

// Tipe untuk konfigurasi pengurutan
type SortConfig = {
  key: keyof Anggota | 'totalSimpanan';
  direction: 'ascending' | 'descending';
};

const Members: React.FC = () => {
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingAnggota, setEditingAnggota] = useState<Anggota | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState('Semua');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  useEffect(() => {
    const unsubAnggota = onSnapshot(collection(db, "anggota"), (querySnapshot) => {
      const membersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Anggota[];
      setAnggotaList(membersData);
      setLoading(false);
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUserProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
    });
    return () => { unsubAnggota(); unsubUsers(); };
  }, []);

  const sortedAndFilteredAnggota = useMemo(() => {
    let filterableAnggota = anggotaList.map(a => ({
        ...a,
        totalSimpanan: (a.simpanan_pokok || 0) + (a.simpanan_wajib || 0) + (a.simpanan_sukarela || 0)
    }));

    // Filtering
    filterableAnggota = filterableAnggota.filter(anggota => {
      const searchMatch = anggota.nama.toLowerCase().includes(searchTerm.toLowerCase()) || anggota.nip.includes(searchTerm);
      const unitMatch = unitFilter === 'Semua' || anggota.unit === unitFilter;
      return searchMatch && unitMatch;
    });

    // Sorting
    if (sortConfig !== null) {
      filterableAnggota.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default sort by unit then name
      const unitOrder = [Unit.PGTK, Unit.SD, Unit.SMP, Unit.SMA, Unit.Supporting, Unit.Manajemen];
      filterableAnggota.sort((a, b) => {
        const unitComparison = unitOrder.indexOf(a.unit) - unitOrder.indexOf(b.unit);
        if (unitComparison !== 0) return unitComparison;
        return a.nama.localeCompare(b.nama);
      });
    }

    return filterableAnggota;
  }, [anggotaList, searchTerm, unitFilter, sortConfig]);

  const requestSort = (key: keyof Anggota | 'totalSimpanan') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleOpenFormModal = (anggota: Anggota | null = null) => {
    setEditingAnggota(anggota);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setEditingAnggota(null);
    setIsFormModalOpen(false);
  };
  
  const handleCloseImportModal = () => setIsImportModalOpen(false);

  const handleSaveAnggota = async (anggotaData: Omit<Anggota, 'id'>, authInfo: { uid?: string, email?: string, password?: string }) => {
    if (!editingAnggota || !authInfo.uid) {
        alert("Error: Data anggota atau UID tidak ditemukan untuk proses update.");
        return;
    }
    
    setIsLoading(true);
    try {
        // 1. Update data anggota di Firestore
        const anggotaRef = doc(db, "anggota", editingAnggota.id);
        await updateDoc(anggotaRef, anggotaData);

        // 2. Panggil Cloud Function untuk update data Auth & user profile
        const functions = getFunctions();
        const updateUserAuth = httpsCallable(functions, 'updateUserAuth');
        await updateUserAuth({ 
            uid: authInfo.uid, 
            email: authInfo.email, 
            password: authInfo.password, // Kirim password jika ada, jika tidak, undefined
            displayName: anggotaData.nama,
        });

        alert("Data anggota dan login berhasil diperbarui.");
        handleCloseFormModal();
    } catch (error: any) {
        console.error("Error saving member: ", error);
        alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteAnggota = async (id: string) => {
    if (window.confirm("Menghapus anggota juga akan menghapus data login mereka. Aksi ini tidak dapat diurungkan. Lanjutkan?")) {
      // Di aplikasi production, sebaiknya panggil Cloud Function untuk menghapus user dari Auth
      try {
        await deleteDoc(doc(db, "anggota", id));
        alert("Anggota berhasil dihapus. Harap hapus user terkait dari Firebase Authentication secara manual.");
      } catch (error) { console.error("Error deleting member: ", error); }
    }
  };
  
  const userProfileForEdit = useMemo(() => {
    if (!editingAnggota) return null;
    return userProfiles.find(p => p.anggota_id === editingAnggota.id) || null;
  }, [editingAnggota, userProfiles]);

  const handleExportCsv = () => {
    const headers = ['NIP', 'Nama', 'Unit', 'Status', 'Tgl Gabung', 'Simpanan Pokok', 'Simpanan Wajib', 'Simpanan Sukarela', 'Total Simpanan'];
    const csvRows = sortedAndFilteredAnggota.map(row => 
      [
        row.nip, `"${row.nama}"`, row.unit, row.status, row.tgl_gabung,
        row.simpanan_pokok, row.simpanan_wajib, row.simpanan_sukarela, row.totalSimpanan
      ].join(',')
    );
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `daftar_anggota_${new Date().toLocaleDateString('id-ID')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Card>
        <div className="p-4 sm:p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Daftar Anggota Koperasi</h3>
              <div className="flex space-x-2">
                <button onClick={handleExportCsv} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">
                    Export CSV
                </button>
                <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">
                    Import CSV
                </button>
                <button onClick={() => handleOpenFormModal()} className="flex items-center px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-orange-600">
                  <PlusCircleIcon className="w-5 h-5 mr-2" />
                  Tambah Anggota
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                <input 
                    type="text"
                    placeholder="Cari nama atau NIP..."
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

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Header Tabel yang bisa diklik */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <button onClick={() => requestSort('nama')} className="flex items-center">Nama <ArrowDownUpIcon className="w-4 h-4 ml-1" /></button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <button onClick={() => requestSort('nip')} className="flex items-center">NIP <ArrowDownUpIcon className="w-4 h-4 ml-1" /></button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <button onClick={() => requestSort('unit')} className="flex items-center">Unit <ArrowDownUpIcon className="w-4 h-4 ml-1" /></button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  <button onClick={() => requestSort('totalSimpanan')} className="flex items-center">Total Simpanan <ArrowDownUpIcon className="w-4 h-4 ml-1" /></button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center">Memuat data...</td></tr>
              ) : sortedAndFilteredAnggota.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.nama}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.nip}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">{formatCurrency(member.totalSimpanan)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => handleOpenFormModal(member)} className="text-primary hover:text-amber-600">Edit</button>
                    <button onClick={() => handleDeleteAnggota(member.id)} className="text-red-600 hover:text-red-800">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal} title={editingAnggota ? 'Edit Anggota' : 'Tambah Anggota Baru'}>
        <MemberForm 
          onSave={handleSaveAnggota}
          onClose={handleCloseFormModal}
          initialData={editingAnggota}
          userProfile={userProfileForEdit}
        />
      </Modal>
      
      <Modal isOpen={isImportModalOpen} onClose={handleCloseImportModal} title="Impor Anggota dari CSV">
        <MemberImporter onClose={handleCloseImportModal} onImportSuccess={handleCloseImportModal} />
      </Modal>
    </>
  );
};

export default Members;





