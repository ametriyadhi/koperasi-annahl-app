import React from 'react';
import Card from './shared/Card';
import { CHART_OF_ACCOUNTS } from '../constants';
import { AkunTipe } from '../types';
import AutodebetGenerator from './AutodebetGenerator'; // Impor komponen baru kita

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

const ReportRow: React.FC<{ label: string, value: number, isTotal?: boolean, indent?: boolean }> = ({ label, value, isTotal = false, indent = false }) => (
    <div className={`flex justify-between py-2 ${isTotal ? 'font-bold border-t mt-2 pt-2' : ''} ${indent ? 'pl-4' : ''}`}>
        <p className={`text-sm ${isTotal ? 'text-gray-800' : 'text-gray-600'}`}>{label}</p>
        <p className={`text-sm font-medium ${isTotal ? 'text-gray-900' : 'text-gray-700'}`}>{formatCurrency(value)}</p>
    </div>
);

const Reports: React.FC = () => {
    // Logika untuk Laporan Keuangan (masih statis)
    const aset = CHART_OF_ACCOUNTS.filter(a => a.tipe === AkunTipe.ASET && a.parent_kode);
    const totalAset = aset.reduce((sum, a) => sum + a.saldo, 0);
    const liabilitas = CHART_OF_ACCOUNTS.filter(a => a.tipe === AkunTipe.LIABILITAS && a.parent_kode);
    const totalLiabilitas = liabilitas.reduce((sum, a) => sum + a.saldo, 0);
    const ekuitas = CHART_OF_ACCOUNTS.filter(a => a.tipe === AkunTipe.EKUITAS && a.parent_kode);
    const totalEkuitas = ekuitas.reduce((sum, a) => sum + a.saldo, 0);
    const totalLiabilitasEkuitas = totalLiabilitas + totalEkuitas;
    const pendapatan = CHART_OF_ACCOUNTS.filter(a => a.tipe === AkunTipe.PENDAPATAN && a.parent_kode);
    const totalPendapatan = pendapatan.reduce((sum, a) => sum + a.saldo, 0);
    const beban = CHART_OF_ACCOUNTS.filter(a => a.tipe === AkunTipe.BEBAN && a.parent_kode);
    const totalBeban = beban.reduce((sum, a) => sum + a.saldo, 0);
    const labaRugi = totalPendapatan - totalBeban;

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Laporan</h2>
            
            {/* Bagian Baru: Generator Laporan Autodebet */}
            <Card className="mb-8">
                <div className="p-6">
                    <AutodebetGenerator />
                </div>
            </Card>

            <h3 className="text-2xl font-bold text-gray-800 mb-4">Laporan Keuangan (Data Statis)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="Neraca (Balance Sheet)">
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-md text-gray-800 mb-2">Aset</h4>
                            {aset.map(a => <ReportRow key={a.kode} label={a.nama} value={a.saldo} indent />)}
                            <ReportRow label="Total Aset" value={totalAset} isTotal />
                        </div>
                        <div>
                            <h4 className="font-semibold text-md text-gray-800 mb-2 mt-4">Liabilitas & Ekuitas</h4>
                            {liabilitas.map(a => <ReportRow key={a.kode} label={a.nama} value={a.saldo} indent />)}
                            {ekuitas.map(a => <ReportRow key={a.kode} label={a.nama} value={a.saldo} indent />)}
                            <ReportRow label="Total Liabilitas & Ekuitas" value={totalLiabilitasEkuitas} isTotal />
                        </div>
                    </div>
                </Card>

                <Card title="Laporan Laba Rugi (Income Statement)">
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-md text-gray-800 mb-2">Pendapatan</h4>
                            {pendapatan.map(a => <ReportRow key={a.kode} label={a.nama} value={a.saldo} indent/>)}
                            <ReportRow label="Total Pendapatan" value={totalPendapatan} isTotal />
                        </div>
                        <div>
                            <h4 className="font-semibold text-md text-gray-800 mb-2 mt-4">Beban</h4>
                            {beban.map(a => <ReportRow key={a.kode} label={a.nama} value={a.saldo} indent/>)}
                            <ReportRow label="Total Beban" value={totalBeban} isTotal />
                        </div>
                         <div>
                            <ReportRow label="Sisa Hasil Usaha (SHU)" value={labaRugi} isTotal />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Reports;

