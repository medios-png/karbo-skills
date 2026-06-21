'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import GrabadorAudio from '@/components/GrabadorAudio';

const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function RevisionMensualPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  const [equipo, setEquipo] = useState([]);
  const [cargandoEquipo, setCargandoEquipo] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [retos, setRetos] = useState([]);
  const [analisis, setAnalisis] = useState(null);
  const [yaCompletada, setYaCompletada] = useState(null);
  const [notaCualitativa, setNotaCualitativa] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cargando && (!usuario || usuario.rol !== 'supervisor')) {
      router.push('/dashboard');
    }
  }, [cargando, usuario, router]);

  useEffect(() => {
    const cargarEquipo = async () => {
      if (!usuario) return;
      const q = query(collection(db, 'usuarios'), where('supervisorId', '==', usuario.uid));
      const snap = await getDocs(q);
      setEquipo(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setCargandoEquipo(false);
    };
    if (usuario) cargarEquipo();
  }, [usuario]);

  const seleccionarColaborador = async (colaborador) => {
    setSeleccionado(colaborador);
    setError('');
    setNotaCualitativa('');
    setEnviado(false);
    setYaCompletada(null);
    setRetos([]);
    setAnalisis(null);

    const mes = mesActual();

    const qRevision = query(
      collection(db, 'revisionesMensuales'),
      where('usuarioId', '==', colaborador.uid),
      where('supervisorId', '==', usuario.uid),
      where('mes', '==', mes)
    );
    const snapRevision = await getDocs(qRevision);
    if (!snapRevision.empty) {
      setYaCompletada(snapRevision.docs[0].data());
      return;
    }

    const qRetos = query(collection(db, 'retos'), where('usuarioId', '==', colaborador.uid));
    const snapRetos = await getDocs(qRetos);
    setRetos(snapRetos.docs.map((d) => ({ id: d.id, ...d.data() })));

    const analisisSnap = await getDoc(doc(db, 'analisisRol', colaborador.uid));
    if (analisisSnap.exists()) {
      setAnalisis(analisisSnap.data());
    }
  };

  const agregarTranscripcion = (texto) => {
    setNotaCualitativa((prev) => (prev ? `${prev} ${texto}` : texto));
  };

  const enviarRevision = async (e) => {
    e.preventDefault();
    if (!notaCualitativa.trim()) {
      setError('Falta la nota cualitativa.');
      return;
    }

    setEnviando(true);
    setError('');

    const completados = retos.filter((r) => r.completado).map((r) => r.descripcion);
    const pendientes = retos.filter((r) => !r.completado).map((r) => r.descripcion);

    await addDoc(collection(db, 'revisionesMensuales'), {
      usuarioId: seleccionado.uid,
      supervisorId: usuario.uid,
      mes: mesActual(),
      comparativoAutopercepcion: analisis?.brechasDivergentes || [],
      comparativoObservacionSupervisor: analisis?.brechasCoincidentes || [],
      retosCompletados: completados,
      retosNuevos: pendientes,
      notaCualitativa,
      fecha: serverTimestamp(),
    });

    setEnviando(false);
    setEnviado(true);
  };

  if (cargando || cargandoEquipo) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="font-bold">Revisión Mensual</h1>
        <p className="text-xs text-gray-500">{mesActual()} — esto alimenta directamente la evaluación de desempeño del cargo.</p>
      </header>

      <div className="p-6 max-w-2xl">
        {equipo.length === 0 ? (
          <p className="text-gray-400">Todavía no tienes colaboradores asignados.</p>
        ) : (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-2">Selecciona un colaborador:</p>
            <div className="flex gap-2 flex-wrap">
              {equipo.map((c) => (
                <button
                  key={c.uid}
                  onClick={() => seleccionarColaborador(c)}
                  className={`px-3 py-2 rounded-md text-sm border ${
                    seleccionado?.uid === c.uid
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {c.nombre || c.email}
                </button>
              ))}
            </div>
          </div>
        )}

        {seleccionado && (yaCompletada || enviado) && (
          <div className="text-center py-8">
            <h2 className="text-lg font-bold mb-2">Revisión completada</h2>
            <p className="text-gray-400">
              Ya hiciste la revisión mensual de {seleccionado.nombre || seleccionado.email} para {mesActual()}.
            </p>
          </div>
        )}

        {seleccionado && !yaCompletada && !enviado && (
          <form onSubmit={enviarRevision} className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-teal-400 mb-3">
                Retos completados ({retos.filter((r) => r.completado).length}/{retos.length})
              </h2>
              <div className="space-y-2">
                {retos.length === 0 && <p className="text-sm text-gray-500">Sin retos asignados todavía.</p>}
                {retos.map((r) => (
                  <div
                    key={r.id}
                    className={`bg-gray-900 border border-gray-800 rounded-md px-4 py-2 text-sm ${
                      r.completado ? 'text-teal-400' : 'text-gray-500'
                    }`}
                  >
                    {r.completado ? '✓' : '○'} {r.descripcion}
                  </div>
                ))}
              </div>
            </div>

            {analisis && (
              <div>
                <h2 className="text-sm font-semibold text-amber-400 mb-3">Brechas del diagnóstico inicial</h2>
                <p className="text-sm text-gray-400">
                  Índice de Claridad inicial: {analisis.indiceClaridad}/100. Revisa si las brechas divergentes de ese momento ya se conversaron.
                </p>
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold text-blue-400 mb-3">Nota cualitativa del mes</h2>
              <textarea
                value={notaCualitativa}
                onChange={(e) => setNotaCualitativa(e.target.value)}
                placeholder="¿Cómo va esta persona este mes? (escribe o graba audio abajo)"
                rows={4}
                className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <div className="mt-2">
                <GrabadorAudio onTranscripcion={agregarTranscripcion} />
              </div>
            </div>

            {error && <p className="text-sm text-amber-500">{error}</p>}

            <button
              disabled={enviando}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 rounded-md text-sm font-medium"
            >
              {enviando ? 'Guardando...' : 'Cerrar revisión del mes'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}