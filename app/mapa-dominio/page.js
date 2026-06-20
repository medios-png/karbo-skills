'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const colorNivel = (nivel) => {
  if (!nivel) return 'bg-gray-800 border-gray-700 text-gray-500';
  if (nivel <= 2) return 'bg-amber-950 border-amber-700 text-amber-400';
  if (nivel === 3) return 'bg-blue-950 border-blue-700 text-blue-400';
  return 'bg-teal-950 border-teal-700 text-teal-400';
};

export default function MapaDominioPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  const [cargo, setCargo] = useState(null);
  const [dominios, setDominios] = useState({});
  const [cargandoMapa, setCargandoMapa] = useState(true);

  useEffect(() => {
    if (!cargando && !usuario) {
      router.push('/login');
    }
  }, [cargando, usuario, router]);

  useEffect(() => {
    const cargar = async () => {
      if (!usuario || !usuario.cargoId) {
        setCargandoMapa(false);
        return;
      }

      const cargoSnap = await getDoc(doc(db, 'cargos', usuario.cargoId));
      if (!cargoSnap.exists()) {
        setCargandoMapa(false);
        return;
      }

      const cargoData = { id: cargoSnap.id, ...cargoSnap.data() };
      setCargo(cargoData);

      const tareas = cargoData.tareasCriticas || [];
      const resultado = {};

      await Promise.all(
        tareas.map(async (t) => {
          const [personaSnap, supervisorSnap] = await Promise.all([
            getDoc(doc(db, 'dominioTareas', `${usuario.uid}_${t.id}`)),
            getDoc(doc(db, 'dominioTareas', `${usuario.uid}_${t.id}_supervisor`)),
          ]);

          resultado[t.id] = {
            persona: personaSnap.exists() ? personaSnap.data().nivelDominio : null,
            supervisor: supervisorSnap.exists() ? supervisorSnap.data().nivelDominio : null,
          };
        })
      );

      setDominios(resultado);
      setCargandoMapa(false);
    };

    if (usuario) cargar();
  }, [usuario]);

  if (cargando || cargandoMapa) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!cargo) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <p className="text-gray-400 text-center max-w-sm">
          Todavía no tienes un cargo asignado.
        </p>
      </div>
    );
  }

  const tareas = cargo.tareasCriticas || [];
  const niveles = ['operativo', 'tactico', 'estrategico'];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="font-bold">Mapa de Dominio</h1>
        <p className="text-xs text-gray-500">{cargo.nombre}</p>
      </header>

      <main className="p-6">
        {niveles.map((nivel) => {
          const tareasNivel = tareas.filter((t) => t.nivel === nivel);
          if (tareasNivel.length === 0) return null;

          return (
            <div key={nivel} className="mb-8">
              <h2 className="text-sm font-semibold text-gray-400 mb-3 capitalize">{nivel}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {tareasNivel.map((t) => {
                  const d = dominios[t.id] || {};
                  return (
                    <div key={t.id} className={`rounded-lg border-2 p-3 ${colorNivel(d.persona)}`}>
                      <p className="text-xs font-medium leading-tight mb-2">{t.nombre}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span>Tú: {d.persona || '—'}</span>
                        <span className="opacity-50">|</span>
                        <span>Jefe: {d.supervisor || '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}