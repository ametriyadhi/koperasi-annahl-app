import React, { useState } from 'react';
import { collection, getDocs, query, where, doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah } from '../types';
import { Unit, StatusKontrak } from '../types';
import { useSettings } from './SettingsContext';
import Card from './shared/Card';

// Tipe data baru yang lebih fleksibel untuk laporan CSV
interface AutodebetReportRow {
  nama: string;
  unit: Unit | string;
  simpananWajib: number | string;
  angsuranKe: number | string;
  cicilanPokok: number;
  cicilanMargin: number;
  total: number;
}

const MonthlyProcess: React.FC = () => {
  const { settings } = useSettings();
  const [isProcessing, setIsProcessing] = useState(false);

  const processAndGenerateCsv = async () => {
    if (!window.confirm("Aksi ini akan MENAMBAH SIMPANAN WAJIB & CICILAN MURABAHAH secara permanen, lalu membuat laporan CSV. Lanjutkan?")) {
      return;
    }

    setIsProcessing(true);
    try {
      // Variabel untuk menyimpan total yang akan dijumlahkan
      let grandTotalSimpanan = 0;
      let grandTotalPokok = 0;
      let grandTotalMargin = 0;
      let reportData: AutodebetReportRow[] = [];

      await runTransaction(db, async (transaction) => {
        // --- TAHAP 1: BACA SEMUA DATA ---
        const anggotaQuery = query(collection(db, "anggota"), where("status", "==", "Aktif"));
        const kontrakQuery = query(collection(db, "kontrak_murabahah"), where("status", "==", "Berjalan"));
        
        const [anggotaSnapshot, kontrakSnapshot] = await Promise.all([
            transaction.get(anggotaQuery),
            transaction.get(kontrakQuery)
        ]);
        
        const anggotaAktif = anggotaSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Anggota));
        const kontrakBerjalan = kontrakSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as KontrakMurabahah));

        // Kelompokkan kontrak berdasarkan anggota_id
        const kontrakByAnggota = new Map<string, KontrakMurabahah[]>();
        kontrakBerjalan.forEach(k => {
            const list = kontrakByAnggota.get(k.anggota_id) || [];
            list.push(k);
            kontrakByAnggota.set(k.anggota_id, list);
        });

        // --- TAHAP 2: PROSES & PERSIAPKAN DATA UNTUK CSV ---
        const unitOrder = [Unit.PGTK, Unit.SD, Unit.SMP, Unit.SMA, Unit.Supporting, Unit.Manajemen];
        
        // Urutkan anggota berdasarkan unit
        anggotaAktif.sort((a, b) => unitOrder.indexOf(a.unit) - unitOrder.indexOf(b.unit));

        for (const anggota of anggotaAktif) {
            const simpananWajib = settings.simpanan_wajib || 50000;
            const kontrakAnggota = kontrakByAnggota.get(anggota.id) || [];
            
            grandTotalSimpanan += simpananWajib;

            if (kontrakAnggota.length > 0) {
                kontrakAnggota.forEach((kontrak, index) => {
                    const angsuranKe = (kontrak.cicilan_terbayar || 0) + 1;
                    const cicilanPokok = (kontrak.harga_pokok - (kontrak.uang_muka || 0)) / kontrak.tenor;
                    const cicilanMargin = (kontrak.margin || 0) / kontrak.tenor;
                    
                    grandTotalPokok += cicilanPokok;
                    grandTotalMargin += cicilanMargin;
                    
                    reportData.push({
                        // Nama, unit, dan simpanan hanya di baris pertama jika ada banyak cicilan
                        nama: index === 0 ? anggota.nama : '',
                        unit: index === 0 ? anggota.unit : '',
                        simpananWajib: index === 0 ? simpananWajib : '',
                        angsuranKe,
                        cicilanPokok,
                        cicilanMargin,
                        total: cicilanPokok + cicilanMargin + (index === 0 ? simpananWajib : 0),
                    });
                });
            } else {
                // Anggota yang hanya bayar simpanan wajib
                reportData.push({
                    nama: anggota.nama,
                    unit: anggota.unit,
                    simpananWajib,
                    angsuranKe: '',
                    cicilanPokok: 0,
                    cicilanMargin: 0,
                    total: simpananWajib,
                });
            }

            // --- TAHAP 3: PERSIAPKAN OPERASI TULIS (WRITE) ---
            // Update simpanan wajib anggota
            const anggotaRef = doc(db, "anggota", anggota.id);
            transaction.update(anggotaRef, { simpanan_wajib: (anggota.simpanan_wajib || 0) + simpananWajib });

            // Update setiap kontrak yang dimiliki anggota
            for (const kontrak of kontrakAnggota) {
                const kontrakRef = doc(db, "kontrak_murabahah", kontrak.id);
                const cicilanTerbayarBaru = (kontrak.cicilan_terbayar || 0) + 1;
                const statusBaru = cicilanTerbayarBaru >= kontrak.tenor ? StatusKontrak.LUNAS : kontrak.status;
                transaction.update(kontrakRef, { cicilan_terbayar: cicilanTerbayarBaru, status: statusBaru });
            }
        }
      });

      // --- TAHAP 4: BUAT DAN UNDUH FILE CSV ---
      const headers = ['Nama', 'Unit', 'Simpanan Wajib', 'Angsuran Ke', 'Cicilan Pokok', 'Cicilan Margin', 'Total'];
      const csvRows = reportData.map(row => 
        [
          `"${row.nama}"`,
          row.unit,
          row.simpananWajib,
          row.angsuranKe,
          Math.round(row.cicilanPokok),
          Math.round(row.cicilanMargin),
          Math.round(row.total)
        ].join(',')
      );
      
      // Tambahkan baris total di akhir
      const totalRow = [
          '"TOTAL"', '', 
          Math.round(grandTotalSimpanan), '', 
          Math.round(grandTotalPokok), 
          Math.round(grandTotalMargin), 
          Math.round(grandTotalSimpanan + grandTotalPokok + grandTotalMargin)
      ].join(',');

      const csvContent = [headers.join(','), ...csvRows, totalRow].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const fileName = `laporan_autodebet_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Proses bulanan berhasil dijalankan dan laporan CSV telah dibuat!');

    } catch (error: any) {
      console.error("Gagal menjalankan proses bulanan: ", error);
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card title="Proses Bulanan & Generator Laporan Autodebet">
        <div className="p-6 space-y-6">
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                <h4 className="font-bold">Peringatan Penting!</h4>
                <p className="text-sm">
                  Tombol di bawah ini akan menjalankan **proses bulanan permanen**:
                  <ul className="list-disc pl-5 mt-2">
                    <li>Menambah saldo <strong>Simpanan Wajib</strong> untuk semua anggota aktif.</li>
                    <li>Menambah hitungan <strong>angsuran terbayar</strong> untuk semua pembiayaan berjalan.</li>
                    <li>Membuat dan mengunduh <strong>laporan CSV</strong> untuk diserahkan ke SDM.</li>
                  </ul>
                  Pastikan Anda menjalankan ini hanya **satu kali per bulan**.
                </p>
            </div>
            <div className="text-center">
                <button 
                  onClick={processAndGenerateCsv} 
                  disabled={isProcessing} 
                  className="px-8 py-3 bg-secondary text-white font-bold rounded-lg hover:bg-orange-600 disabled:bg-gray-400 shadow-lg"
                >
                    {isProcessing ? 'Sedang Memproses...' : 'Jalankan Proses & Buat Laporan'}
                </button>
            </div>
        </div>
    </Card>
  );
};

export default MonthlyProcess;



