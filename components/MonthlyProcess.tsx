import React, { useState } from 'react';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah, ReportRow } from '../types';
import { StatusKontrak, JenisSimpanan } from '../types';
import Card from './shared/Card';

const MonthlyProcess: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastReport, setLastReport] = useState<ReportRow[] | null>(null);
  const [reportDate, setReportDate] = useState<Date | null>(null);

  const processAndGenerate = async () => {
    if (!confirm("Apakah Anda yakin ingin menjalankan proses autodebet untuk bulan ini? Aksi ini akan mengubah data simpanan dan cicilan secara permanen.")) {
      return;
    }

    setIsLoading(true);
    setLastReport(null);

    const batch = writeBatch(db);

    try {
      // 1. Ambil semua anggota aktif
      const anggotaQuery = query(collection(db, "anggota"), where("status", "==", "Aktif"));
      const anggotaSnapshot = await getDocs(anggotaQuery);
      const anggotaAktif = anggotaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anggota));

      // 2. Ambil semua kontrak murabahah yang sedang berjalan
      const kontrakQuery = query(collection(db, "kontrak_murabahah"), where("status", "==", StatusKontrak.BERJALAN));
      const kontrakSnapshot = await getDocs(kontrakQuery);
      const kontrakBerjalan = kontrakSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KontrakMurabahah));
      
      const kontrakMap = new Map<string, KontrakMurabahah>();
      kontrakBerjalan.forEach(k => kontrakMap.set(k.anggota_id, k));

      const reportData: ReportRow[] = [];
      const currentDate = new Date();
      const keteranganSimpanan = `Setoran Wajib Autodebet - ${currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`;
      const keteranganCicilan = `Pembayaran Cicilan Autodebet - ${currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`;

      // 3. Proses setiap anggota
      for (const anggota of anggotaAktif) {
        const simpananWajib = 50000;
        const kontrak = kontrakMap.get(anggota.id);
        const cicilanMurabahah = kontrak?.cicilan_per_bulan || 0;

        // Update saldo simpanan wajib
        const anggotaRef = doc(db, "anggota", anggota.id);
        batch.update(anggotaRef, { simpanan_wajib: (anggota.simpanan_wajib || 0) + simpananWajib });

        // Catat transaksi simpanan wajib
        const simpananTransaksiRef = doc(collection(db, "anggota", anggota.id, "transaksi"));
        batch.set(simpananTransaksiRef, {
            anggota_id: anggota.id,
            jenis: JenisSimpanan.WAJIB,
            tanggal: currentDate.toISOString(),
            tipe: 'Setor',
            jumlah: simpananWajib,
            keterangan: keteranganSimpanan,
        });

        // Proses cicilan jika ada
        if (kontrak) {
            const kontrakRef = doc(db, "kontrak_murabahah", kontrak.id);
            const cicilanTerbayarBaru = (kontrak.cicilan_terbayar || 0) + 1;
            const statusBaru = cicilanTerbayarBaru >= kontrak.tenor ? StatusKontrak.LUNAS : kontrak.status;
            batch.update(kontrakRef, { 
                cicilan_terbayar: cicilanTerbayarBaru,
                status: statusBaru 
            });
            // Di aplikasi nyata, kita juga akan mencatat transaksi pembayaran cicilan
        }
        
        reportData.push({
          nip: anggota.nip,
          nama: anggota.nama,
          simpananWajib,
          cicilanMurabahah,
          totalPotongan: simpananWajib + cicilanMurabahah,
        });
      }

      // 4. Simpan laporan sebagai arsip di Firestore
      const arsipRef = doc(collection(db, "laporan_arsip"));
      batch.set(arsipRef, {
        namaLaporan: `Laporan Autodebet - ${currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`,
        tanggalDibuat: currentDate.toISOString(),
        dataLaporan: reportData,
      });

      // 5. Jalankan semua operasi
      await batch.commit();

      setLastReport(reportData);
      setReportDate(currentDate);
      alert("Proses autodebet bulanan berhasil diselesaikan!");

    } catch (error) {
      console.error("Gagal menjalankan proses bulanan: ", error);
      alert("Terjadi kesalahan saat memproses data.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Proses Autodebet Bulanan">
        <div className="p-6 space-y-6">
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                <h4 className="font-bold">Peringatan!</h4>
                <p className="text-sm">Aksi ini akan memproses semua setoran wajib (Rp 50.000) dan cicilan murabahah untuk semua anggota aktif. Proses ini bersifat permanen dan tidak dapat diurungkan. Pastikan Anda menjalankan ini hanya **satu kali per bulan**.</p>
            </div>
            <div className="text-center">
                <button onClick={processAndGenerate} disabled={isLoading} className="px-8 py-3 bg-secondary text-white font-bold rounded-lg hover:bg-orange-600 disabled:bg-gray-400 shadow-lg">
                    {isLoading ? 'Sedang Memproses...' : 'Jalankan Proses Autodebet'}
                </button>
            </div>
            {lastReport && (
                <div>
                    <h3 className="text-lg font-semibold">Hasil Proses pada {reportDate?.toLocaleString('id-ID')}</h3>
                    <p className="text-sm text-gray-600">Laporan berikut telah dibuat dan diarsipkan. Anda dapat mengunduhnya di menu Laporan.</p>
                    {/* Di sini bisa ditambahkan pratinjau singkat jika perlu */}
                </div>
            )}
        </div>
    </Card>
  );
};

export default MonthlyProcess;

