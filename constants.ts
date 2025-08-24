
import type { Anggota, KontrakMurabahah, RekeningSimpanan, TransaksiSimpanan, Akun } from './types';
import { Unit, JenisSimpanan, StatusKontrak, AkunTipe } from './types';

export const MOCK_ANGGOTA: Anggota[] = [
  { id: 'A001', nama: 'Budi Santoso', nip: '12345', unit: Unit.SMA, tgl_gabung: '2020-01-15', status: 'Aktif', simpanan_pokok: 500000, simpanan_wajib: 2400000, simpanan_sukarela: 5000000 },
  { id: 'A002', nama: 'Siti Aminah', nip: '12346', unit: Unit.SD, tgl_gabung: '2019-03-20', status: 'Aktif', simpanan_pokok: 500000, simpanan_wajib: 3000000, simpanan_sukarela: 15000000 },
  { id: 'A003', nama: 'Ahmad Fauzi', nip: '12347', unit: Unit.SMP, tgl_gabung: '2021-08-01', status: 'Aktif', simpanan_pokok: 500000, simpanan_wajib: 1200000, simpanan_sukarela: 2500000 },
  { id: 'A004', nama: 'Dewi Lestari', nip: '12348', unit: Unit.PGTK, tgl_gabung: '2022-02-10', status: 'Aktif', simpanan_pokok: 500000, simpanan_wajib: 800000, simpanan_sukarela: 1000000 },
  { id: 'A005', nama: 'Rahmat Hidayat', nip: '12349', unit: Unit.Supporting, tgl_gabung: '2018-11-05', status: 'Aktif', simpanan_pokok: 500000, simpanan_wajib: 3600000, simpanan_sukarela: 7500000 },
  { id: 'A006', nama: 'Eka Wijaya', nip: '12350', unit: Unit.Manajemen, tgl_gabung: '2017-06-12', status: 'Tidak Aktif', simpanan_pokok: 500000, simpanan_wajib: 4000000, simpanan_sukarela: 20000000 },
];

export const MOCK_REKENING: RekeningSimpanan[] = MOCK_ANGGOTA.flatMap(a => [
    { id: `${a.id}-P`, anggota_id: a.id, jenis: JenisSimpanan.POKOK, saldo: a.simpanan_pokok },
    { id: `${a.id}-W`, anggota_id: a.id, jenis: JenisSimpanan.WAJIB, saldo: a.simpanan_wajib },
    { id: `${a.id}-S`, anggota_id: a.id, jenis: JenisSimpanan.SUKARELA, saldo: a.simpanan_sukarela },
]);

export const MOCK_TRANSAKSI: TransaksiSimpanan[] = [
    {id: 'T001', rekening_id: 'A001-S', tanggal: '2023-10-05', tipe: 'Setor', jumlah: 500000, keterangan: 'Setoran Gaji'},
    {id: 'T002', rekening_id: 'A001-S', tanggal: '2023-11-05', tipe: 'Setor', jumlah: 500000, keterangan: 'Setoran Gaji'},
    {id: 'T003', rekening_id: 'A001-S', tanggal: '2023-11-20', tipe: 'Tarik', jumlah: 200000, keterangan: 'Keperluan'},
    {id: 'T004', rekening_id: 'A002-S', tanggal: '2023-11-05', tipe: 'Setor', jumlah: 1000000, keterangan: 'Setoran Gaji'},
    {id: 'T005', rekening_id: 'A002-W', tanggal: '2023-11-01', tipe: 'Setor', jumlah: 100000, keterangan: 'Setoran Wajib Nov'},
];

