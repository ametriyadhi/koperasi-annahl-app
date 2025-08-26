import React, { useState } from 'react';
import Papa from 'papaparse';
import { writeBatch, collection, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah } from '../types';
import { StatusKontrak } from '../types';
import { useSettings } from './SettingsContext';

interface MurabahahImporterProps {
  onClose: () => void;
  onImportSuccess: () => void;
  anggotaList: Anggota[];
}

// Template CSV hanya memerlukan data input mentah.
const REQUIRED_HEADERS = ['nip_anggota', 'nama_barang', 'harga_pokok', 'uang_muka', 'tenor', 'tanggal_akad', 'cicilan_terbayar'];

const MurabahahImporter: React.FC<MurabahahImporterProps> = ({ onClose, onImportSuccess, anggotaList }) => {
  const { settings } = useSettings();
  const [file, setFile] = useState<File | null>(null);
  const [validData, setValidData] = useState<Omit<KontrakMurabahah, 'id'>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const anggotaMapByNip = new Map(anggotaList.map(a => [a.nip, a.id]));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseAndValidateCsv(selectedFile);
    }
  };

  const parseAndValidateCsv = (csvFile: File) => {
    setIsProcessing(true);
    setErrors([]);
    setValidData([]);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const localErrors: string[] = [];
        const localValidData: Omit<KontrakMurabahah, 'id'>[] = [];

        const fileHeaders = results.meta.fields || [];
        const missingHeaders = REQUIRED_HEADERS.filter(h => !fileHeaders.includes(h));
        if (missingHeaders.length > 0) {
          localErrors.push(`Template tidak sesuai. Kolom yang hilang: ${missingHeaders.join(', ')}`);
          setErrors(localErrors);
          setIsProcessing(false);
          return;
        }

        results.data.forEach((row: any, index) => {
          const rowNum = index + 2;
          const anggotaId = anggotaMapByNip.get(row.nip_anggota);
          if (!anggotaId) {
            localErrors.push(`Baris ${rowNum}: NIP "${row.nip_anggota}" tidak ditemukan di data anggota.`);
            return;
          }

          const harga_pokok = Number(row.harga_pokok);
          const tenor = Number(row.tenor);
          const cicilan_terbayar = Number(row.cicilan_terbayar) || 0;
          const uang_muka = Number(row.uang_muka) || 0;

          if (isNaN(harga_pokok) || harga_pokok <= 0) {
            localErrors.push(`Baris ${rowNum}: 'harga_pokok' harus berupa angka lebih dari 0.`);
            return;
          }
          if (isNaN(tenor) || tenor <= 0) {
            localErrors.push(`Baris ${rowNum}: 'tenor' harus berupa angka lebih dari 0.`);
            return;
          }
          if (isNaN(cicilan_terbayar) || cicilan_terbayar < 0) {
            localErrors.push(`Baris ${rowNum}: 'cicilan_terbayar' harus berupa angka 0 atau lebih.`);
            return;
          }
          
          // --- KALKULASI OTOMATIS BERDASARKAN PENGATURAN ---
          let marginPersen;
          if (tenor <= 6) marginPersen = settings.margin_tenor_6;
          else if (tenor <= 12) marginPersen = settings.margin_tenor_12;
          else if (tenor <= 18) marginPersen = settings.margin_tenor_18;
          else marginPersen = settings.margin_tenor_24;

          const margin = harga_pokok * (marginPersen / 100);
          const harga_jual = harga_pokok + margin;
          const cicilan_per_bulan = (harga_jual - uang_muka) / tenor;

          localValidData.push({
            anggota_id: anggotaId,
            nama_barang: row.nama_barang,
            harga_pokok,
            margin,
            harga_jual,
            uang_muka,
            tenor,
            cicilan_per_bulan,
            tanggal_akad: row.tanggal_akad || new Date().toISOString().split('T')[0],
            status: cicilan_terbayar >= tenor ? StatusKontrak.LUNAS : StatusKontrak.BERJALAN,
            cicilan_terbayar,
          });
        });

        setErrors(localErrors);
        setValidData(localValidData);
        setIsProcessing(false);
      }
    });
  };

  const handleDownloadTemplate = () => {
    const csvContent = REQUIRED_HEADERS.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'template_import_murabahah.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (validData.length === 0 || errors.length > 0) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      validData.forEach(kontrak => {
        const docRef = doc(collection(db, 'kontrak_murabahah'));
        batch.set(docRef, kontrak);
      });
      await batch.commit();
      alert(`${validData.length} kontrak berhasil diimpor!`);
      onImportSuccess();
    } catch (error) {
      console.error("Error importing data: ", error);
      alert("Terjadi kesalahan saat mengimpor data.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-2">
      <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg space-y-4">
        <h4 className="font-semibold text-gray-700">Langkah 1: Unduh dan Isi Template</h4>
        <p className="text-sm text-gray-600">Gunakan template ini untuk memastikan data input Anda benar.</p>
        <button onClick={handleDownloadTemplate} className="text-sm font-medium text-primary hover:underline">
          Unduh Template CSV
        </button>
      </div>

      <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg space-y-4">
        <h4 className="font-semibold text-gray-700">Langkah 2: Unggah File CSV</h4>
        <input type="file" accept=".csv" onChange={handleFileChange} className="text-sm" />
      </div>

      {isProcessing && <p className="mt-4 text-center">Memproses file...</p>}
      
      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
          <h4 className="font-bold">Ditemukan Error!</h4>
          <ul className="list-disc list-inside text-sm">
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {validData.length > 0 && errors.length === 0 && (
        <div className="mt-4">
          <h4 className="font-semibold text-green-700">Pratinjau Data</h4>
          <p className="text-sm text-gray-600">{validData.length} baris data valid dan siap untuk diimpor.</p>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4 mt-4 border-t">
        <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">
          Tutup
        </button>
        <button 
          onClick={handleImport} 
          disabled={isProcessing || errors.length > 0 || validData.length === 0}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-amber-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Impor {validData.length > 0 ? `${validData.length} Kontrak` : 'Data'}
        </button>
      </div>
    </div>
  );
};

export default MurabahahImporter;

