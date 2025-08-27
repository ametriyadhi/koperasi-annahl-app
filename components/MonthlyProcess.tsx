import React, { useState } from 'react';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp, runTransaction, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah, ReportRow, Akun, JurnalEntryLine } from '../types';
import { StatusKontrak, JenisSimpanan } from '../types';
import Card from './shared/Card';

// --- BARU: Definisikan kode akun yang akan digunakan untuk jurnal otomatis ---
// PENTING: Pastikan kode-kode ini sesuai dengan yang ada di Bagan Akun Anda.
const KODE_AKUN_AUTODEBET = {
    PIUTANG_SEKOLAH: '1-1300', // Debit: Total potongan gaji
    SIMPANAN_WAJIB: '3-2000', // Kredit: Total simpanan wajib
    PIUTANG_MURABAHAH: '1-1200', // Kredit: Total pembayaran pokok murabahah
    PENDAPATAN_MARGIN: '4-1000', // Kredit: Total pembayaran margin murabahah
};


const MonthlyProcess: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastReport, setLastReport] = useState<ReportRow[] | null>(null);
  const [reportDate, setReportDate] = useState<Date | null>(null);

  const processAndGenerate = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menjalankan proses autodebet bulan ini? Aksi ini akan mengubah data simpanan, cicilan, dan membuat JURNAL OTOMATIS secara permanen.")) {
      return;
    }

    setIsLoading(true);
    setLastReport(null);

    try {
        await runTransaction(db, async (transaction) => {
            // --- TAHAP 1: BACA SEMUA DATA YANG DIPERLUKAN ---
            const anggotaQuery = query(collection(db, "anggota"), where("status", "==", "Aktif"));
            const anggotaSnapshot = await transaction.get(anggotaQuery);
            const anggotaAktif = anggotaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anggota));

            const kontrakQuery = query(collection(db, "kontrak_murabahah"), where("status", "==", StatusKontrak.BERJALAN));
            const kontrakSnapshot = await transaction.get(kontrakQuery);
            const kontrakBerjalan = kontrakSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KontrakMurabahah));
            const kontrakMap = new Map<string, KontrakMurabahah>(kontrakBerjalan.map(k => [k.anggota_id, k]));

            // Ambil data akun dari CoA untuk membuat jurnal
            const akunRefs = Object.values(KODE_AKUN_AUTODEBET).map(kode => query(collection(db, "chart_of_accounts"), where("kode", "==", kode)));
            const akunSnapshots = await Promise.all(akunRefs.map(q => getDocs(q)));
            const akunMap = new Map<string, Akun>();
            akunSnapshots.forEach(snapshot => {
                if (!snapshot.empty) {
                    const akun = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Akun;
                    akunMap.set(akun.kode, akun);
                }
            });
            
            // Validasi apakah semua akun yang dibutuhkan ada
            for (const kode of Object.values(KODE_AKUN_AUTODEBET)) {
                if (!akunMap.has(kode)) throw new Error(`Akun dengan kode ${kode} tidak ditemukan di Bagan Akun. Proses dibatalkan.`);
            }

            // --- TAHAP 2: PROSES DATA & AKUMULASI TOTAL ---
            const reportData: ReportRow[] = [];
            const currentDate = new Date();
            const bulanTahun = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            
            let totalSimpananWajib = 0;
            let totalCicilanPokok = 0;
            let totalCicilanMargin = 0;

            for (const anggota of anggotaAktif) {
                const simpananWajib = 50000; // Sebaiknya diambil dari settings
                const kontrak = kontrakMap.get(anggota.id);
                
                // Update saldo simpanan wajib anggota
                const anggotaRef = doc(db, "anggota", anggota.id);
                transaction.update(anggotaRef, { simpanan_wajib: (anggota.simpanan_wajib || 0) + simpananWajib });
                totalSimpananWajib += simpananWajib;

                // Proses cicilan jika ada
                let cicilanMurabahah = 0;
                if (kontrak) {
                    cicilanMurabahah = kontrak.cicilan_per_bulan;
                    const angsuranPokok = (kontrak.harga_pokok / kontrak.tenor);
                    const angsuranMargin = (kontrak.margin / kontrak.tenor);
                    totalCicilanPokok += angsuranPokok;
                    totalCicilanMargin += angsuranMargin;

                    const kontrakRef = doc(db, "kontrak_murabahah", kontrak.id);
                    const cicilanTerbayarBaru = (kontrak.cicilan_terbayar || 0) + 1;
                    const statusBaru = cicilanTerbayarBaru >= kontrak.tenor ? StatusKontrak.LUNAS : kontrak.status;
                    transaction.update(kontrakRef, { cicilan_terbayar: cicilanTerbayarBaru, status: statusBaru });
                }
                
                reportData.push({
                  nip: anggota.nip,
                  nama: anggota.nama,
                  simpananWajib,
                  cicilanMurabahah,
                  totalPotongan: simpananWajib + cicilanMurabahah,
                });
            }

            // --- TAHAP 3: MEMBUAT JURNAL OTOMATIS & ARSIP ---
            const totalPotonganGaji = totalSimpananWajib + totalCicilanPokok + totalCicilanMargin;
            const jurnalLines: JurnalEntryLine[] = [
                // DEBIT
                {
                    akun_id: akunMap.get(KODE_AKUN_AUTODEBET.PIUTANG_SEKOLAH)!.id,
                    akun_kode: KODE_AKUN_AUTODEBET.PIUTANG_SEKOLAH,
                    akun_nama: akunMap.get(KODE_AKUN_AUTODEBET.PIUTANG_SEKOLAH)!.nama,
                    debit: totalPotonganGaji,
                    kredit: 0,
                },
                // KREDIT
                {
                    akun_id: akunMap.get(KODE_AKUN_AUTODEBET.SIMPANAN_WAJIB)!.id,
                    akun_kode: KODE_AKUN_AUTODEBET.SIMPANAN_WAJIB,
                    akun_nama: akunMap.get(KODE_AKUN_AUTODEBET.SIMPANAN_WAJIB)!.nama,
                    debit: 0,
                    kredit: totalSimpananWajib,
                },
                {
                    akun_id: akunMap.get(KODE_AKUN_AUTODEBET.PIUTANG_MURABAHAH)!.id,
                    akun_kode: KODE_AKUN_AUTODEBET.PIUTANG_MURABAHAH,
                    akun_nama: akunMap.get(KODE_AKUN_AUTODEBET.PIUTANG_MURABAHAH)!.nama,
                    debit: 0,
                    kredit: totalCicilanPokok,
                },
                {
                    akun_id: akunMap.get(KODE_AKUN_AUTODEBET.PENDAPATAN_MARGIN)!.id,
                    akun_kode: KODE_AKUN_AUTODEBET.PENDAPATAN_MARGIN,
                    akun_nama: akunMap.get(KODE_AKUN_AUTODEBET.PENDAPATAN_MARGIN)!.nama,
                    debit: 0,
                    kredit: totalCicilanMargin,
                },
            ];

            // Simpan Jurnal ke koleksi jurnal_umum
            const jurnalRef = doc(collection(db, "jurnal_umum"));
            transaction.set(jurnalRef, {
                tanggal: currentDate.toISOString(),
                deskripsi: `Jurnal Autodebet Gaji Bulan ${bulanTahun}`,
                lines: jurnalLines,
            });

            // Simpan laporan sebagai arsip
            const arsipRef = doc(collection(db, "laporan_arsip"));
            transaction.set(arsipRef, {
                namaLaporan: `Laporan Autodebet - ${bulanTahun}`,
                tanggalDibuat: currentDate.toISOString(),
                dataLaporan: reportData,
            });

            setLastReport(reportData);
            setReportDate(currentDate);
        });

      alert("Proses autodebet bulanan dan pembuatan jurnal otomatis berhasil diselesaikan!");

    } catch (error: any) {
      console.error("Gagal menjalankan proses bulanan: ", error);
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Proses Autodebet Bulanan">
        <div className="p-6 space-y-6">
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                <h4 className="font-bold">Peringatan!</h4>
                <p className="text-sm">Aksi ini akan memproses semua setoran wajib dan cicilan murabahah untuk semua anggota aktif. Proses ini akan membuat **Jurnal Akuntansi Otomatis** dan bersifat permanen. Pastikan Anda menjalankan ini hanya **satu kali per bulan**.</p>
            </div>
            <div className="text-center">
                <button onClick={processAndGenerate} disabled={isLoading} className="px-8 py-3 bg-secondary text-white font-bold rounded-lg hover:bg-orange-600 disabled:bg-gray-400 shadow-lg">
                    {isLoading ? 'Sedang Memproses...' : 'Jalankan Proses Autodebet'}
                </button>
            </div>
            {lastReport && (
                <div>
                    <h3 className="text-lg font-semibold">Hasil Proses pada {reportDate?.toLocaleString('id-ID')}</h3>
                    <p className="text-sm text-gray-600">Laporan berikut telah dibuat dan diarsipkan. Jurnal otomatis juga telah dibuat di menu Akuntansi.</p>
                </div>
            )}
        </div>
    </Card>
  );
};

export default MonthlyProcess;

