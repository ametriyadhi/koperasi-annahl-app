export enum Unit {
  PGTK = "PGTK",
  SD = "SD",
  SMP = "SMP",
  SMA = "SMA",
  Supporting = "Supporting",
  Manajemen = "Manajemen",
}

export interface Anggota {
  id: string;
  nama: string;
  nip: string;
  unit: Unit;
  tgl_gabung: string;
  status: 'Aktif' | 'Tidak Aktif';
  simpanan_pokok: number;
  simpanan_wajib: number;
  simpanan_sukarela: number;
}

export enum JenisSimpanan {
  POKOK = 'Simpanan Pokok',
  WAJIB = 'Simpanan Wajib',
  SUKARELA = 'Simpanan Sukarela',
}

export interface TransaksiSimpanan {
  id: string;
  anggota_id: string;
  jenis: JenisSimpanan;
  tanggal: string;
  tipe: 'Setor' | 'Tarik';
  jumlah: number;
  keterangan: string;
}

export enum StatusKontrak {
  DRAFT = 'Draft',
  REVIEW = 'Review',
  APPROVED = 'Approved',
  AKAD = 'Akad',
  BERJALAN = 'Berjalan',
  LUNAS = 'Lunas',
  MACET = 'Macet',
}

export interface KontrakMurabahah {
  id: string;
  anggota_id: string;
  nama_barang: string;
  harga_pokok: number;
  margin: number;
  harga_jual: number;
  uang_muka: number;
  tenor: number;
  cicilan_per_bulan: number;
  tanggal_akad: string;
  status: StatusKontrak;
  cicilan_terbayar: number; // <-- FIELD BARU UNTUK MELACAK CICILAN
}

export enum AkunTipe {
  ASET = 'Aset',
  LIABILITAS = 'Liabilitas',
  EKUITAS = 'Ekuitas',
  PENDAPATAN = 'Pendapatan',
  BEBAN = 'Beban',
}

export interface Akun {
  kode: string;
  nama: string;
  tipe: AkunTipe;
  parent_kode?: string;
  saldo: number;
}

// Tipe data untuk baris laporan yang akan disimpan
export interface ReportRow {
  nip: string;
  nama: string;
  simpananWajib: number;
  cicilanMurabahah: number;
  totalPotongan: number;
}

// TIPE DATA BARU UNTUK ARSIP LAPORAN DI FIRESTORE
export interface LaporanArsip {
    id: string;
    namaLaporan: string;
    tanggalDibuat: string; // ISO string
    dataLaporan: ReportRow[]; // Menyimpan seluruh data laporan
}


