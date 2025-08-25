import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, UserProfile } from '../types';
import { Unit } from '../types';
import Card from './shared/Card';
import Modal from './shared/Modal';
import MemberForm from './MemberForm';
import MemberImporter from './MemberImporter';
import { PlusCircleIcon } from './icons';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

const Members: React.FC = () => {
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingAnggota, setEditingAnggota] = useState<Anggota | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState('Semua');

  useEffect(() => {
    const unsubAnggota = onSnapshot(collection(db, "anggota"), (querySnapshot) => {
      const membersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Anggota[];
      setAnggotaList(membersData);
      setLoading(false);
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUserProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
    });
    return () => {
      unsubAnggota();
      unsubUsers();
    };
  }, []);

  const filteredAnggota = useMemo(() => {
    return anggotaList.filter(anggota => {
      const searchMatch = anggota.nama.toLowerCase().includes(searchTerm.toLowerCase());
      const unitMatch = unitFilter === 'Semua' || anggota.unit === unitFilter;
      return searchMatch && unitMatch;
    });
  }, [anggotaList, searchTerm, unitFilter]);

  const totalSimpananFiltered = useMemo(() => {
    return filteredAnggota.reduce((total, member) => 
      total + (member.simpanan_pokok || 0) + (member.simpanan_wajib || 0) + (member.simpanan_sukarela || 0), 0);
  }, [filteredAnggota]);


  const handleOpenFormModal = (anggota: Anggota | null = null) => {
    setEditingAnggota(anggota);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setEditingAnggota(null);
    setIsFormModalOpen(false);
  };
  
  const handleCloseImportModal = () => setIsImportModalOpen(false);

  const handleSaveAnggota = async (anggotaData: Omit<Anggota, 'id'>, authInfo: { email?: string, password?: string }) => {
    try {
      if (editingAnggota) { // Mode Edit
        const anggotaRef = doc(db, "anggota", editingAnggota.id);
        if (authInfo.email && authInfo.password) { // Menambah akses ke anggota lama
          await updateDoc(anggotaRef, anggotaData);
          alert(`Data anggota diperbarui.\n\nPENTING: Sekarang, buka Firebase Authentication, buat pengguna baru dengan email ${authInfo.email}, lalu buat dokumen di koleksi 'users' dengan UID dari pengguna baru tersebut, dan hubungkan 'anggota_id' ke '${editingAnggota.id}'.`);
        } else { // Hanya update data anggota
          await updateDoc(anggotaRef, anggotaData);
          alert("Data anggota berhasil diperbarui.");
        }
      } else { // Mode Tambah Baru
        if (!authInfo.email || !authInfo.password) {
            alert("Email dan password harus diisi untuk anggota baru.");
            return;
        }
        // Hanya menyimpan data anggota, tidak membuat profil user
        const newAnggotaDoc = await addDoc(collection(db, "anggota"), anggotaData);
        alert(`Langkah 1 Selesai: Data anggota untuk ${anggotaData.nama} telah disimpan.\n\nSEKARANG LAKUKAN LANGKAH 2:\n1. Buka Firebase Authentication.\n2. Buat pengguna baru dengan Email: ${authInfo.email} dan Password: [Password yang Anda masukkan].\n3. Salin User UID yang baru dibuat.\n4. Buka Firestore -> koleksi 'users'.\n5. Buat dokumen baru dengan ID = User UID yang tadi disalin.\n6. Isi field: 'email', 'role' ('anggota'), 'anggota_id' ('${newAnggotaDoc.id}'), dan 'uid' (User UID lagi).`);
      }
      handleCloseFormModal();
    } catch (error) {
      console.error("Error saving member: ", error);
      alert("Terjadi kesalahan saat menyimpan data.");
    }
  };

  const handleDeleteAnggota = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus anggota ini?")) {
      try {
        await deleteDoc(doc(db, "anggota", id));
      } catch (error) { console.error("Error deleting member: ", error); }
    }
  };
  
  const userProfileForEdit = useMemo(() => {
    if (!editingAnggota) return null;
    return userProfiles.find(p => p.anggota_id === editingAnggota.id) || null;
  }, [editingAnggota, userProfiles]);

  return (
    <>
      <Card>
        <div className="p-4 sm:p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Daftar Anggota Koperasi</h3>
                <p className="text-sm text-gray-600">Data terhubung langsung ke database Firestore.</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">
                    Import CSV
                </button>
                <button onClick={() => handleOpenFormModal()} className="flex items-center px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-lime-600">
                  <PlusCircleIcon className="w-5 h-5 mr-2" />
                  Tambah Anggota
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                <input 
                    type="text"
                    placeholder="Cari nama anggota..."
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

        {loading ? (
          <p className="p-6">Memuat data anggota...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NIP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Simpanan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAnggota.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.nama}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.nip}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">
                      {formatCurrency((member.simpanan_pokok || 0) + (member.simpanan_wajib || 0) + (member.simpanan_sukarela || 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => handleOpenFormModal(member)} className="text-primary hover:text-amber-600">Edit</button>
                      <button onClick={() => handleDeleteAnggota(member.id)} className="text-red-600 hover:text-red-800">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2">
                <tr>
                    <td colSpan={3} className="px-6 py-3 text-right font-bold text-gray-700">Total Simpanan (Hasil Filter)</td>
                    <td className="px-6 py-3 text-right font-bold text-gray-900">{formatCurrency(totalSimpananFiltered)}</td>
                    <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
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




