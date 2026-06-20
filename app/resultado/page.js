'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

export default function ResultadoPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  const [estado, setEstado] = useState('cargando');
  const [analisis, setAnalisis] = useState(null);
  const [cargoNombre, setCargoNombre] = useState('');

  useEffect(() => {
    if (!cargando && !usuario) {
      router.push('/login');
    }
  }, [cargando, usuario, router]);

  useEffect(() => {
    const procesar = async () => {
      if (!usuario || !usuario.cargoId) {
        setEstado('esperando');
        return;
      }

      const analisisSnap = await getDoc(doc(db, 'analisisRol', usuario.uid));
      if (analisisSnap.exists()) {
        setAnalisis(analisisSnap.data());
        setEstado('listo');
        return;
      }

      const qPersona = query(
        collection(db, 'diagnosticosPersona'),
        where('usuarioId', '==', usuario.uid),
        where('cargoId', '==', usuario.cargoId)
      );
      const qSupervisor = query(
        collection(db, 'diagnosticosSupervisor'),
        where('usuarioId', '==', usuario.uid),
        where('cargoId', '==', usuario.cargoId)
      );

      const [snapPersona, snapSupervisor] = await Promise.all([
        getDocs(qPersona),
        getDocs(qSupervisor),
      ]);

      if (snapPersona.empty || snapSupervisor.empty) {
        setEstado('esperando');
        return;
      }

      const cargoSnap = await getDoc(doc(db, 'cargos', usuario.cargoId));
      const cargoData = cargoSnap.exists() ? cargoSnap.data() : {};
      const nombreCargo = cargoData.nombre || '';
      setCargoNombre(nombreCargo);

      const tareas = cargoData.tareasCriticas || [];
      const instructivosSnap = await Promise.all(
        tareas.map((t) => getDoc(doc(db, 'contenidoAprendizaje', `${usuario.cargoId}_${t.id}`)))
      );
      const instructivos = tareas
        .map((t, i) => ({
          tareaNombre: t.nombre,
          instructivo: instructivosSnap[i].exists() ? instructivosSnap[i].data().texto : null,
        }))
        .filter((x) => x.instructivo);

      setEstado('generando');

      try {
        const res = await fetch('/api/analizar-diagnostico', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cargoNombre: nombreCargo,
            tareasPersona: snapPersona.docs[0].data().respuestas,
            tareasSupervisor: snapSupervisor.docs[0].data().respuestas,
            instructivos,
          }),
        });

        if (!res.ok) throw new Error('Error generando análisis');

        const data = await res.json();

        await setDoc(doc(db, 'analisisRol', usuario.uid), {
          ...data,
          cargoId: usuario.cargoId,
          fecha: new Date().toISOString(),
        });

        setAnalisis(data);
        setEstado('listo');
      } catch (err) {
        console.error('Error generando analisis:', err);
        setEstado('error');
      }
    };

    if (usuario) procesar();
  }, [usuario]);

  if (cargando || estado === 'cargando') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (estado === 'esperando') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <p className="text-gray-400 text-center max-w-sm">
          Todavía falta que tú o tu supervisor completen el diagnóstico. Cuando ambos terminen, vas a poder ver tu Índice de Claridad de Rol aquí.
        </p>
      </div>
    );
  }

  if (estado === 'generando') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Generando tu análisis...</p>
      </div>
    );
  }

  if (estado === 'error') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <p className="text-amber-500 text-center max-w-sm">
          Hubo un error generando el análisis. Intenta recargar la página.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="font-bold">Tu Índice de Claridad de Rol</h1>
        <p className="text-xs text-gray-500">{cargoNombre}</p>
      </header>

      <main className="p-6 max-w-2xl space-y-8">
        <div className="text-center">
          <p className="text-5xl font-bold text-blue-400">{analisis.indiceClaridad}</p>
          <p className="text-sm text-gray-500">de 100</p>
        </div>

        {analisis.brechasCoincidentes && analisis.brechasCoincidentes.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-teal-400 mb-3">Donde ambos coinciden</h2>
            <div className="space-y-2">
              {analisis.brechasCoincidentes.map((b, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-md px-4 py-3">
                  <p className="font-medium text-sm">{b.tarea}</p>
                  <p className="text-sm text-gray-400">{b.nota}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {analisis.brechasDivergentes && analisis.brechasDivergentes.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-amber-400 mb-3">Conversación pendiente</h2>
            <div className="space-y-2">
              {analisis.brechasDivergentes.map((b, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-md px-4 py-3">
                  <p className="font-medium text-sm mb-1">{b.tarea}</p>
                  <p className="text-xs text-gray-500">Tu mirada: {b.autopercepcion}</p>
                  <p className="text-xs text-gray-500">Mirada del supervisor: {b.observacionSupervisor}</p>
                  <p className="text-sm text-gray-400 mt-1">{b.nota}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {analisis.recomendaciones && analisis.recomendaciones.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-blue-400 mb-3">Recomendaciones</h2>
            <ul className="space-y-2">
              {analisis.recomendaciones.map((r, i) => (
                <li key={i} className="text-sm text-gray-300 bg-gray-900 border border-gray-800 rounded-md px-4 py-3">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}