export const MOCK_KONTRAK: KontrakMurabahah[] = [
    { id: 'M001', anggota_id: 'A001', nama_barang: 'Laptop Asus ROG', harga_pokok: 15000000, margin: 3000000, harga_jual: 18000000, uang_muka: 0, tenor: 12, cicilan_per_bulan: 1500000, tanggal_akad: '2023-01-20', status: StatusKontrak.BERJALAN },
    { id: 'M002', anggota_id: 'A002', nama_barang: 'Motor Honda Vario', harga_pokok: 25000000, margin: 5000000, harga_jual: 30000000, uang_muka: 2000000, tenor: 24, cicilan_per_bulan: 1250000, tanggal_akad: '2022-08-15', status: StatusKontrak.BERJALAN },
    { id: 'M003', anggota_id: 'A005', nama_barang: 'Renovasi Rumah', harga_pokok: 50000000, margin: 10000000, harga_jual: 60000000, uang_muka: 5000000, tenor: 36, cicilan_per_bulan: 1666667, tanggal_akad: '2023-05-10', status: StatusKontrak.APPROVED },
    { id: 'M004', anggota_id: 'A003', nama_barang: 'Smartphone Samsung S23', harga_pokok: 12000000, margin: 2400000, harga_jual: 14400000, uang_muka: 1000000, tenor: 12, cicilan_per_bulan: 1200000, tanggal_akad: '2022-03-01', status: StatusKontrak.LUNAS },
];

export const CHART_OF_ACCOUNTS: Akun[] = [
    { kode: '1-0000', nama: 'ASET', tipe: AkunTipe.ASET, saldo: 150000000 },
    { kode: '1-1000', nama: 'Aset Lancar', tipe: AkunTipe.ASET, parent_kode: '1-0000', saldo: 100000000 },
    { kode: '1-1100', nama: 'Kas & Bank', tipe: AkunTipe.ASET, parent_kode: '1-1000', saldo: 50000000 },
    { kode: '1-1200', nama: 'Piutang Murabahah', tipe: AkunTipe.ASET, parent_kode: '1-1000', saldo: 40000000 },
    { kode: '1-1300', nama: 'Persediaan Murabahah', tipe: AkunTipe.ASET, parent_kode: '1-1000', saldo: 10000000 },
    { kode: '2-0000', nama: 'LIABILITAS', tipe: AkunTipe.LIABILITAS, saldo: 75000000 },
    { kode: '2-1000', nama: 'Simpanan Anggota', tipe: AkunTipe.LIABILITAS, parent_kode: '2-0000', saldo: 70000000 },
    { kode: '2-1100', nama: 'Simpanan Wajib', tipe: AkunTipe.LIABILITAS, parent_kode: '2-1000', saldo: 15000000 },
    { kode: '2-1200', nama: 'Simpanan Sukarela', tipe: AkunTipe.LIABILITAS, parent_kode: '2-1000', saldo: 55000000 },
    { kode: '2-2000', nama: 'Margin Murabahah Ditangguhkan', tipe: AkunTipe.LIABILITAS, parent_kode: '2-0000', saldo: 5000000 },
    { kode: '3-0000', nama: 'EKUITAS', tipe: AkunTipe.EKUITAS, saldo: 75000000 },
    { kode: '3-1000', nama: 'Simpanan Pokok', tipe: AkunTipe.EKUITAS, parent_kode: '3-0000', saldo: 2500000 },
    { kode: '3-2000', nama: 'SHU Ditahan', tipe: AkunTipe.EKUITAS, parent_kode: '3-0000', saldo: 70000000 },
    { kode: '3-3000', nama: 'SHU Tahun Berjalan', tipe: AkunTipe.EKUITAS, parent_kode: '3-0000', saldo: 2500000 },
    { kode: '4-0000', nama: 'PENDAPATAN', tipe: AkunTipe.PENDAPATAN, saldo: 10000000 },
    { kode: '4-1000', nama: 'Pendapatan Margin Murabahah', tipe: AkunTipe.PENDAPATAN, parent_kode: '4-0000', saldo: 10000000 },
    { kode: '5-0000', nama: 'BEBAN', tipe: AkunTipe.BEBAN, saldo: 7500000 },
    { kode: '5-1000', nama: 'Beban Operasional', tipe: AkunTipe.BEBAN, parent_kode: '5-0000', saldo: 5000000 },
    { kode: '5-2000', nama: 'Beban Adm Bank', tipe: AkunTipe.BEBAN, parent_kode: '5-0000', saldo: 2500000 },
];
