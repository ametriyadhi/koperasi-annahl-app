import React, { useState } from 'react';
import Papa from 'papaparse';
import { writeBatch, collection, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota } from '../types';
import { Unit } from '../types';

interface MemberImporterProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

// Definisikan header baru yang wajib ada di file CSV
const REQUIRED_HEADERS = ['nama', 'nip', 'unit', 'tgl_gabung', 'status', 'simpanan_pokok', 'simpanan_wajib', 'simpanan_sukarela', 'email', 'password'];

const MemberImporter: React.FC<MemberImporterProps> = ({ onClose, onImportSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [validData, setValidData] = useState<{anggota: Omit<Anggota, 'id'>, auth: {email: string, password: string}}[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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
        const localValidData: {anggota: Omit<Anggota, 'id'>, auth: {email: string, password: string}}[] = [];

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
          if (!row.nama || !row.nip || !row.email || !row.password) {
            localErrors.push(`Baris ${rowNum}: 'nama', 'nip', 'email', dan 'password' tidak boleh kosong.`);
            return;
          }
          if (row.password.length < 6) {
            localErrors.push(`Baris ${rowNum}: 'password' harus minimal 6 karakter.`);
            return;
          }

          localValidData.push({
            anggota: {
              nama: row.nama,
              nip: row.nip,
              unit: row.unit as Unit || Unit.Supporting,
              tgl_gabung: row.tgl_gabung || new Date().toISOString().split('T')[0],
              status: row.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif',
              simpanan_pokok: Number(row.simpanan_pokok) || 0,
              simpanan_wajib: Number(row.simpanan_wajib) || 0,
              simpanan_sukarela: Number(row.simpanan_sukarela) || 0,
            },
            auth: {
              email: row.email,
              password: row.password,
            }
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
    try {
      const batch = writeBatch(db);
      const instructions: string[] = [];

      validData.forEach(item => {
        const newAnggotaRef = doc(collection(db, 'anggota'));
        batch.set(newAnggotaRef, item.anggota);

        const newUserRef = doc(db, "users", item.anggota.nip); 
        batch.set(newUserRef, {
            email: item.auth.email,
            role: 'anggota',
            anggota_id: newAnggotaRef.id,
            uid: item.anggota.nip
        });
        instructions.push(`- Email: ${item.auth.email}, Pass: ${item.auth.password}`);
      });
      
      await batch.commit();

      alert(`${validData.length} anggota berhasil diimpor!\n\nPENTING: Segera daftarkan semua pengguna ini di Firebase Authentication, lalu perbarui UID mereka di koleksi 'users'.\n\n${instructions.join('\n')}`);
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
        <p className="text-sm text-gray-600">Gunakan template CSV untuk memastikan semua kolom sesuai. Isi data anggota pada file tersebut.</p>
        <button onClick={handleDownloadTemplate} className="text-sm font-medium text-primary hover:underline">
          Unduh Template CSV
        </button>
      </div>

      <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg space-y-4">
        <h4 className="font-semibold text-gray-700">Langkah 2: Unggah File CSV</h4>
        <p className="text-sm text-gray-600">Pilih file CSV yang sudah Anda isi.</p>
        <input type="file" accept=".csv" onChange={handleFileChange} className="text-sm" />
      </div>

      {isProcessing && <p className="mt-4">Memproses file...</p>}
      
      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
          <h4 className="font-bold">Ditemukan Error!</h4>
          <ul className="list-disc list-inside text-sm">
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {validData.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold">Pratinjau Data (Max 5 baris)</h4>
          <p className="text-sm text-gray-600">{validData.length} data anggota siap untuk diimpor.</p>
          <div className="overflow-x-auto mt-2 border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{REQUIRED_HEADERS.map(h => <th key={h} className="p-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {validData.slice(0, 5).map((d, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{d.nama}</td>
                    <td className="p-2">{d.nip}</td>
                    <td className="p-2">{d.unit}</td>
                    <td className="p-2">{d.tgl_gabung}</td>
                    <td className="p-2">{d.status}</td>
                    <td className="p-2">{d.simpanan_pokok}</td>
                    <td className="p-2">{d.simpanan_wajib}</td>
                    <td className="p-2">{d.simpanan_sukarela}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          Impor {validData.length > 0 ? `${validData.length} Anggota` : 'Data'}
        </button>
      </div>
    </div>
  );
};

export default MemberImporter;
