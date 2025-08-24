import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { LaporanArsip, ReportRow } from '../types';
import Card from './shared/Card';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const Reports: React.FC = () => {
    const [arsipList, setArsipList] = useState<LaporanArsip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "laporan_arsip"), (snapshot) => {
            const archives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LaporanArsip));
            archives.sort((a, b) => new Date(b.tanggalDibuat).getTime() - new Date(a.tanggalDibuat).getTime());
            setArsipList(archives);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const exportToCsv = (laporan: LaporanArsip) => {
        const headers = ['NIP', 'Nama Anggota', 'Simpanan Wajib', 'Cicilan Murabahah', 'Total Potongan'];
        const csvRows = [
            headers.join(','),
            ...laporan.dataLaporan.map(row => 
                [row.nip, `"${row.nama}"`, row.simpananWajib, row.cicilanMurabahah, row.totalPotongan].join(',')
            )
        ];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const fileName = `${laporan.namaLaporan.replace(/ /g, '_')}.csv`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Laporan</h2>
            
            <Card title="Arsip Laporan Autodebet">
                <div className="p-6">
                    {loading ? <p>Memuat arsip...</p> : (
                        <ul className="divide-y divide-gray-200">
                            {arsipList.map(arsip => (
                                <li key={arsip.id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{arsip.namaLaporan}</p>
                                        <p className="text-xs text-gray-500">
                                            Dibuat pada: {new Date(arsip.tanggalDibuat).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                    <button onClick={() => exportToCsv(arsip)} className="text-sm font-medium text-primary hover:underline">
                                        Unduh CSV
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {!loading && arsipList.length === 0 && <p className="text-sm text-gray-500">Belum ada laporan yang diarsipkan.</p>}
                </div>
            </Card>
        </div>
    );
};

export default Reports;


