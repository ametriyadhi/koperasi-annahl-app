import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile, UserRole } from '../types';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [newUserEmail, setNewUserEmail] = useState('');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            const userList = snapshot.docs.map(doc => doc.data() as UserProfile);
            setUsers(userList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleRoleChange = async (uid: string, newRole: UserRole) => {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, { role: newRole }, { merge: true });
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserEmail) return;
        alert("Fungsi ini hanya untuk demonstrasi. Anda harus membuat pengguna di Firebase Authentication terlebih dahulu, lalu tambahkan emailnya di sini untuk menetapkan peran.");
        // Di aplikasi nyata, ini akan memanggil Cloud Function untuk membuat pengguna
        // Untuk sekarang, kita hanya akan menambahkan entri peran
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
