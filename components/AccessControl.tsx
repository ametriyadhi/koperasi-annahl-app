import React, { useState, useEffect } from 'react';
import { useSettings } from './SettingsContext';
import type { AppSettings, UserRole } from '../types';

const ALL_MENUS = ['Dashboard', 'Anggota', 'Simpanan', 'Murabahah', 'Simulator', 'Proses Bulanan', 'Akuntansi', 'Laporan', 'Pengaturan'];
const ROLES_TO_MANAGE: UserRole[] = ['admin', 'pengurus'];

const AccessControl: React.FC = () => {
    const { settings, saveSettings, loading } = useSettings();
    const [accessRules, setAccessRules] = useState<AppSettings['menuAccess']>(settings.menuAccess);

    useEffect(() => {
        setAccessRules(settings.menuAccess);
    }, [settings]);

    const handleCheckboxChange = (role: UserRole, menu: string, isChecked: boolean) => {
        setAccessRules(prev => {
            const currentMenus = prev[role] || [];
            const newMenus = isChecked
                ? [...currentMenus, menu]
                : currentMenus.filter(m => m !== menu);
            return { ...prev, [role]: newMenus };
        });
    };

    const handleSave = async () => {
        await saveSettings({ ...settings, menuAccess: accessRules });
        alert("Hak akses berhasil diperbarui!");
    };

    if (loading) return <p>Memuat aturan hak akses...</p>;

    return (
        <div className="p-6">
            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left font-medium">Menu</th>
                            {ROLES_TO_MANAGE.map(role => (
                                <th key={role} className="p-3 text-center font-medium capitalize">{role}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {ALL_MENUS.map(menu => (
                            <tr key={menu}>
                                <td className="p-3 font-semibold">{menu}</td>
                                {ROLES_TO_MANAGE.map(role => (
                                    <td key={role} className="p-3 text-center">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={accessRules[role]?.includes(menu) || false}
                                            onChange={(e) => handleCheckboxChange(role, menu, e.target.checked)}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-6 flex justify-end">
                <button onClick={handleSave} className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-lime-600">
                    Simpan Hak Akses
                </button>
            </div>
        </div>
    );
};

export default AccessControl;
