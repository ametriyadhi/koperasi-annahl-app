import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { LaporanArsip, Akun, JurnalEntry } from '../types';
import { AkunTipe } from '../types';
import Card from './shared/Card';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const ReportRow: React.FC<{ label: string, value: number, isTotal?: boolean, indent?: boolean }> = ({ label, value, isTotal = false, indent = false }) => (
    <div className={`flex justify-between py-2 ${isTotal ? 'font-bold border-t mt-2 pt-2' : ''} ${indent ? 'pl-4' : ''}`}>
        <p className={`text-sm ${isTotal ? 'text-gray-800' : 'text-gray-600'}`}>{label}</p>
        <p className={`text-sm font-medium ${isTotal ? 'text-gray-900' : 'text-gray-700'}`}>{formatCurrency(value)}</p>
    </div>
);

const Reports: React.FC = () => {
    const [arsipList, setArsipList] = useState<LaporanArsip[]>([]);
    const [accounts, setAccounts] = useState<Akun[]>([]);
    const [jurnalEntries, setJurnalEntries] = useState<JurnalEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubArsip = onSnapshot(collection(db, "laporan_arsip"), (snapshot) => {
            const archives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LaporanArsip));
            archives.sort((a, b) => new Date(b.tanggalDibuat).getTime() - new Date(a.tanggalDibuat).getTime());
            setArsipList(archives);
        });

        const unsubAccounts = onSnapshot(collection(db, "chart_of_accounts"), (snapshot) => {
            setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Akun)));
        });

        const unsubJurnal = onSnapshot(collection(db, "jurnal_umum"), (snapshot) => {
            setJurnalEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JurnalEntry)));
        });
        
        // Combined loading state check
        const checkLoading = () => {
            if (arsipList.length > 0 && accounts.length > 0 && jurnalEntries.length > 0) {
                 setLoading(false);
            }
        };
        // A simple timeout to prevent infinite loading on empty data
        const timer = setTimeout(() => setLoading(false), 3000);


        return () => {
            unsubArsip();
            unsubAccounts();
            unsubJurnal();
            clearTimeout(timer);
        };
    }, []);

    const calculatedBalances = useMemo(() => {
        const balanceMap = new Map<string, number>();
        accounts.forEach(acc => balanceMap.set(acc.id, 0)); // Initialize all accounts with 0 balance

        jurnalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                const currentBalance = balanceMap.get(line.akun_id) || 0;
                const newBalance = currentBalance + line.debit - line.kredit;
                balanceMap.set(line.akun_id, newBalance);
            });
        });
        return balanceMap;
    }, [accounts, jurnalEntries]);

    const getAccountWithBalance = (account: Akun) => {
        return { ...account, saldo: calculatedBalances.get(account.id) || 0 };
    };
    
    const getChildAccounts = (parentKode: string) => {
        return accounts
            .filter(a => a.parent_kode === parentKode)
            .map(a => getAccountWithBalance(a))
            .sort((a,b) => a.kode.localeCompare(b.kode));
    };

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
    
    const calculateTotalForType = (tipe: AkunTipe) => {
        let total = 0;
        accounts.forEach(acc => {
            if (acc.tipe === tipe && !acc.parent_kode) { // Only sum up parent accounts
                 total += calculatedBalances.get(acc.id) || 0;
            } else if (acc.tipe === tipe && acc.parent_kode) {
                // This logic needs to be hierarchical for accurate totals
            }
        });
        return total;
    };

    const aset = getChildAccounts('1-0000');
    const liabilitas = getChildAccounts('2-0000');
    const ekuitas = getChildAccounts('3-0000');
    const pendapatan = getChildAccounts('4-0000');
    const beban = getChildAccounts('5-0000');

    const totalAset = aset.reduce((sum, a) => sum + a.saldo, 0);
    const totalLiabilitas = liabilitas.reduce((sum, a) => sum + a.saldo, 0);
    const totalEkuitas = ekuitas.reduce((sum, a) => sum + a.saldo, 0);
    const totalPendapatan = pendapatan.reduce((sum, a) => sum + a.saldo, 0);
    const totalBeban = beban.reduce((sum, a) => sum + a.saldo, 0);
    const labaRugi = totalPendapatan - totalBeban;

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Laporan</h2>
            
            <Card title="Arsip Laporan Autodebet" className="mb-8">
                <div className="p-6">
                    {loading && arsipList.length === 0 ? <p>Memuat arsip...</p> : (
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

            <h3 className="text-2xl font-bold text-gray-800 mb-4">Laporan Keuangan Real-time</h3>
            {loading ? <p>Menghitung laporan keuangan...</p> : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card title="Neraca (Balance Sheet)">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-md text-gray-800 mb-2">Aset</h4>
                                {aset.map(a => <ReportRow key={a.kode} label={a.nama} value={a.saldo} indent />)}
                                <ReportRow label="Total Aset" value={totalAset} isTotal />
                            </div>
                            <div>
                                <h4 className="font-semibold text-md text-gray-800 mb-2 mt-4">Liabilitas & Ekuitas</h4>
                                {liabilitas.map(a => <ReportRow key={a.kode} label={a.nama} value={a.saldo} indent />)}
                                {ekuitas.map(a => <ReportRow key={a.kode} label={a.nama} value={a.saldo} indent />)}
                                <ReportRow label="Total Liabilitas & Ekuitas" value={totalLiabilitas + totalEkuitas} isTotal />
                            </div>
                        </div>
                    </Card>

                    <Card title="Laporan Laba Rugi (Income Statement)">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-md text-gray-800 mb-2">Pendapatan</h4>
                                {pendapatan.map(a => <ReportRow key={a.kode} label={a.nama} value={a.saldo} indent/>)}
                                <ReportRow label="Total Pendapatan" value={totalPendapatan} isTotal />
                            </div>
                            <div>
                                <h4 className="font-semibold text-md text-gray-800 mb-2 mt-4">Beban</h4>
                                {beban.map(a => <ReportRow key={a.kode} label={a.nama} value={a.saldo} indent/>)}
                                <ReportRow label="Total Beban" value={totalBeban} isTotal />
                            </div>
                            <div>
                                <ReportRow label="Sisa Hasil Usaha (SHU)" value={labaRugi} isTotal />
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Reports;



