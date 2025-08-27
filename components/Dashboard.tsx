import React, { useState, useEffect, useMemo } from 'react';
// getDocs ditambahkan ke import di bawah ini
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah } from '../types';
import { StatusKontrak } from '../types';
import Card from './shared/Card';

// Fungsi helper untuk memformat angka menjadi format mata uang Rupiah.
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

const Dashboard: React.FC = () => {
    // State untuk menyimpan daftar anggota dan kontrak dari Firestore.
    const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
    const [kontrakList, setKontrakList] = useState<KontrakMurabahah[]>([]);
    const [loading, setLoading] = useState(true);

    // useEffect untuk mengambil data anggota dan kontrak secara real-time dari Firestore.
    useEffect(() => {
        setLoading(true);
        // Listener untuk koleksi 'anggota'
        const unsubAnggota = onSnapshot(collection(db, "anggota"), (snapshot) => {
            const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Anggota[];
            setAnggotaList(members);
        });

        // Listener untuk koleksi 'kontrak_murabahah'
        const unsubKontrak = onSnapshot(collection(db, "kontrak_murabahah"), (snapshot) => {
            const contracts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as KontrakMurabahah[];
            setKontrakList(contracts);
        });
        
        // Handle kasus jika koleksi kosong, agar loading state tidak stuck di true
        Promise.all([
            getDocs(collection(db, "anggota")),
            getDocs(collection(db, "kontrak_murabahah"))
        ]).then(() => {
            setLoading(false);
        }).catch(() => setLoading(false)); // Tetap set loading false jika ada error


        // Fungsi cleanup untuk berhenti mendengarkan perubahan saat komponen di-unmount.
        return () => {
            unsubAnggota();
            unsubKontrak();
        };
    }, []); 

    // useMemo untuk menghitung metrik utama.
    const dashboardMetrics = useMemo(() => {
        const totalAnggotaAktif = anggotaList.filter(a => a.status === 'Aktif').length;
        const totalSimpanan = anggotaList.reduce((acc, member) => {
            return acc + (member.simpanan_pokok || 0) + (member.simpanan_wajib || 0) + (member.simpanan_sukarela || 0);
        }, 0);
        const outstandingMurabahah = kontrakList
            .filter(k => k.status === StatusKontrak.BERJALAN)
            .reduce((acc, k) => {
                const sisaHutang = (k.harga_jual - k.uang_muka) - ((k.cicilan_terbayar || 0) * (k.cicilan_per_bulan || 0));
                return acc + Math.max(0, sisaHutang);
            }, 0);
        const npf = kontrakList.filter(k => k.status === StatusKontrak.MACET).length;
        return { totalAnggotaAktif, totalSimpanan, outstandingMurabahah, npf };
    }, [anggotaList, kontrakList]);

    // useMemo untuk menyiapkan 5 kontrak pembiayaan terbaru.
    const recentKontrak = useMemo(() => {
        return [...kontrakList]
            .sort((a, b) => new Date(b.tanggal_akad).getTime() - new Date(a.tanggal_akad).getTime())
            .slice(0, 5);
    }, [kontrakList]);

    // useMemo untuk menyiapkan 5 anggota yang baru bergabung.
    const recentAnggota = useMemo(() => {
        return [...anggotaList]
            .sort((a, b) => new Date(b.tgl_gabung).getTime() - new Date(a.tgl_gabung).getTime())
            .slice(0, 5);
    }, [anggotaList]);

    const kpiData = [
        { title: 'Anggota Aktif', value: loading ? '...' : dashboardMetrics.totalAnggotaAktif.toString(), description: 'Total anggota terdaftar' },
        { title: 'Total Simpanan', value: loading ? '...' : formatCurrency(dashboardMetrics.totalSimpanan), description: 'Pokok, Wajib, & Sukarela' },
        { title: 'Outstanding Murabahah', value: loading ? '...' : formatCurrency(dashboardMetrics.outstandingMurabahah), description: 'Total sisa pembiayaan berjalan' },
        { title: 'Pembiayaan Bermasalah (NPF)', value: loading ? '...' : dashboardMetrics.npf.toString(), description: 'Jumlah kontrak macet' },
    ];

  return (
    <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiData.map(kpi => (
                 <div key={kpi.title} className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
                    <div>
                        <p className="text-sm font-medium text-gray-500">{kpi.title}</p>
                        <p className="text-2xl lg:text-3xl font-bold text-primary mt-1 break-words">
                            {kpi.value}
                        </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">{kpi.description}</p>
                </div>
            ))}
        </div>
        
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card title="Ringkasan Pembiayaan Terbaru">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anggota</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barang</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nilai</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={4} className="text-center p-4">Memuat...</td></tr>
                            ) : recentKontrak.length === 0 ? (
                                <tr><td colSpan={4} className="text-center p-4 text-gray-500">Belum ada data pembiayaan.</td></tr>
                            ) : (
                                recentKontrak.map(k => {
                                    const anggota = anggotaList.find(a => a.id === k.anggota_id);
                                    return (
                                    <tr key={k.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{anggota?.nama || '...'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{k.nama_barang}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 font-medium">{formatCurrency(k.harga_jual)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                k.status === StatusKontrak.BERJALAN ? 'bg-blue-100 text-blue-800' :
                                                k.status === StatusKontrak.LUNAS ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>{k.status}</span>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Card title="Anggota Baru Bergabung">
                 <ul className="divide-y divide-gray-200">
                     {loading ? (
                        <li className="text-center p-4">Memuat...</li>
                     ) : recentAnggota.length === 0 ? (
                        <li className="text-center p-4 text-gray-500">Belum ada anggota baru.</li>
                     ) : (
                        recentAnggota.map(a => (
                            <li key={a.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{a.nama}</p>
                                    <p className="text-sm text-gray-500">Unit: {a.unit}</p>
                                </div>
                                <p className="text-sm font-medium text-gray-600">
                                   {new Date(a.tgl_gabung).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </li>
                        ))
                     )}
                 </ul>
            </Card>
        </div>
    </div>
  );
};

export default Dashboard;





