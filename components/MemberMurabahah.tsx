import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Anggota, KontrakMurabahah } from '../types';
import { StatusKontrak } from '../types';
import { useSettings } from './SettingsContext';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

interface MemberMurabahahProps {
    anggota: Anggota;
}

const MemberMurabahah: React.FC<MemberMurabahahProps> = ({ anggota }) => {
    const { settings } = useSettings();
    const [pengajuanList, setPengajuanList] = useState<KontrakMurabahah[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ nama_barang: '', harga_pokok: 0, tenor: 12 });

    useEffect(() => {
        const q = query(collection(db, "kontrak_murabahah"), where("anggota_id", "==", anggota.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const contracts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KontrakMurabahah));
            contracts.sort((a, b) => new Date(b.tanggal_akad).getTime() - new Date(a.tanggal_akad).getTime());
            setPengajuanList(contracts);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [anggota.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nama_barang || formData.harga_pokok <= 0) {
            alert("Nama barang dan harga harus diisi.");
            return;
        }

        const { harga_pokok, tenor } = formData;
        let marginPersen;
        if (tenor <= 6) marginPersen = settings.margin_tenor_6;
        else if (tenor <= 12) marginPersen = settings.margin_tenor_12;
        else if (tenor <= 18) marginPersen = settings.margin_tenor_18;
        else marginPersen = settings.margin_tenor_24;

        const margin = harga_pokok * (marginPersen / 100);
        const harga_jual = harga_pokok + margin;
        const cicilan_per_bulan = harga_jual / tenor;

        const newKontrak: Omit<KontrakMurabahah, 'id'> = {
            anggota_id: anggota.id,
            nama_barang: formData.nama_barang,
            harga_pokok,
            margin,
            harga_jual,
            uang_muka: 0,
            tenor,
            cicilan_per_bulan,
            tanggal_akad: new Date().toISOString(),
            status: StatusKontrak.REVIEW,
            cicilan_terbayar: 0,
        };

        await addDoc(collection(db, "kontrak_murabahah"), newKontrak);
        alert("Pengajuan berhasil dikirim dan akan segera ditinjau oleh pengurus.");
        setShowForm(false);
        setFormData({ nama_barang: '', harga_pokok: 0, tenor: 12 });
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-primary">Pembiayaan Saya</h2>
                <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md">
                    {showForm ? 'Tutup' : '+ Ajukan Baru'}
                </button>
            </div>

            {showForm && (
                <div className="p-4 bg-white rounded-lg shadow-md">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium">Nama Barang</label>
                            <input type="text" value={formData.nama_barang} onChange={e => setFormData({...formData, nama_barang: e.target.value})} className="w-full p-2 mt-1 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Harga Barang (Rp)</label>
                            <input type="number" value={formData.harga_pokok || ''} onChange={e => setFormData({...formData, harga_pokok: Number(e.target.value)})} className="w-full p-2 mt-1 border rounded" />
                        </div>
                        <button type="submit" className="w-full bg-primary text-white font-bold py-2 rounded">Kirim Pengajuan</button>
                    </form>
                </div>
            )}

            {loading ? <p>Memuat...</p> : pengajuanList.map(p => (
                <div key={p.id} className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold">{p.nama_barang}</p>
                            <p className="text-sm text-gray-600">{formatCurrency(p.harga_jual)} ({p.tenor} bln)</p>
                        </div>
                        <span className="text-xs font-semibold bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">{p.status}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MemberMurabahah;
