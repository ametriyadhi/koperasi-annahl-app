import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Anggota } from '../types';
import { LogoIcon, HomeIcon, ChartIcon, HandshakeIcon } from './icons';
import MemberSimulator from './MemberSimulator';
import MemberMurabahah from './MemberMurabahah';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const InfoCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-white p-4 rounded-xl shadow-md text-center">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-primary mt-1">{value}</p>
    </div>
);

type MemberView = 'Beranda' | 'Simulator' | 'Pembiayaan';

const MemberPortal: React.FC = () => {
    const { userProfile } = useAuth();
    const [anggotaData, setAnggotaData] = useState<Anggota | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<MemberView>('Beranda');

    useEffect(() => {
        if (userProfile && userProfile.anggota_id) {
            const unsub = onSnapshot(doc(db, "anggota", userProfile.anggota_id), (docSnap) => {
                if (docSnap.exists()) {
                    setAnggotaData({ id: docSnap.id, ...docSnap.data() } as Anggota);
                }
                setLoading(false);
            });
            return () => unsub();
        } else {
            setLoading(false);
        }
    }, [userProfile]);

    const handleLogout = async () => { if (confirm("Yakin ingin keluar?")) await signOut(auth); };

    const renderContent = () => {
        if (!anggotaData) return null;
        switch (activeView) {
            case 'Simulator': return <MemberSimulator anggota={anggotaData} />;
            case 'Pembiayaan': return <MemberMurabahah anggota={anggotaData} />;
            case 'Beranda':
            default:
                const totalSimpanan = (anggotaData.simpanan_pokok || 0) + (anggotaData.simpanan_wajib || 0) + (anggotaData.simpanan_sukarela || 0);
                return (
                    <main className="p-4 space-y-6">
                        <section className="text-center">
                            <h2 className="text-xl font-semibold text-gray-800">Selamat Datang,</h2>
                            <p className="text-2xl font-bold text-primary">{anggotaData.nama}</p>
                        </section>
                        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoCard title="Total Simpanan" value={formatCurrency(totalSimpanan)} />
                            <InfoCard title="Pembiayaan Aktif" value="0" />
                        </section>
                    </main>
                );
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">Memuat data...</div>;
    if (!anggotaData) return <div className="p-4 text-center">Data anggota tidak ditemukan. <button onClick={handleLogout}>Logout</button></div>;

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

            <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] flex justify-around">
                <button onClick={() => setActiveView('Beranda')} className={`flex flex-col items-center justify-center p-2 w-full ${activeView === 'Beranda' ? 'text-primary' : 'text-gray-500'}`}>
                    <HomeIcon className="w-6 h-6 mb-1" />
                    <span className="text-xs">Beranda</span>
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


