import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import type { Anggota, KontrakMurabahah } from '../types';
import { LogoIcon, HomeIcon, ChartIcon, HandshakeIcon, WalletIcon } from './icons'; // WalletIcon ditambahkan
import MemberSimulator from './MemberSimulator';
import MemberMurabahah from './MemberMurabahah';
import MemberSavings from './MemberSavings'; // Komponen baru diimpor

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const InfoCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-white p-4 rounded-xl shadow-md text-center flex flex-col justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-primary mt-1">{value}</p>
    </div>
);

// --- PERUBAHAN: Menambahkan 'Simpanan' ke dalam view ---
type MemberView = 'Beranda' | 'Simpanan' | 'Simulator' | 'Pembiayaan';

const MemberPortal: React.FC = () => {
    const { userProfile } = useAuth();
    const [anggotaData, setAnggotaData] = useState<Anggota | null>(null);
    const [kontrakList, setKontrakList] = useState<KontrakMurabahah[]>([]); // State baru untuk data kontrak
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<MemberView>('Beranda');

    // --- PERBAIKAN: Logika pengambilan data diperbaiki total ---
    useEffect(() => {
        if (userProfile && userProfile.anggota_id) {
            // Listener untuk data anggota
            const unsubAnggota = onSnapshot(doc(db, "anggota", userProfile.anggota_id), (docSnap) => {
                if (docSnap.exists()) {
                    setAnggotaData({ id: docSnap.id, ...docSnap.data() } as Anggota);
                } else {
                    setAnggotaData(null); // Anggota tidak ditemukan
                }
                setLoading(false); // Selesaikan loading setelah data anggota didapat/tidak didapat
            });

            // Listener untuk data pembiayaan aktif
            const q = query(collection(db, "kontrak_murabahah"), where("anggota_id", "==", userProfile.anggota_id), where("status", "==", "Berjalan"));
            const unsubKontrak = onSnapshot(q, (snapshot) => {
                const contracts = snapshot.docs.map(doc => doc.data() as KontrakMurabahah);
                setKontrakList(contracts);
            });

            return () => {
                unsubAnggota();
                unsubKontrak();
            };
        } else if (userProfile) {
            // Jika user profile ada tapi tidak ada anggota_id
            setLoading(false);
        }
    }, [userProfile]);

    const handleLogout = async () => { if (window.confirm("Yakin ingin keluar?")) await signOut(auth); };

    // --- PENAMBAHAN: Kalkulasi untuk dashboard diperkaya ---
    const dashboardValues = useMemo(() => {
        if (!anggotaData) return { totalSimpanan: 0, totalCicilan: 0 };
        const totalSimpanan = (anggotaData.simpanan_pokok || 0) + (anggotaData.simpanan_wajib || 0) + (anggotaData.simpanan_sukarela || 0);
        const totalCicilan = kontrakList.reduce((sum, kontrak) => sum + kontrak.cicilan_per_bulan, 0);
        return { totalSimpanan, totalCicilan };
    }, [anggotaData, kontrakList]);

    const renderContent = () => {
        if (!anggotaData) return null; // Ditangani oleh pengecekan utama
        switch (activeView) {
            case 'Simpanan': return <MemberSavings anggota={anggotaData} />;
            case 'Simulator': return <MemberSimulator anggota={anggotaData} />;
            case 'Pembiayaan': return <MemberMurabahah anggota={anggotaData} />;
            case 'Beranda':
            default:
                return (
                    <main className="p-4 space-y-6">
                        <section className="text-center">
                            <h2 className="text-xl font-semibold text-gray-800">Selamat Datang,</h2>
                            <p className="text-2xl font-bold text-primary">{anggotaData.nama}</p>
                        </section>
                        {/* --- PENAMBAHAN: Kartu dashboard diperkaya --- */}
                        <section className="grid grid-cols-2 gap-4">
                            <InfoCard title="Total Simpanan" value={formatCurrency(dashboardValues.totalSimpanan)} />
                            <InfoCard title="Total Cicilan / Bulan" value={formatCurrency(dashboardValues.totalCicilan)} />
                            <InfoCard title="SHU Tahun Lalu" value={formatCurrency(0)} />
                            <InfoCard title="Pembiayaan Aktif" value={kontrakList.length.toString()} />
                        </section>
                    </main>
                );
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Memuat data anggota...</div>;
    }

    if (!anggotaData) {
        return (
            <div className="p-4 text-center mt-10">
                <h2 className="font-bold text-lg">Data Anggota Tidak Ditemukan</h2>
                <p className="text-sm text-gray-600 mt-2">Akun Anda belum terhubung dengan data keanggotaan. Silakan hubungi admin koperasi untuk bantuan.</p>
                <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-secondary text-white rounded-md">Logout</button>
            </div>
        );
    }

    return (
        <div className="bg-light min-h-screen font-sans pb-20">
            <header className="bg-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <LogoIcon className="w-10 h-10"/>
                    <div>
                        <h1 className="font-bold text-lg text-primary">Koperasi An Nahl</h1>
                        <p className="text-xs text-gray-600">Portal Anggota</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="text-sm font-semibold text-secondary">Logout</button>
            </header>

            {renderContent()}

            {/* --- PERUBAHAN: Menambahkan tombol menu 'Simpanan' --- */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] flex justify-around">
                <button onClick={() => setActiveView('Beranda')} className={`flex flex-col items-center justify-center p-2 w-full ${activeView === 'Beranda' ? 'text-primary' : 'text-gray-500'}`}>
                    <HomeIcon className="w-6 h-6 mb-1" />
                    <span className="text-xs">Beranda</span>
                </button>
                <button onClick={() => setActiveView('Simpanan')} className={`flex flex-col items-center justify-center p-2 w-full ${activeView === 'Simpanan' ? 'text-primary' : 'text-gray-500'}`}>
                    <WalletIcon className="w-6 h-6 mb-1" />
                    <span className="text-xs">Simpanan</span>
                </button>
                <button onClick={() => setActiveView('Simulator')} className={`flex flex-col items-center justify-center p-2 w-full ${activeView === 'Simulator' ? 'text-primary' : 'text-gray-500'}`}>
                    <ChartIcon className="w-6 h-6 mb-1" />
                    <span className="text-xs">Simulator</span>
                </button>
                <button onClick={() => setActiveView('Pembiayaan')} className={`flex flex-col items-center justify-center p-2 w-full ${activeView === 'Pembiayaan' ? 'text-primary' : 'text-gray-500'}`}>
                    <HandshakeIcon className="w-6 h-6 mb-1" />
                    <span className="text-xs">Pembiayaan</span>
                </button>
            </nav>
        </div>
    );
};

export default MemberPortal;



