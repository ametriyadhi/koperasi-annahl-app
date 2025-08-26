import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { JurnalEntry } from '../types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const JurnalUmum: React.FC = () => {
    const [jurnalEntries, setJurnalEntries] = useState<JurnalEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "jurnal_umum"), orderBy("tanggal", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JurnalEntry));
            setJurnalEntries(entries);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <p className="p-6 text-center">Memuat jurnal umum...</p>;
    }

    return (
        <div className="space-y-4">
            {jurnalEntries.map(entry => (
                <div key={entry.id} className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                        <p className="font-semibold">{entry.deskripsi}</p>
                        <p className="text-sm text-gray-500">{new Date(entry.tanggal).toLocaleDateString('id-ID')}</p>
                    </div>
                    <table className="w-full text-sm">
                        <tbody>
                            {entry.lines.map((line, index) => (
                                <tr key={index}>
                                    <td className={`py-1 ${line.kredit > 0 ? 'pl-8' : ''}`}>{line.akun_kode} - {line.akun_nama}</td>
                                    <td className="py-1 text-right w-1/4">{line.debit > 0 ? formatCurrency(line.debit) : ''}</td>
                                    <td className="py-1 text-right w-1/4">{line.kredit > 0 ? formatCurrency(line.kredit) : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
            {jurnalEntries.length === 0 && <p className="text-center text-gray-500 py-4">Belum ada entri jurnal.</p>}
        </div>
    );
};

export default JurnalUmum;

