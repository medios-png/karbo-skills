'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

  const enlacesPorRol = {
    admin: [
      { href: '/admin', titulo: 'Panel Admin', descripcion: 'Organizaciones, equipos y cargos.' },
      { href: '/instructivos', titulo: 'Instructivos por tarea', descripcion: 'Contenido de referencia para la IA.' },
    ],
    supervisor: [
      { href: '/diagnostico-supervisor', titulo: 'Diagnosticar a tu equipo', descripcion: 'Tu observación sobre cada colaborador.' },
      { href: '/instructivos', titulo: 'Instructivos por tarea', descripcion: 'Contenido de referencia para la IA.' },
    ],
colaborador: [
      { href: '/diagnostico', titulo: 'Mi diagnóstico', descripcion: 'Cómo haces hoy las tareas de tu cargo.' },
      { href: '/resultado', titulo: 'Mi Índice de Claridad de Rol', descripcion: 'El cruce entre tu mirada y la de tu supervisor.' },
      { href: '/mapa-dominio', titulo: 'Mapa de Dominio', descripcion: 'Tus tareas críticas, agrupadas por nivel.' },
    ],
  };

  const enlaces = enlacesPorRol[usuario.rol] || [];

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
        {enlaces.length === 0 ? (
          <p className="text-amber-500">Tu usuario no tiene un rol válido asignado. Contacta al administrador.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className="block bg-gray-900 border border-gray-800 hover:border-blue-600 rounded-lg p-4 transition"
              >
                <p className="font-semibold mb-1">{e.titulo}</p>
                <p className="text-sm text-gray-500">{e.descripcion}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}