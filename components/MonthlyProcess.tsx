import React, { useState } from 'react';
import { collection, getDocs, query, where, doc, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah } from '../types';
import { Unit, StatusKontrak, JenisSimpanan } from '../types'; // JenisSimpanan ditambahkan
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
  csvContent: string;
  reportName: string;
}

const MonthlyProcess: React.FC = () => {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [processData, setProcessData] = useState<ProcessData | null>(null);

  // FUNGSI 1: HANYA UNTUK MEMBUAT & MENGUNDUH LAPORAN (READ-ONLY)
  const generateReport = async () => {
    setIsLoading(true);
    setProcessData(null);
    try {
      const anggotaQuery = query(collection(db, "anggota"), where("status", "==", "Aktif"));
      const kontrakQuery = query(collection(db, "kontrak_murabahah"), where("status", "==", "Berjalan"));
      
      const [anggotaSnapshot, kontrakSnapshot] = await Promise.all([
          getDocs(anggotaQuery),
          getDocs(kontrakQuery),
      ]);
      
      const anggotaAktif = anggotaSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Anggota));
      const kontrakBerjalan = kontrakSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as KontrakMurabahah));

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
      
      const dataForProcessing: ProcessData = { anggotaToUpdate: [], kontrakToUpdate: [], csvContent: '', reportName: '' };

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
      
      const headers = ['Nama', 'Unit', 'Simpanan Wajib', 'Angsuran Ke', 'Cicilan Pokok', 'Cicilan Margin', 'Total'];
      const csvRows = reportData.map(row => [`"${row.nama}"`, row.unit, row.simpananWajib, row.angsuranKe, Math.round(row.cicilanPokok), Math.round(row.cicilanMargin), Math.round(row.total)].join(','));
      const totalRow = ['"TOTAL"', '', Math.round(grandTotalSimpanan), '', Math.round(grandTotalPokok), Math.round(grandTotalMargin), Math.round(grandTotalSimpanan + grandTotalPokok + grandTotalMargin)].join(',');
      
      dataForProcessing.csvContent = [headers.join(','), ...csvRows, totalRow].join('\n');
      dataForProcessing.reportName = `Laporan Autodebet - ${new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`;
      
      setProcessData(dataForProcessing);

      const blob = new Blob([dataForProcessing.csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${dataForProcessing.reportName.replace(/ /g, '_')}.csv`);
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
      const currentDate = new Date();
      const keterangan = `Setoran Wajib Autodebet - ${currentDate.toLocaleString('id-ID', { month: 'long' })}`;

      // Update simpanan anggota & BUAT CATATAN TRANSAKSI
      processData.anggotaToUpdate.forEach(item => {
        const anggotaRef = doc(db, "anggota", item.id);
        batch.update(anggotaRef, { simpanan_wajib: item.newSimpananWajib });

        // --- PENAMBAHAN: Buat dokumen baru di sub-koleksi transaksi ---
        const transaksiRef = doc(collection(db, "anggota", item.id, "transaksi"));
        batch.set(transaksiRef, {
            anggota_id: item.id,
            jenis: JenisSimpanan.WAJIB,
            tanggal: currentDate.toISOString(),
            tipe: 'Setor',
            jumlah: settings.simpanan_wajib || 50000,
            keterangan: keterangan,
        });
        // --- AKHIR PENAMBAHAN ---
      });

      // Update angsuran kontrak
      processData.kontrakToUpdate.forEach(item => {
        const ref = doc(db, "kontrak_murabahah", item.id);
        batch.update(ref, { cicilan_terbayar: item.newCicilanTerbayar, status: item.newStatus });
      });

      // Simpan laporan ke arsip
      const arsipRef = doc(collection(db, "laporan_arsip"));
      batch.set(arsipRef, {
          namaLaporan: processData.reportName,
          tanggalDibuat: new Date().toISOString(),
          dataLaporan: processData.csvContent,
      });

      await batch.commit();
      alert("Proses bulanan berhasil dijalankan! Data simpanan, angsuran, dan riwayat transaksi telah diperbarui. Laporan juga telah diarsipkan.");
      setProcessData(null);
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
                    Laporan telah dibuat. Klik tombol di bawah untuk menyimpan perubahan simpanan dan angsuran ke database, serta mengarsipkan laporan ini. 
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







