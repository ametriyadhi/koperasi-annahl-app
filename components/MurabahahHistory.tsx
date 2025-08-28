import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { TransaksiMurabahah } from '../types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

interface MurabahahHistoryProps {
  kontrakId: string;
}

const MurabahahHistory: React.FC<MurabahahHistoryProps> = ({ kontrakId }) => {
  const [transactions, setTransactions] = useState<TransaksiMurabahah[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kontrakId) return;
    const q = query(collection(db, "kontrak_murabahah", kontrakId, "transaksi"), orderBy("tanggal", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const trans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TransaksiMurabahah[];
        setTransactions(trans);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [kontrakId]);

  if (loading) return <p className="p-4 text-center text-sm">Memuat riwayat...</p>;
  if (transactions.length === 0) return <p className="p-4 text-center text-sm text-gray-500">Belum ada riwayat pembayaran.</p>;

  return (
    <div className="overflow-x-auto p-2">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
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
    </div>
  );
};

export default MurabahahHistory;
