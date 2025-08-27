import React, { useState } from 'react';
import { collection, getDocs, query, where, doc, runTransaction, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah, ReportRow, Akun, JurnalEntryLine } from '../types';
import { StatusKontrak } from '../types';
import Card from './shared/Card';

// --- KODE AKUN DIPERBARUI ---
// PENTING: Pastikan semua akun dengan kode di bawah ini SUDAH ADA di menu Akuntansi -> Bagan Akun Anda.
// Jika belum ada, proses ini akan gagal.
const KODE_AKUN_AUTODEBET = {
    PIUTANG_SEKOLAH: '1-1300',   // ASET: Piutang Gaji/Potongan dari Sekolah.
    // --- PERBAIKAN: Kode akun disesuaikan dengan screenshot ---
    SIMPANAN_WAJIB: '3-2000',     // EKUITAS: Akun untuk menampung Simpanan Wajib.
    PIUTANG_MURABAHAH: '1-1200',  // ASET: Akun untuk Piutang Murabahah.
    PENDAPATAN_MARGIN: '4-1000',   // PENDAPATAN: Akun untuk Pendapatan Margin Murabahah.
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
            // --- TAHAP 1: BACA SEMUA DATA YANG DIPERLUKAN SEBELUM MENULIS ---
            const anggotaQuery = query(collection(db, "anggota"), where("status", "==", "Aktif"));
            const kontrakQuery = query(collection(db, "kontrak_murabahah"), where("status", "==", "Berjalan"));
            
            const anggotaSnapshot = await transaction.get(anggotaQuery);
            const kontrakSnapshot = await transaction.get(kontrakQuery);
            
            const anggotaAktif = anggotaSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Anggota));
            const kontrakBerjalan = kontrakSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as KontrakMurabahah));
            const kontrakMap = new Map<string, KontrakMurabahah>(kontrakBerjalan.map(k => [k.anggota_id, k]));

            const allAccountsSnap = await transaction.get(collection(db, "chart_of_accounts"));
            const allAccounts = allAccountsSnap.docs.map(d => ({id: d.id, ...d.data()}) as Akun);
            
            const akunMap = new Map<string, Akun>();
            for (const kode of Object.values(KODE_AKUN_AUTODEBET)) {
                const foundAccount = allAccounts.find(acc => acc.kode === kode);
                if (!foundAccount) {
                    throw new Error(`Akun dengan kode ${kode} tidak ditemukan di Bagan Akun. Proses dibatalkan.`);
                }
                akunMap.set(kode, foundAccount);
            }

            // --- TAHAP 2: PROSES DATA & AKUMULASI TOTAL DI MEMORI ---
            const reportData: ReportRow[] = [];
            const currentDate = new Date();
            const bulanTahun = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            
            let totalSimpananWajib = 0;
            let totalCicilanPokok = 0;
            let totalCicilanMargin = 0;

            for (const anggota of anggotaAktif) {
                const simpananWajib = 50000; // Sebaiknya diambil dari settings
                const kontrak = kontrakMap.get(anggota.id);
                
                totalSimpananWajib += simpananWajib;

                let cicilanMurabahah = 0;
                if (kontrak) {
                    cicilanMurabahah = kontrak.cicilan_per_bulan;
                    const angsuranPokok = (kontrak.harga_pokok / kontrak.tenor);
                    const angsuranMargin = (kontrak.margin / kontrak.tenor);
                    totalCicilanPokok += angsuranPokok;
                    totalCicilanMargin += angsuranMargin;
                }
                
                reportData.push({
                  nip: anggota.nip,
                  nama: anggota.nama,
                  simpananWajib,
                  cicilanMurabahah,
                  totalPotongan: simpananWajib + cicilanMurabahah,
                });
            }

            // --- TAHAP 3: JALANKAN SEMUA OPERASI TULIS (WRITE) ---
            
            for (const anggota of anggotaAktif) {
                 const anggotaRef = doc(db, "anggota", anggota.id);
                 transaction.update(anggotaRef, { simpanan_wajib: (anggota.simpanan_wajib || 0) + 50000 });
                 
                 const kontrak = kontrakMap.get(anggota.id);
                 if (kontrak) {
                    const kontrakRef = doc(db, "kontrak_murabahah", kontrak.id);
                    const cicilanTerbayarBaru = (kontrak.cicilan_terbayar || 0) + 1;
                    const statusBaru = cicilanTerbayarBaru >= kontrak.tenor ? StatusKontrak.LUNAS : kontrak.status;
                    transaction.update(kontrakRef, { cicilan_terbayar: cicilanTerbayarBaru, status: statusBaru });
                 }
            }
            
            const totalPotonganGaji = totalSimpananWajib + totalCicilanPokok + totalCicilanMargin;
            const jurnalLines: JurnalEntryLine[] = [
                { akun_id: akunMap.get(KODE_AKUN_AUTODEBET.PIUTANG_SEKOLAH)!.id, akun_kode: KODE_AKUN_AUTODEBET.PIUTANG_SEKOLAH, akun_nama: akunMap.get(KODE_AKUN_AUTODEBET.PIUTANG_SEKOLAH)!.nama, debit: totalPotonganGaji, kredit: 0 },
                { akun_id: akunMap.get(KODE_AKUN_AUTODEBET.SIMPANAN_WAJIB)!.id, akun_kode: KODE_AKUN_AUTODEBET.SIMPANAN_WAJIB, akun_nama: akunMap.get(KODE_AKUN_AUTODEBET.SIMPANAN_WAJIB)!.nama, debit: 0, kredit: totalSimpananWajib },
                { akun_id: akunMap.get(KODE_AKUN_AUTODEBET.PIUTANG_MURABAHAH)!.id, akun_kode: KODE_AKUN_AUTODEBET.PIUTANG_MURABAHAH, akun_nama: akunMap.get(KODE_AKUN_AUTODEBET.PIUTANG_MURABAHAH)!.nama, debit: 0, kredit: totalCicilanPokok },
                { akun_id: akunMap.get(KODE_AKUN_AUTODEBET.PENDAPATAN_MARGIN)!.id, akun_kode: KODE_AKUN_AUTODEBET.PENDAPATAN_MARGIN, akun_nama: akunMap.get(KODE_AKUN_AUTODEBET.PENDAPATAN_MARGIN)!.nama, debit: 0, kredit: totalCicilanMargin },
            ];

            const jurnalRef = doc(collection(db, "jurnal_umum"));
            transaction.set(jurnalRef, {
                tanggal: currentDate.toISOString(),
                deskripsi: `Jurnal Autodebet Gaji Bulan ${bulanTahun}`,
                lines: jurnalLines,
            });

            for(const line of jurnalLines) {
                const acc = akunMap.get(line.akun_kode);
                if (acc) {
                    const accRef = doc(db, "chart_of_accounts", acc.id);
                    const currentSaldo = acc.saldo || 0;
                    const newSaldo = acc.saldo_normal === 'Debit' 
                        ? currentSaldo + line.debit - line.kredit
                        : currentSaldo - line.debit + line.kredit;
                    transaction.update(accRef, { saldo: newSaldo });
                }
            }

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

