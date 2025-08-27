import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { LaporanArsip, Akun } from '../types';
import { AkunTipe } from '../types';
import Card from './shared/Card';

const formatCurrency = (value: number) => {
    // Menampilkan nilai absolut untuk laporan, menangani nilai NaN atau undefined
    const numValue = value || 0;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(numValue));
};

const ReportRow: React.FC<{ label: string, value: number, isTotal?: boolean, indentLevel?: number }> = ({ label, value, isTotal = false, indentLevel = 0 }) => (
    <div className={`flex justify-between py-2 ${isTotal ? 'font-bold border-t mt-2 pt-2' : ''}`} style={{ paddingLeft: `${indentLevel * 16}px` }}>
        <p className={`text-sm ${isTotal ? 'text-gray-800' : 'text-gray-600'}`}>{label}</p>
        <p className={`text-sm font-medium ${isTotal ? 'text-gray-900' : 'text-gray-700'}`}>{formatCurrency(value)}</p>
    </div>
);

const Reports: React.FC = () => {
    const [arsipList, setArsipList] = useState<LaporanArsip[]>([]);
    const [accounts, setAccounts] = useState<Akun[]>([]);
    const [loading, setLoading] = useState({ arsip: true, accounts: true });

    useEffect(() => {
        const unsubArsip = onSnapshot(collection(db, "laporan_arsip"), (snapshot) => {
            const archives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LaporanArsip));
            archives.sort((a, b) => new Date(b.tanggalDibuat).getTime() - new Date(a.tanggalDibuat).getTime());
            setArsipList(archives);
            setLoading(prev => ({ ...prev, arsip: false }));
        });

        const unsubAccounts = onSnapshot(collection(db, "chart_of_accounts"), (snapshot) => {
            setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Akun)));
            setLoading(prev => ({ ...prev, accounts: false }));
        });

        return () => {
            unsubArsip();
            unsubAccounts();
        };
    }, []);

    const financialReports = useMemo(() => {
        // Pengaman jika data akun belum ada
        if (accounts.length === 0) {
            return {
                asetItems: [], liabilitasItems: [], ekuitasItems: [], pendapatanItems: [], bebanItems: [],
                totalAset: 0, totalLiabilitas: 0, totalEkuitas: 0, totalPendapatan: 0, totalBeban: 0, labaRugi: 0
            };
        }

        const accountMap = new Map(accounts.map(acc => [acc.kode, { ...acc, children: [] as Akun[] }]));

        for (const account of accounts) {
            if (account.parent_kode && accountMap.has(account.parent_kode)) {
                accountMap.get(account.parent_kode)?.children.push(account);
            }
        }

        const calculateTotal = (account?: Akun): number => {
            if (!account) {
                return 0;
            }
            // Jika tidak punya anak, kembalikan saldo sendiri
            if (!account.children || account.children.length === 0) {
                return account.saldo || 0;
            }
            // Jika punya anak, jumlahkan saldo semua anak
            let total = 0; // Saldo akun induk tidak dihitung, hanya sebagai kategori
            for (const child of account.children) {
                total += calculateTotal(child);
            }
            return total;
        };
        
        const renderReportSection = (rootAccountKode: string, indentLevel = 0): JSX.Element[] => {
            const children = accounts.filter(a => a.parent_kode === rootAccountKode).sort((a,b) => a.kode.localeCompare(b.kode));
            
            return children.flatMap(child => [
                <ReportRow key={child.kode} label={child.nama} value={child.saldo} indentLevel={indentLevel + 1} />,
                ...renderReportSection(child.kode, indentLevel + 1)
            ]);
        };

        const totalAset = calculateTotal(accounts.find(a => a.kode === '1-0000'));
        const totalLiabilitas = calculateTotal(accounts.find(a => a.kode === '2-0000'));
        const totalEkuitas = calculateTotal(accounts.find(a => a.kode === '3-0000'));
        const totalPendapatan = calculateTotal(accounts.find(a => a.kode === '4-0000'));
        const totalBeban = calculateTotal(accounts.find(a => a.kode === '5-0000'));
        const labaRugi = totalPendapatan + totalBeban;

        return {
            asetItems: renderReportSection('1-0000'),
            liabilitasItems: renderReportSection('2-0000'),
            ekuitasItems: renderReportSection('3-0000'),
            pendapatanItems: renderReportSection('4-0000'),
            bebanItems: renderReportSection('5-0000'),
            totalAset,
            totalLiabilitas,
            totalEkuitas,
            totalPendapatan,
            totalBeban,
            labaRugi
        };

    }, [accounts]);


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
            
            <Card title="Arsip Laporan Autodebet" className="mb-8">
                <div className="p-6">
                    {loading.arsip ? <p>Memuat arsip...</p> : (
                        arsipList.length === 0 ? (
                            <p className="text-sm text-gray-500">Belum ada laporan yang diarsipkan.</p>
                        ) : (
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
                        )
                    )}
                </div>
            </Card>

            <h3 className="text-2xl font-bold text-gray-800 mb-4">Laporan Keuangan Real-time</h3>
            {loading.accounts ? <p>Menghitung laporan keuangan...</p> : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card title="Neraca (Balance Sheet)">
                        <div className="p-6 space-y-4">
                            <div>
                                <h4 className="font-semibold text-md text-gray-800 mb-2">Aset</h4>
                                {financialReports.asetItems}
                                <ReportRow label="Total Aset" value={financialReports.totalAset} isTotal />
                            </div>
                            <div>
                                <h4 className="font-semibold text-md text-gray-800 mb-2 mt-4">Liabilitas & Ekuitas</h4>
                                {financialReports.liabilitasItems}
                                {financialReports.ekuitasItems}
                                <ReportRow label="Total Liabilitas & Ekuitas" value={financialReports.totalLiabilitas + financialReports.totalEkuitas} isTotal />
                            </div>
                        </div>
                    </Card>

                    <Card title="Laporan Laba Rugi (Income Statement)">
                        <div className="p-6 space-y-4">
                            <div>
                                <h4 className="font-semibold text-md text-gray-800 mb-2">Pendapatan</h4>
                                {financialReports.pendapatanItems}
                                <ReportRow label="Total Pendapatan" value={financialReports.totalPendapatan} isTotal />
                            </div>
                            <div>
                                <h4 className="font-semibold text-md text-gray-800 mb-2 mt-4">Beban</h4>
                                {financialReports.bebanItems}
                                <ReportRow label="Total Beban" value={financialReports.totalBeban} isTotal />
                            </div>
                            <div>
                                <ReportRow label="Sisa Hasil Usaha (SHU)" value={financialReports.labaRugi} isTotal />
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Reports;



