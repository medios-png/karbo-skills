const fs = require('fs');

const contenido = `'use client';

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

const TIPO_COLORS = {
  positiva: 'text-green-400 bg-green-950 border-green-800',
  negativa: 'text-red-400 bg-red-950 border-red-800',
  neutra: 'text-gray-400 bg-gray-800 border-gray-700',
};

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

  const [observacionTexto, setObservacionTexto] = useState('');
  const [clasificando, setClasificando] = useState(false);
  const [resultadoClasificacion, setResultadoClasificacion] = useState(null);
  const [tareaManualId, setTareaManualId] = useState('');
  const [guardandoObservacion, setGuardandoObservacion] = useState(false);
  const [observacionGuardada, setObservacionGuardada] = useState(false);

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
    setObservacionTexto('');
    setResultadoClasificacion(null);
    setObservacionGuardada(false);
    setTareaManualId('');

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
        [tareaId]: { ...prev[tareaId], comentario: actual ? \`\${actual} \${texto}\` : texto },
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
      await setDoc(doc(db, 'dominioTareas', \`\${seleccionado.uid}_\${r.tareaId}_supervisor\`), {
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

  const agregarTranscripcionObservacion = (texto) => {
    setObservacionTexto((prev) => prev ? \`\${prev} \${texto}\` : texto);
  };

  const clasificarObservacion = async () => {
    if (!observacionTexto.trim() || observacionTexto.trim().length < 5) return;
    setClasificando(true);
    setResultadoClasificacion(null);

    try {
      const res = await fetch('/api/clasificar-observacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: observacionTexto,
          tareasCriticas: cargo.tareasCriticas || [],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResultadoClasificacion(data);
        if (data.confianzaAlta && data.tareaEncontrada) {
          setTareaManualId(data.tareaEncontrada.id);
        } else {
          setTareaManualId('');
        }
      }
    } catch (err) {
      console.error('Error clasificando:', err);
    } finally {
      setClasificando(false);
    }
  };

  const confirmarObservacion = async () => {
    if (!resultadoClasificacion || !tareaManualId) return;
    setGuardandoObservacion(true);

    const tareaVinculada = (cargo.tareasCriticas || []).find((t) => t.id === tareaManualId);
    if (!tareaVinculada) { setGuardandoObservacion(false); return; }

    const { resultado } = resultadoClasificacion;

    await addDoc(collection(db, 'observaciones'), {
      supervisorId: usuario.uid,
      colaboradorId: seleccionado.uid,
      cargoId: seleccionado.cargoId,
      texto: observacionTexto,
      tareaCriticaVinculada: tareaVinculada.nombre,
      tareaId: tareaManualId,
      tipo: resultado.tipo,
      etiqueta: resultado.etiqueta,
      creadaEn: serverTimestamp(),
      confirmadaPorSupervisor: true,
    });

    const dominioRef = doc(db, 'dominioTareas', \`\${seleccionado.uid}_\${tareaManualId}_supervisor\`);
    const dominioSnap = await getDoc(dominioRef);

    if (dominioSnap.exists()) {
      const nivelActual = dominioSnap.data().nivelDominio || 3;
      let nuevoNivel = nivelActual;
      if (resultado.tipo === 'positiva') nuevoNivel = Math.min(5, nivelActual + 1);
      if (resultado.tipo === 'negativa') nuevoNivel = Math.max(1, nivelActual - 1);
      await setDoc(dominioRef, { nivelDominio: nuevoNivel, ultimaObservacion: serverTimestamp() }, { merge: true });
    }

    setGuardandoObservacion(false);
    setObservacionGuardada(true);
    setObservacionTexto('');
    setResultadoClasificacion(null);
    setTareaManualId('');
    setTimeout(() => setObservacionGuardada(false), 3000);
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
        <h1 className="font-bold">Panel del Supervisor</h1>
        <p className="text-xs text-gray-500">
          Diagnóstico inicial y observaciones de campo de tu equipo.
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
                  className={\`px-3 py-2 rounded-md text-sm border \${
                    seleccionado?.uid === c.uid
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-600'
                  }\`}
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
          <div className="text-center py-6 border-b border-gray-800 mb-8">
            <p className="text-gray-400 text-sm">
              Diagnóstico inicial de {seleccionado.nombre || seleccionado.email} ya completado.
            </p>
          </div>
        )}

        {seleccionado && cargo && !yaCompletado && !enviado && (
          <form onSubmit={enviarDiagnostico} className="space-y-8 border-b border-gray-800 pb-8 mb-8">
            <h2 className="text-sm font-semibold text-blue-400">Diagnóstico inicial</h2>
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
                      className={\`px-3 py-2 rounded-md text-xs border transition \${
                        respuestas[t.id]?.nivelDominio === n.valor
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
                      }\`}
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
              {enviando ? 'Enviando...' : 'Enviar diagnóstico'}
            </button>
          </form>
        )}

        {seleccionado && cargo && (
          <div>
            <h2 className="text-sm font-semibold text-teal-400 mb-1">Registrar observación de campo</h2>
            <p className="text-xs text-gray-500 mb-4">
              Describe lo que observaste de {seleccionado.nombre || seleccionado.email}. La IA identifica la tarea relacionada.
            </p>

            {observacionGuardada && !resultadoClasificacion && (
              <p className="text-sm text-teal-400 mb-4">✓ Observación registrada. Puedes agregar otra.</p>
            )}

            {!resultadoClasificacion ? (
              <div className="space-y-3">
                <textarea
                  value={observacionTexto}
                  onChange={(e) => setObservacionTexto(e.target.value)}
                  placeholder="¿Qué observaste? Ej: 'Tardó mucho procesando la factura, tuvo que pedir ayuda con el sistema'"
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                />
                <div className="flex items-center gap-3">
                  <GrabadorAudio onTranscripcion={agregarTranscripcionObservacion} />
                  <button
                    onClick={clasificarObservacion}
                    disabled={clasificando || observacionTexto.trim().length < 5}
                    className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-4 py-2 rounded-md text-xs font-medium"
                  >
                    {clasificando ? 'Analizando...' : 'Analizar observación'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-400 italic">
                  "{observacionTexto}"
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
                  <p className="text-xs text-gray-500 mb-2">La IA identificó lo siguiente — confirma o ajusta:</p>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Tipo:</span>
                    <span className={\`text-xs px-2 py-1 rounded-full border \${TIPO_COLORS[resultadoClasificacion.resultado.tipo] || TIPO_COLORS.neutra}\`}>
                      {resultadoClasificacion.resultado.tipo}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-500">Etiqueta: </span>
                    <span className="text-xs text-white">{resultadoClasificacion.resultado.etiqueta}</span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Tarea crítica vinculada:</p>
                    <select
                      value={tareaManualId}
                      onChange={(e) => setTareaManualId(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="">— Selecciona una tarea —</option>
                      {(cargo.tareasCriticas || []).map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                    {resultadoClasificacion.confianzaAlta ? (
                      <p className="text-xs text-teal-500">✓ Tarea identificada con confianza alta</p>
                    ) : (
                      <p className="text-xs text-amber-500">⚠ La IA no identificó la tarea con certeza — selecciónala manualmente</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={confirmarObservacion}
                    disabled={guardandoObservacion || !tareaManualId}
                    className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-4 py-2 rounded-md text-xs font-medium"
                  >
                    {guardandoObservacion ? 'Guardando...' : 'Confirmar y guardar'}
                  </button>
                  <button
                    onClick={() => { setResultadoClasificacion(null); setTareaManualId(''); }}
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-md text-xs font-medium text-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}`;

fs.writeFileSync('app/diagnostico-supervisor/page.js', contenido, 'utf8');
console.log('Archivo escrito. Líneas:', contenido.split('\\n').length);