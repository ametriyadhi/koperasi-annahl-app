import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inisialisasi Firebase Admin SDK
admin.initializeApp();

// Tipe data untuk user yang dikirim dari client
interface UserToCreate {
  email: string;
  password: string;
  nama: string;
  nip: string;
  unit: string;
  tgl_gabung: string;
  status: "Aktif" | "Tidak Aktif";
  simpanan_pokok: number;
  simpanan_wajib: number;
  simpanan_sukarela: number;
}

/**
 * Cloud Function yang dapat dipanggil untuk membuat pengguna secara massal.
 * Menerima array objek pengguna, mendaftarkannya ke Authentication,
 * lalu menyimpan datanya ke Firestore.
 */
export const bulkCreateUsers = functions.https.onCall(async (data, context) => {
  // 1. Verifikasi bahwa yang memanggil adalah admin atau pengurus
  // (Pastikan Anda sudah mengatur custom claims jika perlu keamanan lebih)
  // Untuk saat ini, kita cek apakah user sudah login.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Anda harus login untuk melakukan aksi ini."
    );
  }

  const users = data.users as UserToCreate[];
  if (!users || !Array.isArray(users)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Data yang dikirim harus berupa array 'users'."
    );
  }

  const results = {
    successCount: 0,
    errorCount: 0,
    errors: [] as { email: string; reason: string }[],
  };

  const db = admin.firestore();

  // 2. Loop melalui setiap user dari data yang dikirim
  for (const user of users) {
    try {
      // 3. Buat user di Firebase Authentication
      const userRecord = await admin.auth().createUser({
        email: user.email,
        password: user.password,
        displayName: user.nama,
        disabled: false,
      });

      // 4. Siapkan data anggota untuk Firestore
      const anggotaData = {
        nama: user.nama,
        nip: user.nip,
        unit: user.unit,
        tgl_gabung: user.tgl_gabung,
        status: user.status,
        simpanan_pokok: user.simpanan_pokok,
        simpanan_wajib: user.simpanan_wajib,
        simpanan_sukarela: user.simpanan_sukarela,
      };

      // 5. Buat dokumen baru di koleksi 'anggota'
      const anggotaRef = await db.collection("anggota").add(anggotaData);

      // 6. Buat dokumen di koleksi 'users' untuk mapping peran
      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: user.email,
        role: "anggota", // Atur peran default sebagai 'anggota'
        anggota_id: anggotaRef.id,
      });

      results.successCount++;
    } catch (error: any) {
      // Jika gagal, catat errornya
      results.errorCount++;
      results.errors.push({
        email: user.email,
        reason: error.message || "Terjadi kesalahan tidak diketahui.",
      });
    }
  }

  // 7. Kembalikan hasil prosesnya ke client
  return results;
});

