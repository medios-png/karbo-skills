const fs = require('fs');

const contenido = fs.readFileSync('app/dashboard/page.js', 'utf8');

const nuevo = `'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const MODULOS = {
  '/admin':                  { icono: '\u2699\uFE0F', bg: '#1a1a2e' },
  '/instructivos':           { icono: '\uD83D\uDCCB', bg: '#1a2a3f' },
  '/diagnostico-supervisor': { icono: '\uD83D\uDD0D', bg: '#0f2a22' },
  '/revision-mensual':       { icono: '\uD83D\uDCC5', bg: '#2a1f0a' },
  '/diagnostico':            { icono: '\uD83E\uDDED', bg: '#1a2a3f' },
  '/resultado':              { icono: '\uD83D\uDCCA', bg: '#0f2a22' },
  '/mapa-dominio':           { icono: '\uD83D\uDDFA\uFE0F', bg: '#1e1a3a' },
  '/plan-aprendizaje':       { icono: '\uD83C\uDFAF', bg: '#0f2210' },
  '/preguntas':              { icono: '\uD83D\uDDE3\uFE0F', bg: '#2a1f0a' },
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
      { href: '/diagnostico-supervisor', titulo: 'Diagnosticar a tu equipo', descripcion: 'Tu observacion sobre cada colaborador.' },
      { href: '/instructivos', titulo: 'Instructivos por tarea', descripcion: 'Contenido de referencia para la IA.' },
      { href: '/revision-mensual', titulo: 'Revision mensual', descripcion: 'Cierra el ciclo: retos, brechas y nota del mes.' },
    ],
    colaborador: [
      { href: '/diagnostico', titulo: 'Mi diagnostico', descripcion: 'Como haces hoy las tareas de tu cargo.' },
      { href: '/resultado', titulo: 'Mi indice de claridad de rol', descripcion: 'El cruce entre tu mirada y la de tu supervisor.' },
      { href: '/mapa-dominio', titulo: 'Mapa de dominio', descripcion: 'Tus tareas criticas, agrupadas por nivel.' },
      { href: '/plan-aprendizaje', titulo: 'Mi plan de aprendizaje', descripcion: 'Objetivos y retos, con tu progreso.' },
      { href: '/preguntas', titulo: 'Preguntas sobre tu trabajo', descripcion: 'Resuelve dudas en texto o audio.' },
    ],
  };

  const enlaces = enlacesPorRol[usuario.rol] || [];

  const saludo = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos dias';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const nombre = (usuario.nombre || usuario.email || 'bienvenido').split(/[ @]/)[0];

  return (
    <div className="min-h-screen" style={{background:'#0a0a0f',color:'#fff'}}>
      <header style={{padding:'1rem 1.5rem',borderBottom:'0.5px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <p style={{fontWeight:600,fontSize:'15px',color:'#fff'}}>Karbo Skills</p>
          <p style={{fontSize:'11px',color:'#555'}}>by elemental.</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontSize:'11px',padding:'4px 10px',borderRadius:'8px',background:'#1a1a22',color:'#888',border:'0.5px solid rgba(255,255,255,0.08)'}}>
            {usuario.nombre || usuario.email} - {usuario.rol}
          </span>
          <button onClick={handleLogout} style={{fontSize:'11px',padding:'5px 12px',borderRadius:'8px',background:'#1a1a22',color:'#aaa',border:'0.5px solid rgba(255,255,255,0.08)',cursor:'pointer'}}>
            Cerrar sesion
          </button>
        </div>
      </header>
      <main style={{maxWidth:'860px',margin:'0 auto',padding:'2.5rem 1.5rem 3rem'}}>
        <div style={{marginBottom:'2rem'}}>
          <h2 style={{fontSize:'26px',fontWeight:500,color:'#fff'}}>{saludo()}, {nombre}.</h2>
          <p style={{fontSize:'14px',color:'#666',marginTop:'6px'}}>Que quieres trabajar hoy?</p>
        </div>
        {enlaces.length === 0 ? (
          <p style={{color:'#f59e0b',fontSize:'14px'}}>Tu usuario no tiene un rol valido asignado.</p>
        ) : (
          <>
            <p style={{fontSize:'10px',color:'#555',letterSpacing:'0.1em',textTransform:'uppercase',fontWeight:500,marginBottom:'12px'}}>tu ruta</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',gap:'12px'}}>
              {enlaces.map((e) => {
                const mod = MODULOS[e.href] || { icono: '📌', bg: '#1a1a22' };
                return (
                  <Link key={e.href} href={e.href} style={{textDecoration:'none',display:'flex',alignItems:'center',gap:'18px',background:'#12121a',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'1.5rem 1.4rem'}}>
                    <div style={{flexShrink:0,width:'60px',height:'60px',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px',background:mod.bg}}>
                      {mod.icono}
                    </div>
                    <div>
                      <p style={{fontSize:'15px',fontWeight:500,color:'#e8e8f0',marginBottom:'5px',lineHeight:1.3}}>{e.titulo}</p>
                      <p style={{fontSize:'12px',color:'#666',lineHeight:1.6}}>{e.descripcion}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}`;

fs.writeFileSync('app/dashboard/page.js', nuevo, 'utf8');
console.log('Dashboard escrito. Lineas:', nuevo.split('\n').length);