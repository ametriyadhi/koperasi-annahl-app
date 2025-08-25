import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile, UserRole } from '../types';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            const userList = snapshot.docs.map(doc => doc.data() as UserProfile);
            setUsers(userList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleRoleChange = async (uid: string, newRole: UserRole) => {
        if (!uid) return;
        try {
            const userRef = doc(db, "users", uid);
            await setDoc(userRef, { role: newRole }, { merge: true });
            alert("Peran berhasil diperbarui.");
        } catch (error) {
            console.error("Gagal memperbarui peran:", error);
            alert("Gagal memperbarui peran.");
        }
    };

    return (
        <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Daftar Pengguna & Peran</h3>
            <p className="text-sm text-gray-600 mb-4">Catatan: Anda harus membuat pengguna di menu <span className="font-bold">Firebase Authentication</span> terlebih dahulu. Halaman ini hanya untuk menetapkan peran kepada pengguna yang sudah ada.</p>
            {loading ? <p>Memuat pengguna...</p> : (
                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 text-left font-medium">Email</th>
                                <th className="p-3 text-left font-medium">Peran</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map(user => (
                                <tr key={user.uid}>
                                    <td className="p-3">{user.email}</td>
                                    <td className="p-3">
                                        <select 
                                            value={user.role} 
                                            onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                                            className="border-gray-300 rounded-md shadow-sm"
                                        >
                                            <option value="pengurus">Pengurus</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UserManagement;

