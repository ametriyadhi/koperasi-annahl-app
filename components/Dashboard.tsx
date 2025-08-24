import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota } from '../types';
import Card from './shared/Card';
import { MOCK_KONTRAK, MOCK_ANGGOTA } from '../constants'; // Membutuhkan MOCK_ANGGOTA untuk bagian statis
import { StatusKontrak } from '../types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

const Dashboard: React.FC = () => {
    const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "anggota"), (snapshot) => {
            const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Anggota[];
            setAnggotaList(members);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const dashboardMetrics = useMemo(() => {
        const totalAnggotaAktif = anggotaList.filter(a => a.status === 'Aktif').length;
        const totalSimpanan = anggotaList.reduce((acc, member) => {
            return acc + (member.simpanan_pokok || 0) + (member.simpanan_wajib || 0) + (member.simpanan_sukarela || 0);
        }, 0);
        const outstandingMurabahah = MOCK_KONTRAK.filter(k => k.status === StatusKontrak.BERJALAN).reduce((acc, k) => {
            return acc + k.harga_jual - k.uang_muka;
        }, 0);
        const npf = MOCK_KONTRAK.filter(k => k.status === StatusKontrak.MACET).length;
        return { totalAnggotaAktif, totalSimpanan, outstandingMurabahah, npf };
    }, [anggotaList]);

    const kpiData = [
        { title: 'Anggota Aktif', value: loading ? '...' : dashboardMetrics.totalAnggotaAktif.toString(), description: 'Total anggota terdaftar' },
        { title: 'Total Simpanan', value: loading ? '...' : formatCurrency(dashboardMetrics.totalSimpanan), description: 'Pokok, Wajib, & Sukarela' },
        { title: 'Outstanding Murabahah', value: formatCurrency(dashboardMetrics.outstandingMurabahah), description: 'Total pembiayaan berjalan (data statis)' },
        { title: 'Pembiayaan Bermasalah (NPF)', value: dashboardMetrics.npf.toString(), description: 'Kontrak macet (data statis)' },
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
            <Card title="Ringkasan Pembiayaan Terbaru (Data Statis)">
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
                            {MOCK_KONTRAK.slice(0, 5).map(k => {
                                const anggota = MOCK_ANGGOTA.find(a => a.id === k.anggota_id);
                                return (
                                <tr key={k.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{anggota?.nama}</td>
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
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Card title="Aktivitas Simpanan Terakhir (Data Statis)">
                 <ul className="divide-y divide-gray-200">
                     {MOCK_ANGGOTA.slice(0,5).map(a => (
                         <li key={a.id} className="py-3 flex justify-between items-center">
                             <div>
                                 <p className="text-sm font-medium text-gray-900">{a.nama}</p>
                                 <p className="text-sm text-gray-500">Setoran Wajib - {new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</p>
                             </div>
                             <p className="text-sm font-medium text-green-600">+ {formatCurrency(100000)}</p>
                         </li>
                     ))}
                 </ul>
            </Card>
        </div>
    </div>
  );
};

export default Dashboard;


