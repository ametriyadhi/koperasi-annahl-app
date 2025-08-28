import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, TransaksiSimpanan } from '../types';
import Card from './shared/Card';

// Helper untuk format mata uang
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

// Komponen untuk satu baris saldo
const SaldoRow: React.FC<{ title: string, value: number }> = ({ title, value }) => (
    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
        <p className="font-medium text-gray-700">{title}</p>
        <p className="text-lg font-bold text-primary">{formatCurrency(value)}</p>
    </div>
);

interface MemberSavingsProps {
  anggota: Anggota;
}

const MemberSavings: React.FC<MemberSavingsProps> = ({ anggota }) => {
  const [transaksiList, setTransaksiList] = useState<TransaksiSimpanan[]>([]);
  const [loading, setLoading] = useState(true);

  // Mengambil riwayat transaksi simpanan milik anggota
  useEffect(() => {
    if (!anggota.id) return;
    const q = query(collection(db, "anggota", anggota.id, "transaksi"), orderBy("tanggal", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TransaksiSimpanan[];
        setTransaksiList(transactions);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [anggota.id]);

  return (
    <div className="p-4 space-y-6">
      <section className="space-y-3">
        <SaldoRow title="Simpanan Pokok" value={anggota.simpanan_pokok || 0} />
        <SaldoRow title="Simpanan Wajib" value={anggota.simpanan_wajib || 0} />
        <SaldoRow title="Simpanan Sukarela" value={anggota.simpanan_sukarela || 0} />
      </section>

      <Card title="Riwayat Transaksi">
        <div className="divide-y divide-gray-200">
          {loading ? (
            <p className="p-4 text-center text-gray-500">Memuat riwayat...</p>
          ) : transaksiList.length === 0 ? (
            <p className="p-4 text-center text-gray-500">Belum ada transaksi.</p>
          ) : (
            transaksiList.map(t => (
              <div key={t.id} className="p-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">{t.keterangan}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} - {t.jenis}
                  </p>
                </div>
                <p className={`text-sm font-bold ${t.tipe === 'Setor' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.tipe === 'Tarik' && '- '}{formatCurrency(t.jumlah)}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default MemberSavings;
