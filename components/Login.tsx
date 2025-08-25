import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { LogoIcon } from './icons';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError("Email atau password salah. Silakan coba lagi.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-light">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl">
        <div className="text-center">
            <LogoIcon className="w-16 h-16 mx-auto"/>
            <h1 className="text-2xl md:text-3xl font-bold text-primary mt-4">Koperasi An Nahl</h1>
            <p className="text-gray-600 mt-2">Silakan masuk untuk melanjutkan</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mt-1 bg-gray-50 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mt-1 bg-gray-50 border border-gray-300 rounded-lg"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <div>
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-lime-600 text-white font-bold py-3 px-8 rounded-lg transition duration-300 disabled:bg-gray-400">
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
