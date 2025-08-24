import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota } from '../types';
import Card from './shared/Card';
import Modal from './shared/Modal';
import MemberForm from './MemberForm';
import MemberImporter from './MemberImporter'; // <-- Impor komponen baru
import { PlusCircleIcon } from './icons';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

const Members: React.FC = () => {
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); // <-- State untuk modal import
  const [editingAnggota, setEditingAnggota] = useState<Anggota | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "anggota"), (querySnapshot) => {
      const membersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Anggota[];
      setAnggotaList(membersData);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to members collection: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenFormModal = (anggota: Anggota | null = null) => {
    setEditingAnggota(anggota);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingAnggota(null);
  };
  
  const handleCloseImportModal = () => {
      setIsImportModalOpen(false);
  };

  const handleSaveAnggota = async (anggotaData: Omit<Anggota, 'id'>) => {
    try {
      if (editingAnggota) {
        const docRef = doc(db, "anggota", editingAnggota.id);
        await updateDoc(docRef, anggotaData);
      } else {
        await addDoc(collection(db, "anggota"), anggotaData);
      }
      handleCloseFormModal();
    } catch (error) {
      console.error("Error saving member: ", error);
    }
  };

  const handleDeleteAnggota = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus anggota ini?")) {
      try {
        await deleteDoc(doc(db, "anggota", id));
      } catch (error) {
        console.error("Error deleting member: ", error);
      }
    }
  };
  
  return (
    <>
      <Card>
        <div className="flex justify-between items-center p-4 sm:p-6 border-b">
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
                {anggotaList.map((member) => (
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
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal} title={editingAnggota ? 'Edit Anggota' : 'Tambah Anggota Baru'}>
        <MemberForm 
          onSave={handleSaveAnggota}
          onClose={handleCloseFormModal}
          initialData={editingAnggota}
        />
      </Modal>
      
      <Modal isOpen={isImportModalOpen} onClose={handleCloseImportModal} title="Impor Anggota dari CSV">
        <MemberImporter onClose={handleCloseImportModal} onImportSuccess={handleCloseImportModal} />
      </Modal>
    </>
  );
};

export default Members;
