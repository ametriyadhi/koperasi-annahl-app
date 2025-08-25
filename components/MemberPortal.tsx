import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Anggota, KontrakMurabahah, TransaksiSimpanan } from '../types';
import { LogoIcon } from './icons'; // Menggunakan LogoIcon yang sudah ada

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

// Komponen Kartu Info Sederhana
const InfoCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-white p-4 rounded-xl shadow-md text-center">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-primary mt-1">{value}</p>
    </div>
);

// Komponen Utama Portal Anggota
const MemberPortal: React.FC = () => {
    const { currentUser, userProfile } = useAuth();
    const [anggotaData, setAnggotaData] = useState<Anggota | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userProfile && userProfile.anggota_id) {
            const unsub = onSnapshot(doc(db, "anggota", userProfile.anggota_id), (docSnap) => {
                if (docSnap.exists()) {
                    setAnggotaData({ id: docSnap.id, ...docSnap.data() } as Anggota);
                } else {
                    console.error("Data anggota tidak ditemukan!");
                }
                setLoading(false);
            });
            return () => unsub();
        } else {
            setLoading(false);
        }
    }, [userProfile]);

    const handleLogout = async () => {
        if (confirm("Apakah Anda yakin ingin keluar?")) {
            await signOut(auth);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Memuat data...</div>;
    }

    if (!anggotaData) {
        return (
            <div className="p-4 text-center">
                <p>Data anggota tidak ditemukan.</p>
                <p className="text-sm text-gray-600">Pastikan admin telah menghubungkan akun Anda dengan data keanggotaan.</p>
                <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-secondary text-white rounded-md">Logout</button>
            </div>
        );
    }
    
    const totalSimpanan = (anggotaData.simpanan_pokok || 0) + (anggotaData.simpanan_wajib || 0) + (anggotaData.simpanan_sukarela || 0);

    return (
        <div className="bg-light min-h-screen font-sans">
            {/* Header */}
            <header className="bg-primary text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <LogoIcon className="w-10 h-10"/>
                    <div>
                        <h1 className="font-bold text-lg">Koperasi An Nahl</h1>
                        <p className="text-xs opacity-90">Portal Anggota</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="text-sm font-semibold">Logout</button>
            </header>

            {/* Konten Utama */}
            <main className="p-4 space-y-6">
                <section className="text-center">
                    <h2 className="text-xl font-semibold text-gray-800">Selamat Datang,</h2>
                    <p className="text-2xl font-bold text-primary">{anggotaData.nama}</p>
                </section>

                {/* Ringkasan Keuangan */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard title="Total Simpanan" value={formatCurrency(totalSimpanan)} />
                    <InfoCard title="Pembiayaan Aktif" value="0" /> 
                </section>

                {/* Tambahkan Riwayat Transaksi & Pembiayaan di sini nanti */}
                <section className="bg-white p-4 rounded-xl shadow-md">
                    <h3 className="font-bold text-gray-700 mb-2">Fitur Segera Hadir</h3>
                    <p className="text-sm text-gray-600">- Riwayat Transaksi Simpanan</p>
                    <p className="text-sm text-gray-600">- Detail Pembiayaan Murabahah</p>
                </section>
            </main>
        </div>
    );
};

export default MemberPortal;
