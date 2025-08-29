import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { TransaksiMurabahah, KontrakMurabahah } from '../types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

interface MurabahahHistoryProps {
    kontrak: KontrakMurabahah;
    // Jadikan onEdit dan onDelete opsional
    onEdit?: (kontrak: KontrakMurabahah) => void;
    onDelete?: (id: string) => void;
}

const MurabahahHistory: React.FC<MurabahahHistoryProps> = ({ kontrak, onEdit, onDelete }) => {
    const [transaksiList, setTransaksiList] = useState<TransaksiMurabahah[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Pengaman jika kontrak atau id tidak ada
        if (!kontrak?.id) {
            setLoading(false);
            return;
        }
        
        const q = query(collection(db, "kontrak_murabahah", kontrak.id, "transaksi"), orderBy("tanggal", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const transactions = snapshot.docs.map(doc => doc.data() as TransaksiMurabahah);
            setTransaksiList(transactions);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [kontrak?.id]);

    const showActions = onEdit && onDelete; // Tampilkan aksi hanya jika fungsi onEdit dan onDelete diberikan

    return (
        <div>
            <div className="p-4 space-y-2">
                {loading ? (
                    <p className="text-center text-sm text-gray-500">Memuat riwayat...</p>
                ) : transaksiList.length === 0 ? (
                    <p className="text-center text-sm text-gray-500">Belum ada riwayat pembayaran.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="text-left">
                            <tr>
                                <th className="py-1 font-medium">Tanggal</th>
                                <th className="py-1 font-medium text-right">Jumlah</th>
                                <th className="py-1 font-medium">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transaksiList.map((t, index) => (
                                <tr key={index} className="border-t">
                                    <td className="py-2">{new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
                                    <td className="py-2 text-right font-semibold text-green-600">{formatCurrency(t.jumlah)}</td>
                                    <td className="py-2 pl-2">{t.keterangan}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {/* Tampilkan footer HANYA jika ini adalah view admin */}
            {showActions && (
                 <div className="bg-gray-50 p-3 flex justify-end space-x-3 rounded-b-lg">
                    <button onClick={() => onEdit?.(kontrak)} className="px-4 py-2 bg-yellow-500 text-white text-xs font-bold rounded-md hover:bg-yellow-600">
                        Edit Kontrak
                    </button>
                    <button onClick={() => onDelete?.(kontrak.id)} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-md hover:bg-red-700">
                        Hapus Kontrak
                    </button>
                </div>
            )}
        </div>
    );
};

export default MurabahahHistory;



