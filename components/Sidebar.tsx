import React, { useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { HomeIcon, UsersIcon, WalletIcon, HandshakeIcon, BookIcon, ChartIcon, SettingsIcon, LogoIcon } from './icons';

type ViewType = 'Dashboard' | 'Anggota' | 'Simpanan' | 'Murabahah' | 'Simulator' | 'Proses Bulanan' | 'Akuntansi' | 'Laporan' | 'Pengaturan';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen }) => {
  const { userProfile, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();

  const navItems = [
    { name: 'Dashboard', icon: HomeIcon, view: 'Dashboard' },
    { name: 'Anggota & Unit', icon: UsersIcon, view: 'Anggota' },
    { name: 'Simpanan', icon: WalletIcon, view: 'Simpanan' },
    { name: 'Murabahah', icon: HandshakeIcon, view: 'Murabahah' },
    { name: 'Simulator', icon: ChartIcon, view: 'Simulator' },
    { name: 'Proses Bulanan', icon: BookIcon, view: 'Proses Bulanan' },
    { name: 'Akuntansi', icon: BookIcon, view: 'Akuntansi' },
    { name: 'Laporan', icon: ChartIcon, view: 'Laporan' },
    { name: 'Pengaturan', icon: SettingsIcon, view: 'Pengaturan' },
  ];

  const accessibleNavItems = useMemo(() => {
    if (authLoading || settingsLoading || !userProfile || !settings.menuAccess) {
      return [];
    }
    
    const userRole = userProfile.role;
    
    if (userRole === 'admin' || userRole === 'pengurus') {
        const allowedViews = settings.menuAccess[userRole] || [];
        return navItems.filter(item => allowedViews.includes(item.view));
    }

    return [];
  }, [userProfile, settings, authLoading, settingsLoading]);

  return (
    <aside className={`flex-shrink-0 bg-white shadow-lg flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-20'}`}>
      {/* --- PERUBAHAN DI SINI --- */}
      <div className={`h-20 flex items-center justify-center border-b border-gray-200 bg-gray-50`}>
        {isOpen ? (
            <div className="flex items-center gap-2 px-2">
                <LogoIcon className="w-10 h-10 flex-shrink-0"/>
                <h1 className="text-lg font-bold tracking-wide text-gray-800">Koperasi An Nahl</h1>
            </div>
        ) : (
            <LogoIcon className="w-10 h-10"/>
        )}
      </div>
      <nav className={`flex-1 py-6 space-y-2 ${isOpen ? 'px-4' : 'px-2'}`}>
        {(authLoading || settingsLoading) ? (
            <p className="text-center text-xs text-gray-500">Memuat menu...</p>
        ) : (
            accessibleNavItems.map((item) => (
              <button
                key={item.name}
                title={isOpen ? '' : item.name}
                onClick={() => setActiveView(item.view as ViewType)}
                className={`flex items-center w-full py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isOpen ? 'px-4' : 'justify-center'} ${
                  activeView === item.view
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isOpen ? 'mr-3' : 'mr-0'}`} />
                <span className={`whitespace-nowrap transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 w-0 h-0'}`}>{item.name}</span>
              </button>
            ))
        )}
      </nav>
      <div className={`p-4 border-t transition-opacity duration-200 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 h-0 p-0 overflow-hidden'}`}>
          <p className="text-xs text-gray-500 text-center">&copy; 2024 An Nahl Islamic School</p>
      </div>
    </aside>
  );
};

export default Sidebar;



