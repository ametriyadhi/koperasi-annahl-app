import React, { useState } from 'react';
import { collection, getDocs, query, where, writeBatch, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah, ReportRow, LaporanArsip, TransaksiSimpanan, TransaksiMurabahah } from '../types';
import { StatusKontrak, JenisSimpanan, Unit } from '../types';
import Card from './shared/Card';
import Papa from 'papaparse';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

// Interface baru untuk data yang akan diproses dan di-generate
interface ProcessedData {
    anggota: Anggota;
    kontrakList: KontrakMurabahah[];
    simpananWajib: number;
    totalCicilanPokok: number;
    totalCicilanMargin: number;
    totalPotongan: number;
}

const MonthlyProcess: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [processedData, setProcessedData] = useState<ProcessedData[] | null>(null);

    const generateReportData = async () => {
        setIsLoading(true);
        setProcessedData(null);
        try {
            // Tahap 1: Baca Semua Data
            const anggotaQuery = query(collection(db, "anggota"), where("status", "==", "Aktif"));
            const kontrakQuery = query(collection(db, "kontrak_murabahah"), where("status", "==", StatusKontrak.BERJALAN));
            
            const [anggotaSnapshot, kontrakSnapshot] = await Promise.all([
                getDocs(anggotaQuery),
                getDocs(kontrakQuery)
            ]);

            const anggotaAktif = anggotaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anggota));
            const kontrakBerjalan = kontrakSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KontrakMurabahah));

            const kontrakMap = new Map<string, KontrakMurabahah[]>();
            kontrakBerjalan.forEach(k => {
                const list = kontrakMap.get(k.anggota_id) || [];
                list.push(k);
                kontrakMap.set(k.anggota_id, list);
            });

            // Tahap 2: Proses Data
            const allProcessedData = anggotaAktif.map(anggota => {
                const simpananWajib = settings.simpanan_wajib || 50000;
                const kontrakList = kontrakMap.get(anggota.id) || [];
                
                let totalCicilanPokok = 0;
                let totalCicilanMargin = 0;

                kontrakList.forEach(k => {
                    const angsuranPokok = (k.harga_pokok - k.uang_muka) / k.tenor;
                    const angsuranMargin = k.margin / k.tenor;
                    totalCicilanPokok += angsuranPokok;
                    totalCicilanMargin += angsuranMargin;
                });
                
                const totalPotongan = simpananWajib + totalCicilanPokok + totalCicilanMargin;

                return {
                    anggota,
                    kontrakList,
                    simpananWajib,
                    totalCicilanPokok,
                    totalCicilanMargin,
                    totalPotongan,
                };
            });
            
            // Urutkan berdasarkan unit
            const unitOrder: Unit[] = [Unit.PGTK, Unit.SD, Unit.SMP, Unit.SMA, Unit.Supporting, Unit.Manajemen];
            allProcessedData.sort((a, b) => {
                const unitComparison = unitOrder.indexOf(a.anggota.unit) - unitOrder.indexOf(b.anggota.unit);
                if (unitComparison !== 0) return unitComparison;
                return a.anggota.nama.localeCompare(b.anggota.nama);
            });

            setProcessedData(allProcessedData);
            downloadCsv(allProcessedData);

        } catch (error) {
            console.error("Gagal membuat laporan: ", error);
            alert("Terjadi kesalahan saat membuat laporan.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const downloadCsv = (data: ProcessedData[]) => {
        const csvRows: any[] = [];
        const headers = ["Nama", "Unit", "Simpanan Wajib", "Angsuran Ke", "Cicilan Pokok", "Cicilan Margin", "Total"];
        csvRows.push(headers);

        let totalSimpananWajib = 0;
        let totalPokokMurabahah = 0;
        let totalMarginMurabahah = 0;

        data.forEach(item => {
            totalSimpananWajib += item.simpananWajib;
            totalPokokMurabahah += item.totalCicilanPokok;
            totalMarginMurabahah += item.totalCicilanMargin;
            
            if (item.kontrakList.length === 0) {
                 csvRows.push([
                    item.anggota.nama,
                    item.anggota.unit,
                    item.simpananWajib,
                    '', '', '',
                    item.simpananWajib
                ]);
            } else {
                item.kontrakList.forEach((k, index) => {
                    const angsuranPokok = (k.harga_pokok - k.uang_muka) / k.tenor;
                    const angsuranMargin = k.margin / k.tenor;
                    csvRows.push([
                        index === 0 ? item.anggota.nama : `  ↳ ${k.nama_barang}`,
                        index === 0 ? item.anggota.unit : '',
                        index === 0 ? item.simpananWajib : '',
                        k.cicilan_terbayar + 1,
                        Math.round(angsuranPokok),
                        Math.round(angsuranMargin),
                        Math.round(item.simpananWajib + item.totalCicilanPokok + item.totalCicilanMargin)
                    ]);
                });
            }
        });

        // Baris Total
        csvRows.push([]); // Baris kosong
        csvRows.push([
            "TOTAL", "",
            Math.round(totalSimpananWajib),
            "",
            Math.round(totalPokokMurabahah),
            Math.round(totalMarginMurabahah),
            Math.round(totalSimpananWajib + totalPokokMurabahah + totalMarginMurabahah)
        ]);

        const csvString = Papa.unparse(csvRows);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const fileName = `Laporan_Autodebet_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const executeProcess = async () => {
        if (!processedData) {
            alert("Buat laporan terlebih dahulu sebelum menjalankan proses.");
            return;
        }
        if (!confirm("Apakah Anda yakin ingin menjalankan proses bulanan? Aksi ini akan mengubah data simpanan dan cicilan secara permanen dan tidak dapat diurungkan.")) {
            return;
        }

        setIsLoading(true);
        const batch = writeBatch(db);
        const currentDate = new Date();
        const keteranganSimpanan = `Setoran Wajib Autodebet - ${currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`;

        try {
            for (const item of processedData) {
                const anggotaRef = doc(db, "anggota", item.anggota.id);
                batch.update(anggotaRef, {
                    simpanan_wajib: (item.anggota.simpanan_wajib || 0) + item.simpananWajib
                });

                const simpananTransaksiRef = doc(collection(db, "anggota", item.anggota.id, "transaksi"));
                batch.set(simpananTransaksiRef, {
                    anggota_id: item.anggota.id,
                    jenis: JenisSimpanan.WAJIB,
                    tanggal: currentDate.toISOString(),
                    tipe: 'Setor',
                    jumlah: item.simpananWajib,
                    keterangan: keteranganSimpanan,
                } as Omit<TransaksiSimpanan, 'id'>);

                for (const kontrak of item.kontrakList) {
                    const kontrakRef = doc(db, "kontrak_murabahah", kontrak.id);
                    const cicilanTerbayarBaru = kontrak.cicilan_terbayar + 1;
                    const statusBaru = cicilanTerbayarBaru >= kontrak.tenor ? StatusKontrak.LUNAS : kontrak.status;

                    batch.update(kontrakRef, {
                        cicilan_terbayar: cicilanTerbayarBaru,
                        status: statusBaru
                    });
                    
                    // --- PERBAIKAN DI SINI ---
                    const murabahahTransaksiRef = doc(collection(db, "kontrak_murabahah", kontrak.id, "transaksi"));
                    batch.set(murabahahTransaksiRef, {
                        tanggal: currentDate.toISOString(),
                        jumlah: kontrak.cicilan_per_bulan, // Memastikan jumlah cicilan tercatat
                        keterangan: `Angsuran ke-${cicilanTerbayarBaru} (${kontrak.nama_barang})`,
                    } as Omit<TransaksiMurabahah, 'id'>);
                }
            }

            // Arsipkan laporan
            const arsipRef = doc(collection(db, "laporan_arsip"));
            const reportForArchive: Omit<LaporanArsip, 'id'> = {
                namaLaporan: `Laporan Autodebet - ${currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`,
                tanggalDibuat: currentDate.toISOString(),
                dataLaporan: processedData.flatMap(p => 
                    p.kontrakList.length > 0
                    ? p.kontrakList.map(k => ({
                        nip: p.anggota.nip,
                        nama: p.anggota.nama,
                        simpananWajib: p.simpananWajib,
                        cicilanMurabahah: k.cicilan_per_bulan,
                        totalPotongan: p.simpananWajib + k.cicilan_per_bulan
                    }))
                    : [{
                        nip: p.anggota.nip,
                        nama: p.anggota.nama,
                        simpananWajib: p.simpananWajib,
                        cicilanMurabahah: 0,
                        totalPotongan: p.simpananWajib
                    }]
                )
            };
            batch.set(arsipRef, reportForArchive);

            await batch.commit();
            alert("Proses bulanan berhasil diselesaikan dan laporan telah diarsipkan.");
            setProcessedData(null); // Reset setelah berhasil

        } catch (error) {
            console.error("Gagal menjalankan proses bulanan: ", error);
            alert("Terjadi kesalahan saat menjalankan proses bulanan.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card title="Proses Autodebet Bulanan & Pembuatan Laporan">
            <div className="p-6 space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <h4 className="font-semibold">Alur Proses Bulanan</h4>
                    <p className="text-sm text-gray-600">
                        <strong>Langkah 1:</strong> Klik tombol "Buat & Unduh Laporan CSV" untuk melihat pratinjau data yang akan diproses dan mengunduh filenya. Langkah ini aman dan tidak akan mengubah data.
                    </p>
                    <p className="text-sm text-gray-600">
                        <strong>Langkah 2:</strong> Setelah laporan dibuat, tombol "Konfirmasi & Jalankan Proses" akan aktif. Klik tombol ini untuk memproses data secara permanen (menambah simpanan, angsuran, dan mengarsipkan laporan).
                    </p>
                </div>

                <div className="flex justify-center space-x-4">
                    <button onClick={generateReportData} disabled={isLoading} className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-lime-600 disabled:bg-gray-400 shadow-lg">
                        {isLoading ? 'Membuat...' : 'Buat & Unduh Laporan CSV'}
                    </button>
                    <button onClick={executeProcess} disabled={isLoading || !processedData} className="px-6 py-3 bg-secondary text-white font-bold rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg">
                        {isLoading ? 'Memproses...' : 'Konfirmasi & Jalankan Proses'}
                    </button>
                </div>

                 {processedData && (
                    <div className="p-4 bg-green-50 text-green-800 rounded-lg text-center">
                        <p className="font-semibold">Laporan berhasil dibuat!</p>
                        <p className="text-sm">Silakan periksa file CSV yang terunduh. Jika sudah sesuai, klik "Konfirmasi & Jalankan Proses".</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default MonthlyProcess;









