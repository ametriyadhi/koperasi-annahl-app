import React, { useState, useMemo } from 'react';
import { CHART_OF_ACCOUNTS } from '../constants';
import { PlusCircleIcon, TrashIcon } from './icons';

interface JournalLine {
  id: number;
  accountId: string;
  debit: number;
  credit: number;
}

interface ManualJournalProps {
    onSave: (data: any) => void;
    onClose: () => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

let nextId = 3;

const ManualJournal: React.FC<ManualJournalProps> = ({ onSave, onClose }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [memo, setMemo] = useState('');
    const [lines, setLines] = useState<JournalLine[]>([
        { id: 1, accountId: '', debit: 0, credit: 0 },
        { id: 2, accountId: '', debit: 0, credit: 0 },
    ]);

    const handleLineChange = (id: number, field: keyof JournalLine, value: string | number) => {
        setLines(lines.map(line => {
            if (line.id === id) {
                 const numericValue = typeof value === 'string' && field !== 'accountId' ? parseFloat(value) || 0 : value;
                return { ...line, [field]: numericValue };
            }
            return line;
        }));
    };
    
    const addLine = () => {
        setLines([...lines, { id: nextId++, accountId: '', debit: 0, credit: 0 }]);
    };

    const removeLine = (id: number) => {
        setLines(lines.filter(line => line.id !== id));
    };

    const { totalDebit, totalCredit, isBalanced } = useMemo(() => {
        const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
        return {
            totalDebit,
            totalCredit,
            isBalanced: totalDebit === totalCredit && totalDebit > 0,
        };
    }, [lines]);

    const handleSubmit = () => {
        if (!isBalanced) {
            alert('Jurnal tidak seimbang! Total Debit harus sama dengan Total Kredit.');
            return;
        }
        onSave({ date, memo, lines });
    };

    const availableAccounts = CHART_OF_ACCOUNTS.filter(a => a.parent_kode);

    return (
        <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="journal-date" className="block text-sm font-medium text-gray-700">Tanggal Transaksi</label>
                    <input type="date" id="journal-date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary"/>
                </div>
                <div>
                     <label htmlFor="journal-memo" className="block text-sm font-medium text-gray-700">Memo / Deskripsi</label>
                    <input type="text" id="journal-memo" value={memo} onChange={e => setMemo(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary" placeholder="cth: Biaya operasional bulan ini"/>
                </div>
            </div>

            {/* Journal Lines Table */}
            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-2/5">Akun</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Kredit</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {lines.map(line => (
                            <tr key={line.id}>
                                <td className="px-2 py-1">
                                    <select value={line.accountId} onChange={e => handleLineChange(line.id, 'accountId', e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm">
                                        <option value="">Pilih Akun...</option>
                                        {availableAccounts.map(acc => <option key={acc.kode} value={acc.kode}>{acc.kode} - {acc.nama}</option>)}
                                    </select>
                                </td>
                                <td className="px-2 py-1">
                                    <input type="number" value={line.debit || ''} onChange={e => handleLineChange(line.id, 'debit', e.target.value)} className="w-full text-right border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm"/>
                                </td>
                                 <td className="px-2 py-1">
                                    <input type="number" value={line.credit || ''} onChange={e => handleLineChange(line.id, 'credit', e.target.value)} className="w-full text-right border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm"/>
                                </td>
                                <td className="px-2 py-1 text-center">
                                    <button onClick={() => removeLine(line.id)} className="text-red-500 hover:text-red-700 disabled:text-gray-400" disabled={lines.length <= 2}>
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <button onClick={addLine} className="w-full flex items-center justify-center p-2 text-sm text-secondary hover:bg-lime-50">
                    <PlusCircleIcon className="w-5 h-5 mr-2" />
                    Tambah Baris
                </button>
            </div>
            
            {/* Totals */}
            <div className="bg-gray-50 p-3 rounded-lg flex justify-end space-x-8">
                <div className="text-right">
                    <p className="text-xs text-gray-500">Total Debit</p>
                    <p className="font-semibold text-gray-800">{formatCurrency(totalDebit)}</p>
                </div>
                 <div className="text-right">
                    <p className="text-xs text-gray-500">Total Kredit</p>
                    <p className="font-semibold text-gray-800">{formatCurrency(totalCredit)}</p>
                </div>
                 <div className="text-right">
                    <p className="text-xs text-gray-500">Selisih</p>
                    <p className={`font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totalDebit - totalCredit)}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
                <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                    Batal
                </button>
                 <button onClick={handleSubmit} disabled={!isBalanced} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-amber-500 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    Simpan Jurnal
                </button>
            </div>
        </div>
    );
};

export default ManualJournal;