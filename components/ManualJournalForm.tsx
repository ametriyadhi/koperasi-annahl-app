import React, { useState, useMemo } from 'react';
import type { Akun, JurnalEntryLine } from '../types';
import { PlusCircleIcon, TrashIcon } from './icons';

interface ManualJournalFormProps {
  onSave: (deskripsi: string, lines: JurnalEntryLine[]) => void;
  onClose: () => void;
  accounts: Akun[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

let nextId = 3;

const ManualJournalForm: React.FC<ManualJournalFormProps> = ({ onSave, onClose, accounts }) => {
    const [deskripsi, setDeskripsi] = useState('');
    const [lines, setLines] = useState([
        { id: 1, akun_id: '', debit: 0, kredit: 0 },
        { id: 2, akun_id: '', debit: 0, kredit: 0 },
    ]);

    const handleLineChange = (id: number, field: 'akun_id' | 'debit' | 'kredit', value: string) => {
        setLines(lines.map(line => {
            if (line.id !== id) return line;

            if (field === 'akun_id') {
                return { ...line, akun_id: value };
            } else {
                const numericValue = parseFloat(value);
                return { ...line, [field]: isNaN(numericValue) ? 0 : numericValue };
            }
        }));
    };
    
    const addLine = () => {
        setLines([...lines, { id: nextId++, akun_id: '', debit: 0, kredit: 0 }]);
    };

    const removeLine = (id: number) => {
        setLines(lines.filter(line => line.id !== id));
    };

    const { totalDebit, totalKredit, isBalanced } = useMemo(() => {
        const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
        const totalKredit = lines.reduce((sum, line) => sum + (line.kredit || 0), 0);
        return {
            totalDebit,
            totalKredit,
            isBalanced: totalDebit === totalKredit && totalDebit > 0,
        };
    }, [lines]);

    const handleSubmit = () => {
        if (!isBalanced) {
            alert('Jurnal tidak seimbang! Total Debit harus sama dengan Total Kredit.');
            return;
        }
        if (!deskripsi.trim()) {
            alert('Deskripsi jurnal tidak boleh kosong.');
            return;
        }
        
        const finalLines: JurnalEntryLine[] = lines
            .filter(line => line.akun_id && (line.debit > 0 || line.kredit > 0))
            .map(line => {
                const account = accounts.find(a => a.id === line.akun_id);
                return {
                    akun_id: line.akun_id || '',
                    akun_kode: account?.kode || 'N/A',
                    akun_nama: account?.nama || 'N/A',
                    debit: line.debit || 0,
                    kredit: line.kredit || 0,
                };
            });

        if (finalLines.length < 2) {
            alert("Jurnal harus memiliki setidaknya dua baris (satu debit dan satu kredit) yang valid.");
            return;
        }

        onSave(deskripsi, finalLines);
    };

    const availableAccounts = accounts.filter(a => a.parent_kode);

    return (
        <div className="space-y-4 text-sm">
            <div>
                <label className="block text-sm font-medium text-gray-700">Deskripsi Jurnal</label>
                <input type="text" value={deskripsi} onChange={e => setDeskripsi(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" placeholder="cth: Pembelian ATK bulan Agustus" required />
            </div>

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
                                    <select value={line.akun_id} onChange={e => handleLineChange(line.id, 'akun_id', e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm text-sm">
                                        <option value="">Pilih Akun...</option>
                                        {availableAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.kode} - {acc.nama}</option>)}
                                    </select>
                                </td>
                                <td className="px-2 py-1">
                                    <input type="number" value={line.debit || ''} onChange={e => handleLineChange(line.id, 'debit', e.target.value)} className="w-full text-right border-gray-300 rounded-md shadow-sm text-sm"/>
                                </td>
                                 <td className="px-2 py-1">
                                    <input type="number" name="kredit" value={line.kredit || ''} onChange={e => handleLineChange(line.id, 'kredit', e.target.value)} className="w-full text-right border-gray-300 rounded-md shadow-sm text-sm"/>
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
            
            <div className="bg-gray-50 p-3 rounded-lg flex justify-end space-x-8">
                <div className="text-right">
                    <p className="text-xs text-gray-500">Total Debit</p>
                    <p className="font-semibold text-gray-800">{formatCurrency(totalDebit)}</p>
                </div>
                 <div className="text-right">
                    <p className="text-xs text-gray-500">Total Kredit</p>
                    <p className="font-semibold text-gray-800">{formatCurrency(totalKredit)}</p>
                </div>
                 <div className={`text-right p-2 rounded ${isBalanced ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p className="text-xs text-gray-500">Selisih</p>
                    <p className={`font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totalDebit - totalKredit)}</p>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">
                    Batal
                </button>
                 <button onClick={handleSubmit} disabled={!isBalanced} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-amber-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
                    Simpan Jurnal
                </button>
            </div>
        </div>
    );
};

export default ManualJournalForm;

