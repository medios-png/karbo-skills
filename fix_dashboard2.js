const fs = require('fs');

const contenido = `'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const MODULOS = {
  '/admin':                 { icono: '⚙️',  bg: '#1a1a2e' },
  '/instructivos':          { icono: '📋',  bg: '#1a2a3f' },
  '/diagnostico-supervisor':{ icono: '🔍',  bg: '#0f2a22' },
  '/revision-mensual':      { icono: '📅',  bg: '#2a1f0a' },
  '/diagnostico':           { icono: '🧭',  bg: '#1a2a3f' },
  '/resultado':             { icono: '📊',  bg: '#0f2a22' },
  '/mapa-dominio':          { icono: '🗺️',  bg: '#1e1a3a' },
  '/plan-aprendizaje':      { icono: '🎯',  bg: '#0f2210' },
  '/preguntas':             { icono: '🗣️',  bg: '#2a1f0a' },
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
      { href: '/admin', titulo: 'Panel admin', descripcion: 'Organizaciones, equipos y cargos.' },
      { href: '/instructivos', titulo: 'Instructivos por tarea', descripcion: 'Contenido de referencia para la IA.' },
    ],
    supervisor: [
      { href: '/diagnostico-supervisor', titulo: 'Diagnosticar a tu equipo', descripcion: 'Tu observación sobre cada colaborador.' },
      { href: '/instructivos', titulo: 'Instructivos por tarea', descripcion: 'Contenido de referencia para la IA.' },
      { href: '/revision-mensual', titulo: 'Revisión mensual', descripcion: 'Cierra el ciclo: retos, brechas y nota del mes.' },
    ],
    colaborador: [
      { href: '/diagnostico', titulo: 'Mi diagnóstico', descripcion: 'Cómo haces hoy las tareas de tu cargo.' },
      { href: '/resultado', titulo: 'Mi índice de claridad de rol', descripcion: 'El cruce entre tu mirada y la de tu supervisor.' },
      { href: '/mapa-dominio', titulo: 'Mapa de dominio', descripcion: 'Tus tareas críticas, agrupadas por nivel.' },
      { href: '/plan-aprendizaje', titulo: 'Mi plan de aprendizaje', descripcion: 'Objetivos y retos, con tu progreso.' },
      { href: '/preguntas', titulo: 'Preguntas sobre tu trabajo', descripcion: 'Resuelve dudas en texto o audio.' },
    ],
  };

  const enlaces = enlacesPorRol[usuario.rol] || [];

  const saludo = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const nombre = usuario.nombre?.split(' ')[0] || usuario.email?.split('@')[0] || 'bienvenido';

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: '#fff' }}>
      <header style={{ padding: '1rem 1.5rem', borderBottom: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: '15px', color: '#fff' }}>Karbo Skills</p>
          <p style={{ fontSize: '11px', color: '#555' }}>by elemental.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: '#1a1a22', color: '#888', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            {usuario.nombre || usuario.email} · {usuario.rol}
          </span>
          <button
            onClick={handleLogout}
            style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '8px', background: '#1a1a22', color: '#aaa', border: '0.5px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2.5rem 1.5rem 3rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 500, color: '#fff' }}>
            {saludo()}, {nombre}.
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '6px' }}>¿Qué quieres trabajar hoy?</p>
        </div>

        {enlaces.length === 0 ? (
          <p style={{ color: '#f59e0b', fontSize: '14px' }}>Tu usuario no tiene un rol válido asignado. Contacta al administrador.</p>
        ) : (
          <>
            <p style={{ fontSize: '10px', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '12px' }}>
              tu ruta
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {enlaces.map((e) => {
                const mod = MODULOS[e.href] || { icono: '📌', bg: '#1a1a22' };
                return (
                  <Link
                    key={e.href}
                    href={e.href}
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '18px', background: '#12121a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.5rem 1.4rem', transition: 'border-color 0.15s, background 0.15s' }}
                    onMouseEnter={e2 => { e2.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e2.currentTarget.style.background = '#16161f'; }}
                    onMouseLeave={e2 => { e2.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';