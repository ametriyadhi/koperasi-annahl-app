export enum Unit {
  PGTK = "PGTK", SD = "SD", SMP = "SMP", SMA = "SMA", Supporting = "Supporting", Manajemen = "Manajemen",
}

export interface Anggota {
  id: string; nama: string; nip: string; unit: Unit; tgl_gabung: string; status: 'Aktif' | 'Tidak Aktif';
  simpanan_pokok: number; simpanan_wajib: number; simpanan_sukarela: number;
}

export enum JenisSimpanan {
  POKOK = 'Simpanan Pokok', WAJIB = 'Simpanan Wajib', SUKARELA = 'Simpanan Sukarela',
}

export interface TransaksiSimpanan {
  id: string; anggota_id: string; jenis: JenisSimpanan; tanggal: string; tipe: 'Setor' | 'Tarik'; jumlah: number; keterangan: string;
}

export enum StatusKontrak {
  DRAFT = 'Draft', REVIEW = 'Review', APPROVED = 'Approved', AKAD = 'Akad', BERJALAN = 'Berjalan', LUNAS = 'Lunas', MACET = 'Macet',
}

export interface KontrakMurabahah {
  id: string; anggota_id: string; nama_barang: string; harga_pokok: number; margin: number; harga_jual: number;
  uang_muka: number; tenor: number; cicilan_per_bulan: number; tanggal_akad: string; status: StatusKontrak; cicilan_terbayar: number;
}

export enum AkunTipe {
  ASET = 'Aset', LIABILITAS = 'Liabilitas', EKUITAS = 'Ekuitas', PENDAPATAN = 'Pendapatan', BEBAN = 'Beban',
}

export interface Akun {
  id: string; // Ditambahkan untuk referensi
  kode: string; nama: string; tipe: AkunTipe; parent_kode?: string; saldo: number;
}

export interface ReportRow {
  nip: string; nama: string; simpananWajib: number; cicilanMurabahah: number; totalPotongan: number;
}

export interface LaporanArsip {
  id: string; namaLaporan: string; tanggalDibuat: string; dataLaporan: ReportRow[];
}

// --- TIPE DATA BARU UNTUK JURNAL ---
export interface JurnalEntryLine {
    akun_id: string;
    akun_kode: string;
    akun_nama: string;
    debit: number;
    kredit: number;
}

export interface JurnalEntry {
    id: string;
    tanggal: string; // ISO string
    deskripsi: string;
    lines: JurnalEntryLine[];
}

// TIPE DATA BARU UNTUK PENGATURAN APLIKASI
export interface AppSettings {
  id?: string;
  simpanan_pokok: number;
  simpanan_wajib: number;
}



