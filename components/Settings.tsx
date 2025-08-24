import React, { useState, useMemo } from 'react';
import Card from './shared/Card';
import { PercentIcon, ShieldIcon } from './icons';

type SettingsTab = 'Kebijakan' | 'SHU' | 'Hak Akses';

const initialMarginPolicies = {
  '12': 15,
  '24': 18,
  '36': 20,
};

const initialShuPercentages = {
  cadangan: 25,
  jasaModal: 40,
  jasaUsaha: 25,
  pendidikan: 5,
  sosial: 5,
};

const userRoles = [
    { name: 'Admin Sistem', permissions: 'Akses penuh ke semua modul dan pengaturan.'},
    { name: 'Akuntan', permissions: 'Kelola COA, Jurnal, Tutup Buku, Finalisasi Laporan.'},
    { name: 'Bendahara', permissions: 'Proses transaksi simpanan, angsuran, dan rekonsiliasi bank.'},
    { name: 'Petugas Unit', permissions: 'Input anggota baru, verifikasi berkas, dan bantu pengajuan.'},
    { name: 'Anggota', permissions: 'Lihat profil, saldo, riwayat transaksi, dan ajukan pembiayaan.'},
]

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('Kebijakan');
  const [marginPolicies, setMarginPolicies] = useState(initialMarginPolicies);
  const [financingCeiling, setFinancingCeiling] = useState(35);
  const [shuPercentages, setShuPercentages] = useState(initialShuPercentages);

  const totalShu = useMemo(() => {
    return Object.values(shuPercentages).reduce((sum, value) => sum + value, 0);
  }, [shuPercentages]);

  const handleSave = (section: string) => {
    alert(`Pengaturan untuk "${section}" telah disimpan! (Simulasi)`);
    // In a real app, you would dispatch an action or make an API call here.
    console.log({ marginPolicies, financingCeiling, shuPercentages });
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'Kebijakan':
        return (
          <div className="space-y-8">
            <Card title="Kebijakan Margin Pembiayaan">
              <div className="space-y-4">
                 {Object.entries(marginPolicies).map(([tenor, margin]) => (
                   <div key={tenor} className="flex items-center justify-between">
                     <label className="text-sm text-gray-600">Margin untuk tenor s.d. {tenor} bulan</label>
                     <div className="relative">
                        <input
                            type="number"
                            value={margin}
                            onChange={(e) => setMarginPolicies(prev => ({ ...prev, [tenor]: Number(e.target.value) }))}
                            className="w-24 pl-3 pr-7 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                     </div>
                   </div>
                 ))}
              </div>
              <div className="mt-6 border-t pt-4 flex justify-end">
                <button onClick={() => handleSave('Kebijakan Margin')} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    Simpan Perubahan
                </button>
              </div>
            </Card>
            <Card title="Plafon Pembiayaan">
                <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600">Batas Maks. Cicilan (% dari Gaji Bersih)</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={financingCeiling}
                            onChange={(e) => setFinancingCeiling(Number(e.target.value))}
                            className="w-24 pl-3 pr-7 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                        />
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                    </div>
                </div>
                 <div className="mt-6 border-t pt-4 flex justify-end">
                    <button onClick={() => handleSave('Plafon Pembiayaan')} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Simpan Perubahan
                    </button>
                </div>
            </Card>
          </div>
        );
      case 'SHU':
        return (
          <Card title="Alokasi Sisa Hasil Usaha (SHU)">
             <div className="space-y-4">
                 {Object.entries(shuPercentages).map(([key, value]) => (
                   <div key={key} className="flex items-center justify-between">
                     <label className="text-sm text-gray-600 capitalize">Dana {key.replace('jasa', 'Jasa ')}</label>
                      <div className="relative">
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => setShuPercentages(prev => ({...prev, [key]: Number(e.target.value)}))}
                            className="w-24 pl-3 pr-7 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                      </div>
                   </div>
                 ))}
             </div>
             <div className={`mt-4 pt-4 border-t flex justify-between items-center font-bold ${totalShu !== 100 ? 'text-red-600' : 'text-gray-800'}`}>
                <span>Total Alokasi</span>
                <span>{totalShu}%</span>
             </div>
             {totalShu !== 100 && <p className="text-xs text-red-600 text-right mt-1">Total alokasi harus 100%.</p>}
             <div className="mt-6 pt-4 border-t flex justify-end">
                <button disabled={totalShu !== 100} onClick={() => handleSave('Alokasi SHU')} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-amber-500 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    Simpan Perubahan
                </button>
            </div>
          </Card>
        );
      case 'Hak Akses':
        return (
            <Card title="Peran dan Hak Akses Pengguna">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peran</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi Hak Akses</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {userRoles.map(role => (
                                <tr key={role.name}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role.name}</td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{role.permissions}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-primary hover:text-amber-600">Kelola</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        );
      default:
        return null;
    }
  };

  const tabs: { name: SettingsTab, icon: React.FC<{className?: string}> }[] = [
      { name: 'Kebijakan', icon: PercentIcon },
      { name: 'SHU', icon: PercentIcon },
      { name: 'Hak Akses', icon: ShieldIcon },
  ];

  return (
    <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Pengaturan Sistem</h2>
        <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.name}
                        onClick={() => setActiveTab(tab.name)}
                        className={`flex items-center group whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === tab.name
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <tab.icon className={`w-5 h-5 mr-2 ${activeTab === tab.name ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        {tab.name}
                    </button>
                ))}
            </nav>
        </div>
        <div>
            {renderContent()}
        </div>
    </div>
  );
};

export default Settings;