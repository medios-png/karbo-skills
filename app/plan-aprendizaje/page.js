'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const INSIGNIAS = [
  { umbral: 1, nombre: 'Primer paso', icono: '🌱' },
  { umbral: 3, nombre: 'En marcha', icono: '🔥' },
  { umbral: 5, nombre: 'Plan completo', icono: '🏆' },
];

export default function PlanAprendizajePage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  const [estado, setEstado] = useState('cargando');
  const [objetivos, setObjetivos] = useState([]);
  const [retos, setRetos] = useState([]);
  const [gamificacion, setGamificacion] = useState({ puntos: 0, insignias: [] });

  useEffect(() => {
    if (!cargando && !usuario) {
      router.push('/login');
    }
  }, [cargando, usuario, router]);

  useEffect(() => {
    const procesar = async () => {
      if (!usuario) return;

      const planSnap = await getDoc(doc(db, 'planAprendizaje', usuario.uid));

      if (planSnap.exists()) {
        setObjetivos(planSnap.data().objetivosAprendizaje || []);
        setEstado('listo');
        return;
      }

      const analisisSnap = await getDoc(doc(db, 'analisisRol', usuario.uid));
      if (!analisisSnap.exists()) {
        setEstado('esperando');
        return;
      }

      setEstado('generando');

      try {
        const analisis = analisisSnap.data();
        const cargoSnap = await getDoc(doc(db, 'cargos', usuario.cargoId));
        const cargoNombre = cargoSnap.exists() ? cargoSnap.data().nombre : '';

        const res = await fetch('/api/generar-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cargoNombre,
            indiceClaridad: analisis.indiceClaridad,
            brechasCoincidentes: analisis.brechasCoincidentes,
            brechasDivergentes: analisis.brechasDivergentes,
            recomendaciones: analisis.recomendaciones,
          }),
        });

        if (!res.ok) throw new Error('Error generando plan');

        const data = await res.json();

        await setDoc(doc(db, 'planAprendizaje', usuario.uid), {
          objetivosAprendizaje: data.objetivos || [],
          ultimaActualizacion: new Date().toISOString(),
        });

        for (const r of data.retos || []) {
          await addDoc(collection(db, 'retos'), {
            usuarioId: usuario.uid,
            cargoId: usuario.cargoId,
            descripcion: r.descripcion,
            origen: 'diagnostico',
            completado: false,
            fecha: new Date().toISOString(),
          });
        }

        await setDoc(doc(db, 'gamificacion', usuario.uid), {
          puntos: 0,
          racha: 0,
          insignias: [],
        });

        setObjetivos(data.objetivos || []);
        setEstado('listo');
      } catch (err) {
        console.error('Error generando plan:', err);
        setEstado('error');
      }
    };

    if (usuario) procesar();
  }, [usuario]);

  useEffect(() => {
    if (!usuario || estado !== 'listo') return;

    const qRetos = query(collection(db, 'retos'), where('usuarioId', '==', usuario.uid));
    const unsubRetos = onSnapshot(qRetos, (snap) => {
      setRetos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubGam = onSnapshot(doc(db, 'gamificacion', usuario.uid), (snap) => {
      if (snap.exists()) setGamificacion(snap.data());
    });

    return () => {
      unsubRetos();
      unsubGam();
    };
  }, [usuario, estado]);

  const alternarReto = async (reto) => {
    const nuevoEstado = !reto.completado;
    await updateDoc(doc(db, 'retos', reto.id), { completado: nuevoEstado });

    const completados = retos.filter((r) => (r.id !== reto.id ? r.completado : nuevoEstado)).length;
    const puntos = completados * 10;
    const nuevasInsignias = INSIGNIAS.filter((i) => completados >= i.umbral).map((i) => i.nombre);

    await setDoc(
      doc(db, 'gamificacion', usuario.uid),
      { puntos, insignias: nuevasInsignias },
      { merge: true }
    );
  };

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
          Primero necesitas ver tu Índice de Claridad de Rol antes de generar tu plan de aprendizaje.
        </p>
      </div>
    );
  }

  if (estado === 'generando') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Generando tu plan...</p>
      </div>
    );
  }

  if (estado === 'error') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <p className="text-amber-500 text-center max-w-sm">
          Hubo un error generando tu plan. Intenta recargar la página.
        </p>
      </div>
    );
  }

  const completados = retos.filter((r) => r.completado).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="font-bold">Tu Plan de Aprendizaje</h1>
        <p className="text-xs text-gray-500">Construido a partir de tu diagnóstico — es tuyo, ajústalo a tu ritmo.</p>
      </header>

      <main className="p-6 max-w-2xl space-y-8">
        <div className="flex items-center gap-6 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div>
            <p className="text-2xl font-bold text-blue-400">{gamificacion.puntos || 0}</p>
            <p className="text-xs text-gray-500">puntos</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(gamificacion.insignias || []).map((ins) => (
              <span key={ins} className="text-xs bg-gray-800 border border-gray-700 rounded-full px-3 py-1">
                {INSIGNIAS.find((i) => i.nombre === ins)?.icono} {ins}
              </span>
            ))}
          </div>
        </div>

        {objetivos.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-blue-400 mb-3">Objetivos de aprendizaje</h2>
            <div className="space-y-2">
              {objetivos.map((o, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-md px-4 py-3 flex items-center justify-between">
                  <p className="text-sm">{o.tema}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      o.prioridad === 'alta'
                        ? 'bg-amber-950 text-amber-400'
                        : o.prioridad === 'media'
                        ? 'bg-blue-950 text-blue-400'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {o.prioridad}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-teal-400 mb-3">
            Retos ({completados}/{retos.length})
          </h2>
          <div className="space-y-2">
            {retos.map((r) => (
              <label
                key={r.id}
                className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-md px-4 py-3 cursor-pointer"
              >
                <input type="checkbox" checked={r.completado} onChange={() => alternarReto(r)} className="mt-1" />
                <span className={`text-sm ${r.completado ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                  {r.descripcion}
                </span>
              </label>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}