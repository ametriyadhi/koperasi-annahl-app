import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/auth/AuthContext';
import { SettingsProvider } from './components/settings/SettingsContext';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

import Login from './components/auth/Login';
import MemberPortal from './components/members/MemberPortal/MemberPortal';
import Sidebar from './components/core/Sidebar';
import Dashboard from './components/core/Dashboard';
import Members from './components/members/Members';
import Savings from './components/savings/Savings';
import Murabahah from './components/murabahah/Murabahah';
import MurabahahSimulator from './components/murabahah/Simulator';
import MonthlyProcess from './components/MonthlyProcess';
import Accounting from './components/accounting/Accounting';
import Reports from './components/reports/Reports';
import Settings from './components/settings/Settings';
import { MenuIcon } from './components/core/icons';

type ViewType = 'Dashboard' | 'Anggota' | 'Simpanan' | 'Murabahah' | 'Simulator' | 'Proses Bulanan' | 'Akuntansi' | 'Laporan' | 'Pengaturan';

const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const handleLogout = async () => { if (confirm("Yakin ingin keluar?")) await signOut(auth); };
  
  const renderView = () => {
    switch (activeView) {
      case 'Dashboard': return <Dashboard />;
      case 'Anggota': return <Members />;
      case 'Simpanan': return <Savings />;
      case 'Murabahah': return <Murabahah />;
      case 'Simulator': return <MurabahahSimulator />;
      case 'Proses Bulanan': return <MonthlyProcess />;
      case 'Akuntansi': return <Accounting />;
      case 'Laporan': return <Reports />;
      case 'Pengaturan': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-light text-gray-800">
      <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-50 border-b border-gray-200 h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0">
            <button onClick={toggleSidebar} className="text-gray-500 hover:text-primary focus:outline-none"><MenuIcon className="w-6 h-6" /></button>
            <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 hidden sm:block">{currentUser?.email}</span>
                <button onClick={handleLogout} className="px-4 py-2 bg-secondary text-white text-sm font-medium rounded-md hover:bg-orange-600">Logout</button>
            </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{renderView()}</div>
        </main>
      </div>
    </div>
  );
};

// AppGate sekarang jauh lebih sederhana
const AppGate: React.FC = () => {
    const { currentUser, userProfile } = useAuth();

    // Jika tidak ada user, tampilkan Login
    if (!currentUser) {
        return <Login />;
    }

    // Arahkan berdasarkan peran userProfile
    if (userProfile?.role === 'anggota') {
        return <MemberPortal />;
    }

    if (userProfile?.role === 'admin' || userProfile?.role === 'pengurus') {
        return <AdminDashboard />;
    }
    
    // Tampilan fallback jika user ada tapi tidak punya peran
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <h2 className="text-xl font-semibold">Akses Ditolak</h2>
            <p className="text-gray-600 mt-2">Peran Anda belum diatur atau tidak valid.</p>
            <p className="text-sm text-gray-500">Silakan hubungi admin koperasi untuk mendapatkan hak akses.</p>
            <button onClick={async () => await signOut(auth)} className="mt-6 px-4 py-2 bg-secondary text-white rounded-md hover:bg-orange-600">
                Logout
            </button>
        </div>
    );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppGate />
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;


