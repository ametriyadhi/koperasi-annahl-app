import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { TransaksiMurabahah, KontrakMurabahah } from '../types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

interface MurabahahHistoryProps {
  kontrak: KontrakMurabahah;
  onEdit: (kontrak: KontrakMurabahah) => void;
  onDelete: (id: string) => void;
}

const MurabahahHistory: React.FC<MurabahahHistoryProps> = ({ kontrak, onEdit, onDelete }) => {
  const [transactions, setTransactions] = useState<TransaksiMurabahah[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kontrak.id) return;
    setLoading(true); // Selalu set loading saat kontrak berubah
    const q = query(collection(db, "kontrak_murabahah", kontrak.id, "transaksi"), orderBy("tanggal", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const trans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TransaksiMurabahah[];
        setTransactions(trans);
        setLoading(false);
    }, (error) => {
        console.error("Gagal mengambil riwayat transaksi: ", error);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [kontrak.id]);
  
  return (
    <>
      <div className="overflow-x-auto p-2 max-h-96">
        {loading ? <p className="p-4 text-center text-sm">Memuat riwayat...</p>
        : transactions.length === 0 ? <p className="p-4 text-center text-sm text-gray-500">Belum ada riwayat pembayaran.</p>
        : (
            <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                <tr>
                    <th className="p-2 text-left font-medium text-gray-600">Tanggal</th>
                    <th className="p-2 text-left font-medium text-gray-600">Keterangan</th>
                    <th className="p-2 text-right font-medium text-gray-600">Pokok</th>
                    <th className="p-2 text-right font-medium text-gray-600">Margin</th>
                    <th className="p-2 text-right font-medium text-gray-600">Total</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y">
                {transactions.map(t => (
                    <tr key={t.id}>
                    <td className="p-2 whitespace-nowrap">{new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="p-2">{t.keterangan}</td>
                    <td className="p-2 text-right">{formatCurrency(t.jumlah_pokok)}</td>
                    <td className="p-2 text-right">{formatCurrency(t.jumlah_margin)}</td>
                    <td className="p-2 text-right font-semibold">{formatCurrency(t.jumlah_bayar)}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        )}
      </div>
      <div className="bg-gray-50 p-3 flex justify-end space-x-3 border-t rounded-b-lg">
          <button onClick={() => onEdit(kontrak)} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-lime-600">
              Edit Kontrak
          </button>
          <button onClick={() => onDelete(kontrak.id)} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">
              Hapus Kontrak
          </button>
      </div>
    </>
  );
};

export default MurabahahHistory;

