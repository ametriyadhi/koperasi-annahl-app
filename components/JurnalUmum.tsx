import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { JurnalEntry } from '../types';
import { TrashIcon, PencilIcon } from './icons'; // PencilIcon ditambahkan

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

// Prop 'onEdit' ditambahkan
interface JurnalUmumProps {
    onDelete: (jurnalId: string) => void;
    onEdit: (jurnal: JurnalEntry) => void; 
}

const JurnalUmum: React.FC<JurnalUmumProps> = ({ onDelete, onEdit }) => {
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
                    <div className="flex justify-between items-start border-b pb-2 mb-2">
                        <div>
                            <p className="font-semibold">{entry.deskripsi}</p>
                            <p className="text-sm text-gray-500">{new Date(entry.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        {/* Tombol Aksi Baru */}
                        <div className="flex items-center space-x-2">
                             <button 
                                onClick={() => onEdit(entry)} 
                                className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100"
                                title="Edit Jurnal Ini"
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => onDelete(entry.id)} 
                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                                title="Hapus Jurnal Ini"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
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


