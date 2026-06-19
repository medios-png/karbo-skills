const fs = require('fs');

fs.mkdirSync('app/dashboard', { recursive: true });

const content = `'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  useEffect(() => {
    if (!cargando && !usuario) {
      router.push('/login');
    }
  }, [cargando, usuario, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (cargando || !usuario) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold">Karbo Skills</h1>
          <p className="text-xs text-gray-500">by elemental.</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{usuario.nombre || usuario.email} · {usuario.rol}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-md transition"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="p-6">
        {usuario.rol === 'admin' && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Panel Admin</h2>
            <p className="text-gray-400">Próximamente: cargos, equipos, usuarios.</p>
          </div>
        )}
        {usuario.rol === 'supervisor' && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Tu equipo</h2>
            <p className="text-gray-400">Próximamente: diagnóstico, revisiones mensuales.</p>
          </div>
        )}
        {usuario.rol === 'colaborador' && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Tu desarrollo</h2>
            <p className="text-gray-400">Próximamente: diagnóstico, plan de aprendizaje.</p>
          </div>
        )}
        {!['admin', 'supervisor', 'colaborador'].includes(usuario.rol) && (
          <p className="text-amber-500">Tu usuario no tiene un rol válido asignado. Contacta al administrador.</p>
        )}
      </main>
    </div>
  );
}
`;

fs.writeFileSync('app/dashboard/page.js', content, 'utf8');
console.log('app/dashboard/page.js creado, longitud:', content.length);