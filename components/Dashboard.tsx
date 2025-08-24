
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota } from '../types';
import Card from './shared/Card';
import { MOCK_KONTRAK } from '../constants'; // Masih menggunakan data statis untuk ini
import { StatusKontrak } from '../types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

const Dashboard: React.FC = () => {
    const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
    const [loading, setLoading] = useState(true);

    // Mengambil semua data anggota secara real-time
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "anggota"), (snapshot) => {
            const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Anggota[];
            setAnggotaList(members);
            setLoading(false);
        });
        return () => unsubscribe(); // Cleanup listener
    }, []);

    // Menghitung metrik menggunakan useMemo agar lebih efisien
    const dashboardMetrics = useMemo(() => {
        const totalAnggotaAktif = anggotaList.filter(a => a.status === 'Aktif').length;
        
        const totalSimpanan = anggotaList.reduce((acc, member) => {
            return acc + (member.simpanan_pokok || 0) + (member.simpanan_wajib || 0) + (member.simpanan_sukarela || 0);
        }, 0);

        // Metrik lain masih menggunakan data statis untuk saat ini
        const outstandingMurabahah = MOCK_KONTRAK.filter(k => k.status === StatusKontrak.BERJALAN).reduce((acc, k) => {
            return acc + k.harga_jual - k.uang_muka;
        }, 0);
        const npf = MOCK_KONTRAK.filter(k => k.status === StatusKontrak.MACET).length;

        return {
            totalAnggotaAktif,
            totalSimpanan,
            outstandingMurabahah,
            npf
        };
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
                        <p className="text-3xl font-bold text-primary mt-1">{kpi.value}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">{kpi.description}</p>
                </div>
            ))}
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card title="Ringkasan Pembiayaan Terbaru (Data Statis)">
                <div className="overflow-x-auto">
                    {/* ... (bagian ini masih menggunakan MOCK_KONTRAK dan MOCK_ANGGOTA untuk sementara) ... */}
                </div>
            </Card>
            <Card title="Aktivitas Simpanan Terakhir (Data Statis)">
                 <ul className="divide-y divide-gray-200">
                     {/* ... (bagian ini masih menggunakan data statis untuk sementara) ... */}
                 </ul>
            </Card>
        </div>
    </div>
  );
};

export default Dashboard;
