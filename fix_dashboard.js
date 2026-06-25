const fs = require('fs');

const contenido = `'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const ICONOS = {
  '/admin': '⚙️',
  '/instructivos': '📋',
  '/diagnostico-supervisor': '🔍',
  '/revision-mensual': '📅',
  '/diagnostico': '🧭',
  '/resultado': '📊',
  '/mapa-dominio': '🗺️',
  '/plan-aprendizaje': '🎯',
  '/preguntas': '💬',
};

const COLORES = {
  '/admin': 'hover:border-purple-500 hover:bg-purple-950/20',
  '/instructivos': 'hover:border-blue-500 hover:bg-blue-950/20',
  '/diagnostico-supervisor': 'hover:border-teal-500 hover:bg-teal-950/20',
  '/revision-mensual': 'hover:border-amber-500 hover:bg-amber-950/20',
  '/diagnostico': 'hover:border-blue-500 hover:bg-blue-950/20',
  '/resultado': 'hover:border-teal-500 hover:bg-teal-950/20',
  '/mapa-dominio': 'hover:border-purple-500 hover:bg-purple-950/20',
  '/plan-aprendizaje': 'hover:border-green-500 hover:bg-green-950/20',
  '/preguntas': 'hover:border-amber-500 hover:bg-amber-950/20',
};

export default function DashboardPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
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
      { href: '/revision-mensual', titulo: 'Revisión Mensual', descripcion: 'Cierra el ciclo: retos, brechas y nota del mes.' },
    ],
    colaborador: [
      { href: '/diagnostico', titulo: 'Mi diagnóstico', descripcion: 'Cómo haces hoy las tareas de tu cargo.' },
      { href: '/resultado', titulo: 'Mi Índice de Claridad de Rol', descripcion: 'El cruce entre tu mirada y la de tu supervisor.' },
      { href: '/mapa-dominio', titulo: 'Mapa de Dominio', descripcion: 'Tus tareas críticas, agrupadas por nivel.' },
      { href: '/plan-aprendizaje', titulo: 'Mi Plan de Aprendizaje', descripcion: 'Objetivos y retos, con tu progreso.' },
      { href: '/preguntas', titulo: 'Preguntas sobre tu trabajo', descripcion: 'Resuelve dudas en texto o audio.' },
    ],
  };

  const enlaces = enlacesPorRol[usuario.rol] || [];
  const saludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-white">Karbo Skills</h1>
          <p className="text-xs text-gray-500">by elemental.</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{usuario.nombre || usuario.email} · {usuario.rol}</span>
          <button onClick={handleLogout} className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-md transition">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="p-6 max-w-3xl">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white">
            {saludo()}, {usuario.nombre?.split(' ')[0] || 'bienvenido'}.
          </h2>
          <p className="text-sm text-gray-500 mt-1">¿Qué quieres hacer hoy?</p>
        </div>

        {enlaces.length === 0 ? (
          <p className="text-amber-500">Tu usuario no tiene un rol válido asignado. Contacta al administrador.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className={\`block bg-gray-900 border border-gray-800 rounded-xl p-5 transition-all duration-200 \${COLORES[e.href] || 'hover:border-blue-500 hover:bg-blue-950/20'}\`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{ICONOS[e.href] || '📌'}</span>
                  <div>
                    <p className="font-semibold text-white mb-1">{e.titulo}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{e.descripcion}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}`;

fs.writeFileSync('app/dashboard/page.js', contenido, 'utf8');
console.log('Dashboard escrito. Líneas:', contenido.split('\\n').length);