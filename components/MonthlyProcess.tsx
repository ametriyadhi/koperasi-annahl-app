import React, { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah } from '../types';
import { Unit } from '../types';
import { useSettings } from './SettingsContext';
import Card from './shared/Card';

// Tipe data baru khusus untuk laporan ini
interface AutodebetReportRow {
  nama: string;
  unit: Unit;
  simpananWajib: number;
  angsuranKe: number | string;
  cicilanPokok: number;
  cicilanMargin: number;
  total: number;
}

const MonthlyProcess: React.FC = () => {
  const { settings } = useSettings();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAutodebetCsv = async () => {
    setIsGenerating(true);
    try {
      // 1. Ambil semua data yang diperlukan
      const anggotaQuery = query(collection(db, "anggota"), where("status", "==", "Aktif"));
      const kontrakQuery = query(collection(db, "kontrak_murabahah"), where("status", "==", "Berjalan"));

      const [anggotaSnapshot, kontrakSnapshot] = await Promise.all([
        getDocs(anggotaQuery),
        getDocs(kontrakQuery),
      ]);

      const anggotaAktif = anggotaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anggota));
      const kontrakBerjalan = kontrakSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KontrakMurabahah));
      const kontrakMap = new Map(kontrakBerjalan.map(k => [k.anggota_id, k]));

      // 2. Proses dan hitung data untuk setiap anggota
      const reportData: AutodebetReportRow[] = anggotaAktif.map(anggota => {
        const simpananWajib = settings.simpanan_wajib || 50000;
        const kontrak = kontrakMap.get(anggota.id);

        let angsuranKe: number | string = '';
        let cicilanPokok = 0;
        let cicilanMargin = 0;

        if (kontrak) {
          angsuranKe = (kontrak.cicilan_terbayar || 0) + 1;
          cicilanPokok = (kontrak.harga_pokok - (kontrak.uang_muka || 0)) / kontrak.tenor;
          cicilanMargin = (kontrak.margin || 0) / kontrak.tenor;
        }

        const total = simpananWajib + cicilanPokok + cicilanMargin;

        return {
          nama: anggota.nama,
          unit: anggota.unit,
          simpananWajib,
          angsuranKe,
          cicilanPokok,
          cicilanMargin,
          total,
        };
      });

      // 3. Urutkan data berdasarkan unit
      const unitOrder = [Unit.PGTK, Unit.SD, Unit.SMP, Unit.SMA, Unit.Supporting, Unit.Manajemen];
      reportData.sort((a, b) => {
        const unitComparison = unitOrder.indexOf(a.unit) - unitOrder.indexOf(b.unit);
        if (unitComparison !== 0) {
          return unitComparison;
        }
        return a.nama.localeCompare(b.nama); // Urutkan berdasarkan nama jika unit sama
      });

      // 4. Buat konten file CSV
      const headers = ['Nama', 'Unit', 'Simpanan Wajib', 'Angsuran Ke', 'Cicilan Pokok', 'Cicilan Margin', 'Total'];
      const csvContent = [
        headers.join(','),
        ...reportData.map(row => 
          [
            `"${row.nama}"`,
            row.unit,
            row.simpananWajib,
            row.angsuranKe,
            Math.round(row.cicilanPokok), // Pembulatan untuk angka bersih
            Math.round(row.cicilanMargin),
            Math.round(row.total)
          ].join(',')
        )
      ].join('\n');

      // 5. Buat file dan trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const fileName = `laporan_autodebet_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Laporan CSV berhasil dibuat!');

    } catch (error: any) {
      console.error("Gagal membuat laporan autodebet: ", error);
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card title="Generator Laporan Autodebet">
        <div className="p-6 space-y-6">
            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg">
                <h4 className="font-bold">Informasi</h4>
                <p className="text-sm">
                  Tombol di bawah ini akan mengambil data terbaru dari semua anggota aktif dan pembiayaan yang berjalan, 
                  lalu membuat file CSV laporan autodebet sesuai format yang dibutuhkan untuk diserahkan ke bagian SDM.
                  <br/>
                  <strong>Aksi ini tidak akan mengubah data apa pun di dalam sistem.</strong>
                </p>
            </div>
            <div className="text-center">
                <button 
                  onClick={generateAutodebetCsv} 
                  disabled={isGenerating} 
                  className="px-8 py-3 bg-primary text-white font-bold rounded-lg hover:bg-lime-600 disabled:bg-gray-400 shadow-lg"
                >
                    {isGenerating ? 'Sedang Membuat Laporan...' : 'Buat & Unduh Laporan CSV'}
                </button>
            </div>
        </div>
    </Card>
  );
};

export default MonthlyProcess;


