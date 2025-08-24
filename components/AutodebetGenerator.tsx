import React, { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah } from '../types';
import { StatusKontrak } from '../types';

interface ReportRow {
  nip: string;
  nama: string;
  simpananWajib: number;
  cicilanMurabahah: number;
  totalPotongan: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const AutodebetGenerator: React.FC = () => {
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generationDate, setGenerationDate] = useState<Date | null>(null);

  const generateReport = async () => {
    setIsLoading(true);
    setReportData([]);

    try {
      // 1. Ambil semua anggota aktif
      const anggotaQuery = query(collection(db, "anggota"), where("status", "==", "Aktif"));
      const anggotaSnapshot = await getDocs(anggotaQuery);
      const anggotaAktif = anggotaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anggota));

      // 2. Ambil semua kontrak murabahah yang sedang berjalan
      const kontrakQuery = query(collection(db, "kontrak_murabahah"), where("status", "==", StatusKontrak.BERJALAN));
      const kontrakSnapshot = await getDocs(kontrakQuery);
      const kontrakBerjalan = kontrakSnapshot.docs.map(doc => doc.data() as KontrakMurabahah);
      
      // Buat map untuk pencarian cepat kontrak berdasarkan ID anggota
      const kontrakMap = new Map<string, number>();
      kontrakBerjalan.forEach(k => {
        kontrakMap.set(k.anggota_id, k.cicilan_per_bulan);
      });

      // 3. Hitung total potongan untuk setiap anggota aktif
      const generatedData = anggotaAktif.map(anggota => {
        const simpananWajib = 50000;
        const cicilanMurabahah = kontrakMap.get(anggota.id) || 0;
        const totalPotongan = simpananWajib + cicilanMurabahah;
        return {
          nip: anggota.nip,
          nama: anggota.nama,
          simpananWajib,
          cicilanMurabahah,
          totalPotongan,
        };
      });
      
      setReportData(generatedData);
      setGenerationDate(new Date());

    } catch (error) {
      console.error("Gagal membuat laporan autodebet: ", error);
      alert("Terjadi kesalahan saat mengambil data.");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCsv = () => {
    if (reportData.length === 0) return;
    const headers = ['NIP', 'Nama Anggota', 'Simpanan Wajib', 'Cicilan Murabahah', 'Total Potongan'];
    const csvRows = [
      headers.join(','),
      ...reportData.map(row => 
        [row.nip, `"${row.nama}"`, row.simpananWajib, row.cicilanMurabahah, row.totalPotongan].join(',')
      )
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fileName = `laporan_autodebet_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <div>
          <h4 className="font-semibold">Generator Laporan Autodebet</h4>
          <p className="text-sm text-gray-600">Buat dokumen potongan gaji bulanan untuk diserahkan ke SDM.</p>
        </div>
        <button onClick={generateReport} disabled={isLoading} className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-lime-600 disabled:bg-gray-400">
          {isLoading ? 'Memproses...' : 'Generate Laporan'}
        </button>
      </div>

      {reportData.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-700">
              Laporan berhasil dibuat pada {generationDate?.toLocaleString('id-ID')} untuk <strong>{reportData.length} anggota aktif</strong>.
            </p>
            <button onClick={exportToCsv} className="text-sm font-medium text-primary hover:underline">
              Export to CSV
            </button>
          </div>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left font-medium">NIP</th>
                  <th className="p-2 text-left font-medium">Nama Anggota</th>
                  <th className="p-2 text-right font-medium">Simpanan Wajib</th>
                  <th className="p-2 text-right font-medium">Cicilan Murabahah</th>
                  <th className="p-2 text-right font-bold">Total Potongan</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y">
                {reportData.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2">{row.nip}</td>
                    <td className="p-2">{row.nama}</td>
                    <td className="p-2 text-right">{formatCurrency(row.simpananWajib)}</td>
                    <td className="p-2 text-right">{formatCurrency(row.cicilanMurabahah)}</td>
                    <td className="p-2 text-right font-bold">{formatCurrency(row.totalPotongan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutodebetGenerator;
