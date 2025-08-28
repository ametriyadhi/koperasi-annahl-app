import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

interface UserToCreate {
  email: string;
  password?: string; // Password sekarang opsional
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
 * Cloud Function untuk membuat atau memperbarui pengguna secara massal.
 * Fungsi ini akan memeriksa NIP, jika sudah ada maka akan update, jika tidak ada maka akan membuat baru.
 */
export const bulkCreateUsers = functions.https.onCall(async (data, context) => {
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
    successCreateCount: 0,
    successUpdateCount: 0, // Menambahkan counter untuk update
    errorCount: 0,
    errors: [] as { nip: string; email: string; reason: string }[],
  };

  const db = admin.firestore();
  const auth = admin.auth();

  for (const user of users) {
    try {
      // --- LOGIKA BARU: Cek apakah anggota dengan NIP ini sudah ada ---
      const anggotaQuery = await db
        .collection("anggota")
        .where("nip", "==", user.nip)
        .limit(1)
        .get();

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

      if (!anggotaQuery.empty) {
        // --- JIKA ANGGOTA SUDAH ADA: LAKUKAN UPDATE ---
        const existingAnggotaDoc = anggotaQuery.docs[0];
        await existingAnggotaDoc.ref.update(anggotaData);
        results.successUpdateCount++;
      } else {
        // --- JIKA ANGGOTA BELUM ADA: LAKUKAN CREATE ---
        if (!user.password || user.password.length < 6) {
            throw new Error("Password wajib diisi (min. 6 karakter) untuk anggota baru.");
        }
        
        try {
            await auth.getUserByEmail(user.email);
            throw new Error(`Email ${user.email} sudah terdaftar.`);
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') {
                throw error;
            }
        }

        const userRecord = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.nama,
          disabled: false,
        });

        const anggotaRef = await db.collection("anggota").add(anggotaData);

        await db.collection("users").doc(userRecord.uid).set({
          uid: userRecord.uid,
          email: user.email,
          role: "anggota",
          anggota_id: anggotaRef.id,
        });

        results.successCreateCount++;
      }
    } catch (error: any) {
      results.errorCount++;
      results.errors.push({
        nip: user.nip,
        email: user.email,
        reason: error.message || "Terjadi kesalahan tidak diketahui.",
      });
    }
  }

  return results;
});

