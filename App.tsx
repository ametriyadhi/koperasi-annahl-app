import React, { useState } from 'react';
import { SettingsProvider } from './components/SettingsContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Members from './components/Members';
import Savings from './components/Savings';
import Murabahah from './components/Murabahah';
import MurabahahSimulator from './components/Simulator';
import MonthlyProcess from './components/MonthlyProcess'; // <-- Impor komponen baru
import Accounting from './components/Accounting';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { MenuIcon } from './components/icons';

type ViewType = 'Dashboard' | 'Anggota' | 'Simpanan' | 'Murabahah' | 'Simulator' | 'Proses Bulanan' | 'Akuntansi' | 'Laporan' | 'Pengaturan';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderView = () => {
    switch (activeView) {
      case 'Dashboard': return <Dashboard />;
      case 'Anggota': return <Members />;
      case 'Simpanan': return <Savings />;
      case 'Murabahah': return <Murabahah />;
      case 'Simulator': return <MurabahahSimulator />;
      case 'Proses Bulanan': return <MonthlyProcess />; // <-- Tambahkan case baru
      case 'Akuntansi': return <Accounting />;
      case 'Laporan': return <Reports />;
      case 'Pengaturan': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <SettingsProvider>
      <div className="flex h-screen bg-light text-gray-800">
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          isOpen={isSidebarOpen} 
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow-sm h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0">
              <div className="flex items-center">
                  <button onClick={toggleSidebar} className="text-gray-500 hover:text-primary focus:outline-none">
                      <MenuIcon className="w-6 h-6" />
                  </button>
              </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
               {renderView()}
            </div>
          </main>
        </div>
      </div>
    </SettingsProvider>
  );
};

export default App;


