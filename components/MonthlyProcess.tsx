import React, { useState } from 'react';
import { collection, getDocs, query, where, doc, writeBatch } from 'firebase/firestore';
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

// Tipe data untuk menyimpan data yang akan diproses
interface ProcessData {
  anggotaToUpdate: { id: string, newSimpananWajib: number }[];
  kontrakToUpdate: { id: string, newCicilanTerbayar: number, newStatus: StatusKontrak }[];
}

const MonthlyProcess: React.FC = () => {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [processData, setProcessData] = useState<ProcessData | null>(null); // Menyimpan data yang siap diproses

  // FUNGSI 1: HANYA UNTUK MEMBUAT & MENGUNDUH LAPORAN (READ-ONLY)
  const generateReport = async () => {
    setIsLoading(true);
    setProcessData(null); // Reset data proses setiap kali laporan baru dibuat
    try {
      // --- TAHAP 1: BACA DATA ---
      const anggotaQuery = query(collection(db, "anggota"), where("status", "==", "Aktif"));
      const kontrakQuery = query(collection(db, "kontrak_murabahah"), where("status", "==", "Berjalan"));
      
      const [anggotaSnapshot, kontrakSnapshot] = await Promise.all([
          getDocs(anggotaQuery),
          getDocs(kontrakQuery),
      ]);
      
      const anggotaAktif = anggotaSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Anggota));
      const kontrakBerjalan = kontrakSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as KontrakMurabahah));

      // --- TAHAP 2: PROSES DATA UNTUK LAPORAN & PERSIAPAN PROSES ---
      const kontrakByAnggota = new Map<string, KontrakMurabahah[]>();
      kontrakBerjalan.forEach(k => {
          const list = kontrakByAnggota.get(k.anggota_id) || [];
          list.push(k);
          kontrakByAnggota.set(k.anggota_id, list);
      });

      const unitOrder = [Unit.PGTK, Unit.SD, Unit.SMP, Unit.SMA, Unit.Supporting, Unit.Manajemen];
      anggotaAktif.sort((a, b) => {
          const orderA = unitOrder.indexOf(a.unit);
          const orderB = unitOrder.indexOf(b.unit);
          if (orderA !== orderB) return orderA - orderB;
          return a.nama.localeCompare(b.nama);
      });

      let reportData: AutodebetReportRow[] = [];
      let grandTotalSimpanan = 0, grandTotalPokok = 0, grandTotalMargin = 0;
      
      const dataForProcessing: ProcessData = { anggotaToUpdate: [], kontrakToUpdate: [] };

      anggotaAktif.forEach(anggota => {
          const simpananWajib = settings.simpanan_wajib || 50000;
          const kontrakAnggota = kontrakByAnggota.get(anggota.id) || [];
          
          grandTotalSimpanan += simpananWajib;
          dataForProcessing.anggotaToUpdate.push({ id: anggota.id, newSimpananWajib: (anggota.simpanan_wajib || 0) + simpananWajib });

          if (kontrakAnggota.length > 0) {
              kontrakAnggota.forEach((kontrak, index) => {
                  const angsuranKe = (kontrak.cicilan_terbayar || 0) + 1;
                  const cicilanPokok = (kontrak.harga_pokok - (kontrak.uang_muka || 0)) / kontrak.tenor;
                  const cicilanMargin = (kontrak.margin || 0) / kontrak.tenor;
                  
                  grandTotalPokok += cicilanPokok;
                  grandTotalMargin += cicilanMargin;
                  
                  reportData.push({
                      nama: index === 0 ? anggota.nama : `    ↳ ${kontrak.nama_barang}`,
                      unit: index === 0 ? anggota.unit : '',
                      simpananWajib: index === 0 ? simpananWajib : '',
                      angsuranKe, cicilanPokok, cicilanMargin,
                      total: cicilanPokok + cicilanMargin + (index === 0 ? simpananWajib : 0),
                  });

                  dataForProcessing.kontrakToUpdate.push({
                      id: kontrak.id,
                      newCicilanTerbayar: angsuranKe,
                      newStatus: angsuranKe >= kontrak.tenor ? StatusKontrak.LUNAS : kontrak.status,
                  });
              });
          } else {
              reportData.push({ nama: anggota.nama, unit: anggota.unit, simpananWajib, angsuranKe: '', cicilanPokok: 0, cicilanMargin: 0, total: simpananWajib });
          }
      });
      
      setProcessData(dataForProcessing); // Simpan data yang akan dieksekusi nanti

      // --- TAHAP 3: BUAT DAN UNDUH CSV ---
      const headers = ['Nama', 'Unit', 'Simpanan Wajib', 'Angsuran Ke', 'Cicilan Pokok', 'Cicilan Margin', 'Total'];
      const csvRows = reportData.map(row => [`"${row.nama}"`, row.unit, row.simpananWajib, row.angsuranKe, Math.round(row.cicilanPokok), Math.round(row.cicilanMargin), Math.round(row.total)].join(','));
      const totalRow = ['"TOTAL"', '', Math.round(grandTotalSimpanan), '', Math.round(grandTotalPokok), Math.round(grandTotalMargin), Math.round(grandTotalSimpanan + grandTotalPokok + grandTotalMargin)].join(',');
      const csvContent = [headers.join(','), ...csvRows, totalRow].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `laporan_autodebet_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error: any) {
      alert(`Gagal membuat laporan: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // FUNGSI 2: HANYA UNTUK MENULIS PERUBAHAN KE DATABASE (WRITE-ONLY)
  const executeProcess = async () => {
    if (!processData) {
      alert("Silakan buat laporan terlebih dahulu.");
      return;
    }
    if (!window.confirm("DATA AKAN DIUBAH PERMANEN. Apakah Anda yakin ingin melanjutkan?")) {
        return;
    }

    setIsLoading(true);
    try {
      const batch = writeBatch(db);

      // Update simpanan anggota
      processData.anggotaToUpdate.forEach(item => {
        const ref = doc(db, "anggota", item.id);
        batch.update(ref, { simpanan_wajib: item.newSimpananWajib });
      });

      // Update angsuran kontrak
      processData.kontrakToUpdate.forEach(item => {
        const ref = doc(db, "kontrak_murabahah", item.id);
        batch.update(ref, { cicilan_terbayar: item.newCicilanTerbayar, status: item.newStatus });
      });

      await batch.commit();
      alert("Proses bulanan berhasil dijalankan! Data simpanan dan angsuran telah diperbarui.");
      setProcessData(null); // Reset setelah berhasil
    } catch (error: any) {
      alert(`Gagal menjalankan proses: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Proses Bulanan & Generator Laporan Autodebet">
        <div className="p-6 space-y-6">
            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg">
                <h4 className="font-bold">Langkah 1: Buat Laporan (Aman)</h4>
                <p className="text-sm">
                  Klik tombol ini untuk membuat dan mengunduh laporan CSV autodebet. 
                  <strong>Aksi ini tidak akan mengubah data apa pun di sistem.</strong>
                </p>
                <button 
                  onClick={generateReport} 
                  disabled={isLoading} 
                  className="mt-3 px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-lime-600 disabled:bg-gray-400"
                >
                    {isLoading && !processData ? 'Membuat Laporan...' : 'Buat & Unduh Laporan CSV'}
                </button>
            </div>

            {processData && (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                  <h4 className="font-bold">Langkah 2: Konfirmasi & Jalankan Proses (Permanen)</h4>
                  <p className="text-sm">
                    Laporan telah dibuat. Klik tombol di bawah untuk menyimpan perubahan simpanan dan angsuran ke database. 
                    <strong>Aksi ini bersifat permanen.</strong>
                  </p>
                  <button 
                    onClick={executeProcess} 
                    disabled={isLoading} 
                    className="mt-3 px-6 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-orange-600 disabled:bg-gray-400"
                  >
                      {isLoading ? 'Memproses...' : 'Konfirmasi & Jalankan Proses Bulanan'}
                  </button>
              </div>
            )}
        </div>
    </Card>
  );
};

export default MonthlyProcess;





