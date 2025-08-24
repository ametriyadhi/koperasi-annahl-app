import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; // Impor koneksi database kita
import type { Anggota } from '../types';
import Card from './shared/Card';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

const Members: React.FC = () => {
  // State untuk menyimpan daftar anggota dari Firestore
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  // State untuk menunjukkan status loading
  const [loading, setLoading] = useState<boolean>(true);

  // useEffect akan berjalan sekali saat komponen pertama kali dimuat
  useEffect(() => {
    const fetchAnggota = async () => {
      try {
        // Mengambil data dari koleksi 'anggota' di Firestore
        const querySnapshot = await getDocs(collection(db, "anggota"));
        const membersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Anggota[];
        
        setAnggotaList(membersData); // Simpan data ke state
      } catch (error) {
        console.error("Error fetching members: ", error);
        // Di aplikasi nyata, kita akan menampilkan pesan error ke pengguna
      } finally {
        setLoading(false); // Hentikan loading
      }
    };

    fetchAnggota();
  }, []); // Array dependensi kosong berarti efek ini hanya berjalan sekali

  if (loading) {
    return <Card title="Daftar Anggota Koperasi"><p>Memuat data anggota...</p></Card>;
  }

  return (
    <Card title="Daftar Anggota Koperasi">
        <div className="mb-4">
            <p className="text-sm text-gray-600">Daftar semua anggota terdaftar di Koperasi An Nahl (Data dari Firestore).</p>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIP</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Gabung</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Simpanan</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {anggotaList.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{member.nama}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.nip}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.unit}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(member.tgl_gabung).toLocaleDateString('id-ID')}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    member.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {member.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-800">
                                {formatCurrency(member.simpanan_pokok + member.simpanan_wajib + member.simpanan_sukarela)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </Card>
  );
};

export default Members;

