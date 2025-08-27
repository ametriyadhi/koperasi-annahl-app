import React, { useState } from 'react';
import Papa from 'papaparse';
// Impor fungsi query dari firestore
import { writeBatch, collection, doc, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota } from '../types';
import { Unit } from '../types';

interface MemberImporterProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

const REQUIRED_HEADERS = ['nama', 'nip', 'unit', 'tgl_gabung', 'status', 'simpanan_pokok', 'simpanan_wajib', 'simpanan_sukarela', 'email', 'password'];

/**
 * Mengubah string mata uang (misal: "Rp 50.000") menjadi angka (50000).
 * @param value String yang akan di-parse.
 * @returns Angka hasil parse, atau 0 jika tidak valid.
 */
const parseCurrency = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string' || !value) return 0;
    const cleanedString = value.replace(/[^0-9]/g, '');
    return parseInt(cleanedString, 10) || 0;
};

const MemberImporter: React.FC<MemberImporterProps> = ({ onClose, onImportSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  // Tipe data disesuaikan untuk proses validasi
  const [validData, setValidData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
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
        const localValidData: any[] = [];

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
          if (!row.nama || !row.nip || !row.email) {
            localErrors.push(`Baris ${rowNum}: 'nama', 'nip', dan 'email' tidak boleh kosong.`);
            return;
          }
          // Password hanya wajib jika ini entri baru (akan dicek saat proses import)
          if (row.password && row.password.length < 6) {
            localErrors.push(`Baris ${rowNum}: 'password' untuk email ${row.email} harus minimal 6 karakter.`);
            return;
          }

          localValidData.push({
            nama: row.nama,
            nip: row.nip,
            unit: row.unit as Unit || Unit.Supporting,
            tgl_gabung: row.tgl_gabung || new Date().toISOString().split('T')[0],
            status: row.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif',
            simpanan_pokok: parseCurrency(row.simpanan_pokok),
            simpanan_wajib: parseCurrency(row.simpanan_wajib),
            simpanan_sukarela: parseCurrency(row.simpanan_sukarela),
            email: row.email,
            password: row.password,
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
    link.setAttribute('download', 'template_import_anggota.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (validData.length === 0 || errors.length > 0) return;
    setIsProcessing(true);
    setImportResult(null);
    
    const results = {
        created: 0,
        updated: 0,
        errors: [] as string[],
    };

    try {
      const batch = writeBatch(db);
      const anggotaCollection = collection(db, 'anggota');

      // Loop untuk memeriksa setiap baris data
      for (const item of validData) {
        // 1. Cek apakah NIP sudah ada
        const q = query(anggotaCollection, where("nip", "==", item.nip), limit(1));
        const querySnapshot = await getDocs(q);

        const anggotaData = {
            nama: item.nama,
            nip: item.nip,
            unit: item.unit,
            tgl_gabung: item.tgl_gabung,
            status: item.status,
            simpanan_pokok: item.simpanan_pokok,
            simpanan_wajib: item.simpanan_wajib,
            simpanan_sukarela: item.simpanan_sukarela,
        };

        if (!querySnapshot.empty) {
          // 2. JIKA ADA: Update dokumen yang ada
          const existingDoc = querySnapshot.docs[0];
          batch.update(existingDoc.ref, anggotaData);
          results.updated++;
        } else {
          // 3. JIKA TIDAK ADA: Buat dokumen baru
          if (!item.password) {
              results.errors.push(`NIP ${item.nip}: Gagal dibuat karena password kosong.`);
              continue; // Lanjut ke item berikutnya
          }
          const newAnggotaRef = doc(anggotaCollection);
          batch.set(newAnggotaRef, anggotaData);
          results.created++;
          // Peringatan untuk membuat user secara manual tetap diperlukan
          console.warn(`PERLU AKSI MANUAL: Buat user di Firebase Auth untuk NIP ${item.nip} dengan email ${item.email} dan hubungkan ke ID anggota ${newAnggotaRef.id}`);
        }
      }

      // 4. Jalankan semua operasi update/create
      await batch.commit();

      setImportResult(results);
      alert(`Proses selesai!\nAnggota Baru Dibuat: ${results.created}\nAnggota Diperbarui: ${results.updated}\nGagal: ${results.errors.length}\n\nPENTING: Untuk anggota baru, Anda tetap harus mendaftarkan akun mereka di Firebase Authentication secara manual.`);
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
      {/* Bagian UI (form, tombol, dll) tidak berubah */}
      <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg space-y-4">
        <h4 className="font-semibold text-gray-700">Langkah 1: Unduh dan Isi Template</h4>
        <p className="text-sm text-gray-600">Gunakan template CSV untuk memastikan semua kolom sesuai.</p>
        <button onClick={handleDownloadTemplate} className="text-sm font-medium text-primary hover:underline">
          Unduh Template CSV
        </button>
      </div>

      <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg space-y-4">
        <h4 className="font-semibold text-gray-700">Langkah 2: Unggah File CSV</h4>
        <p className="text-sm text-gray-600">Pilih file CSV yang sudah Anda isi.</p>
        <input type="file" accept=".csv" onChange={handleFileChange} className="text-sm" />
      </div>

      {isProcessing && <p className="mt-4 text-center">Memproses...</p>}
      
      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
          <h4 className="font-bold">Ditemukan Error Validasi!</h4>
          <ul className="list-disc list-inside text-sm">
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {importResult && (
        <div className="mt-4 p-4 bg-green-50 text-green-800 rounded-lg">
          <h4 className="font-bold">Proses Impor Selesai!</h4>
          <p>Berhasil Dibuat: {importResult.created}</p>
          <p>Berhasil Diperbarui: {importResult.updated}</p>
          {importResult.errors.length > 0 && (
            <div className="mt-2 text-sm text-red-700">
              <p className="font-semibold">Detail Kegagalan:</p>
              <ul className="list-disc list-inside">
                {importResult.errors.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
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
          {isProcessing ? 'Memproses...' : `Impor/Update ${validData.length} Anggota`}
        </button>
      </div>
    </div>
  );
};

export default MemberImporter;


