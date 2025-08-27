import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { LaporanArsip, Akun } from '../types';
import { AkunTipe } from '../types';
import Card from './shared/Card';

const formatCurrency = (value: number) => {
    // Menampilkan nilai absolut untuk laporan
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(value));
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubArsip = onSnapshot(collection(db, "laporan_arsip"), (snapshot) => {
            const archives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LaporanArsip));
            archives.sort((a, b) => new Date(b.tanggalDibuat).getTime() - new Date(a.tanggalDibuat).getTime());
            setArsipList(archives);
        });

        const unsubAccounts = onSnapshot(collection(db, "chart_of_accounts"), (snapshot) => {
            setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Akun)));
            setLoading(false); // Loading selesai setelah data akun diterima
        });

        return () => {
            unsubArsip();
            unsubAccounts();
        };
    }, []);

    // --- LOGIKA KALKULASI LAPORAN YANG DIPERBARUI TOTAL ---
    const financialReports = useMemo(() => {
        const accountMap = new Map(accounts.map(acc => [acc.kode, { ...acc, children: [] as Akun[] }]));
        const rootAccounts: Akun[] = [];

        // Membangun struktur pohon (tree) dari daftar akun
        for (const account of accounts) {
            if (account.parent_kode && accountMap.has(account.parent_kode)) {
                accountMap.get(account.parent_kode)?.children.push(account);
            } else {
                rootAccounts.push(account);
            }
        }

        // Fungsi rekursif untuk menghitung total saldo dari anak-anaknya
        const calculateTotal = (account: Akun): number => {
            if (account.children.length === 0) {
                return account.saldo;
            }
            let total = account.saldo; // Mulai dengan saldo sendiri (jika ada)
            for (const child of account.children) {
                total += calculateTotal(child);
            }
            return total;
        };
        
        // Fungsi untuk merender baris laporan secara rekursif
        const renderReportSection = (rootAccountKode: string, indentLevel = 0): JSX.Element[] => {
            const root = accounts.find(a => a.kode === rootAccountKode);
            if (!root) return [];

            const children = accounts.filter(a => a.parent_kode === rootAccountKode).sort((a,b) => a.kode.localeCompare(b.kode));
            
            return children.flatMap(child => [
                <ReportRow key={child.kode} label={child.nama} value={child.saldo} indentLevel={indentLevel + 1} />,
                ...renderReportSection(child.kode, indentLevel + 1)
            ]);
        };

        const totalAset = calculateTotal(accounts.find(a => a.kode === '1-0000') || {} as Akun);
        const totalLiabilitas = calculateTotal(accounts.find(a => a.kode === '2-0000') || {} as Akun);
        const totalEkuitas = calculateTotal(accounts.find(a => a.kode === '3-0000') || {} as Akun);
        const totalPendapatan = calculateTotal(accounts.find(a => a.kode === '4-0000') || {} as Akun);
        const totalBeban = calculateTotal(accounts.find(a => a.kode === '5-0000') || {} as Akun);
        const labaRugi = totalPendapatan + totalBeban; // Karena beban saldo normalnya debit (negatif), kita jumlahkan

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
        // ... (fungsi ini tidak berubah)
    };
    
    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Laporan</h2>
            
            <Card title="Arsip Laporan Autodebet" className="mb-8">
                {/* ... (bagian ini tidak berubah) */}
            </Card>

            <h3 className="text-2xl font-bold text-gray-800 mb-4">Laporan Keuangan Real-time</h3>
            {loading ? <p>Menghitung laporan keuangan...</p> : (
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

