const fs = require('fs');

const contenido = `'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!cargando && usuario) {
      router.push('/dashboard');
    }
  }, [cargando, usuario, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Correo o contraseña incorrectos.');
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Karbo Skills</h1>
          <p className="text-sm text-gray-500 mt-1">by elemental.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          {error && <p className="text-sm text-amber-500">{error}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md py-2 font-medium transition"
          >
            {enviando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}`;

fs.writeFileSync('app/login/page.js', contenido, 'utf8');
console.log('Login escrito. Líneas:', contenido.split('\\n').length);