'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  setDoc,
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

const NIVELES_DOMINIO = [
  { valor: 1, etiqueta: 'Apenas la conoce' },
  { valor: 2, etiqueta: 'La hace con ayuda' },
  { valor: 3, etiqueta: 'La hace sola, con dudas' },
  { valor: 4, etiqueta: 'La domina bien' },
  { valor: 5, etiqueta: 'La domina completamente' },
];

export default function DiagnosticoSupervisorPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  const [equipo, setEquipo] = useState([]);
  const [cargandoEquipo, setCargandoEquipo] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [cargo, setCargo] = useState(null);
  const [yaCompletado, setYaCompletado] = useState(null);
  const [respuestas, setRespuestas] = useState({});
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
    setRespuestas({});
    setEnviado(false);
    setCargo(null);
    setYaCompletado(null);

    if (!colaborador.cargoId) return;

    const cargoSnap = await getDoc(doc(db, 'cargos', colaborador.cargoId));
    if (cargoSnap.exists()) {
      setCargo({ id: cargoSnap.id, ...cargoSnap.data() });
    }

    const q = query(
      collection(db, 'diagnosticosSupervisor'),
      where('usuarioId', '==', colaborador.uid),
      where('supervisorId', '==', usuario.uid),
      where('cargoId', '==', colaborador.cargoId)
    );
    const existentes = await getDocs(q);
    if (!existentes.empty) {
      setYaCompletado(existentes.docs[0].data());
    }
  };

  const seleccionarNivel = (tareaId, valor) => {
    setRespuestas((prev) => ({
      ...prev,
      [tareaId]: { ...prev[tareaId], nivelDominio: valor },
    }));
  };

  const actualizarComentario = (tareaId, texto) => {
    setRespuestas((prev) => ({
      ...prev,
      [tareaId]: { ...prev[tareaId], comentario: texto },
    }));
  };

  const agregarTranscripcion = (tareaId, texto) => {
    setRespuestas((prev) => {
      const actual = prev[tareaId]?.comentario || '';
      return {
        ...prev,
        [tareaId]: { ...prev[tareaId], comentario: actual ? `${actual} ${texto}` : texto },
      };
    });
  };

  const enviarDiagnostico = async (e) => {
    e.preventDefault();
    setError('');

    const tareas = cargo?.tareasCriticas || [];
    const faltantes = tareas.filter((t) => !respuestas[t.id]?.nivelDominio);
    if (faltantes.length > 0) {
      setError('Falta calificar al menos una tarea antes de enviar.');
      return;
    }

    setEnviando(true);

    const respuestasArray = tareas.map((t) => ({
      tareaId: t.id,
      tareaNombre: t.nombre,
      nivelDominio: respuestas[t.id].nivelDominio,
      comentario: respuestas[t.id].comentario || '',
    }));

    await addDoc(collection(db, 'diagnosticosSupervisor'), {
      usuarioId: seleccionado.uid,
      supervisorId: usuario.uid,
      cargoId: seleccionado.cargoId,
      respuestas: respuestasArray,
      observaciones: '',
      fecha: serverTimestamp(),
    });

    for (const r of respuestasArray) {
      await setDoc(doc(db, 'dominioTareas', `${seleccionado.uid}_${r.tareaId}_supervisor`), {
        usuarioId: seleccionado.uid,
        cargoId: seleccionado.cargoId,
        tareaId: r.tareaId,
        nivelDominio: r.nivelDominio,
        origen: 'diagnostico_supervisor',
        fecha: serverTimestamp(),
      });
    }

    setEnviando(false);
    setEnviado(true);
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="font-bold">Diagnóstico del Supervisor</h1>
        <p className="text-xs text-gray-500">
          Esto construye el plan de aprendizaje de tu equipo — no es una evaluación punitiva.
        </p>
      </header>

      <div className="p-6 max-w-2xl">
        {cargandoEquipo ? (
          <p className="text-gray-500">Cargando tu equipo...</p>
        ) : equipo.length === 0 ? (
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

        {seleccionado && !cargo && seleccionado.cargoId && (
          <p className="text-gray-500">Cargando cargo...</p>
        )}

        {seleccionado && !seleccionado.cargoId && (
          <p className="text-amber-500">Este colaborador no tiene cargo asignado todavía.</p>
        )}

        {seleccionado && cargo && (yaCompletado || enviado) && (
          <div className="text-center py-8">
            <h2 className="text-lg font-bold mb-2">Diagnóstico completado</h2>
            <p className="text-gray-400">
              Ya completaste tu observación sobre {seleccionado.nombre || seleccionado.email} para este cargo.
            </p>
          </div>
        )}

        {seleccionado && cargo && !yaCompletado && !enviado && (
          <form onSubmit={enviarDiagnostico} className="space-y-8">
            {(cargo.tareasCriticas || []).map((t) => (
              <div key={t.id} className="border-b border-gray-800 pb-6">
                <p className="font-medium mb-1">{t.nombre}</p>
                {t.descripcion && <p className="text-sm text-gray-500 mb-3">{t.descripcion}</p>}

                <p className="text-xs text-gray-400 mb-2">
                  ¿Qué tanto domina {seleccionado.nombre} esta tarea, según lo que observas?
                </p>
                <div className="flex gap-2 flex-wrap mb-3">
                  {NIVELES_DOMINIO.map((n) => (
                    <button
                      key={n.valor}
                      type="button"
                      onClick={() => seleccionarNivel(t.id, n.valor)}
                      className={`px-3 py-2 rounded-md text-xs border transition ${
                        respuestas[t.id]?.nivelDominio === n.valor
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {n.valor} · {n.etiqueta}
                    </button>
                  ))}
                </div>

                <textarea
                  value={respuestas[t.id]?.comentario || ''}
                  onChange={(e) => actualizarComentario(t.id, e.target.value)}
                  placeholder="¿Qué observas? (opcional, puedes escribir o grabar audio)"
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <div className="mt-2">
                  <GrabadorAudio onTranscripcion={(texto) => agregarTranscripcion(t.id, texto)} />
                </div>
              </div>
            ))}

            {error && <p className="text-sm text-amber-500">{error}</p>}

            <button
              disabled={enviando}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 rounded-md text-sm font-medium"
            >
              {enviando ? 'Enviando...' : 'Enviar observación'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}