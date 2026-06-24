const fs = require('fs');

const contenido = `'use client';

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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import GrabadorAudio from '@/components/GrabadorAudio';

export default function InstructivosPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  const [cargos, setCargos] = useState([]);
  const [cargoSeleccionado, setCargoSeleccionado] = useState(null);
  const [instructivos, setInstructivos] = useState({});
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState({});
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!cargando && (!usuario || !['admin', 'supervisor'].includes(usuario.rol))) {
      router.push('/dashboard');
    }
  }, [cargando, usuario, router]);

  useEffect(() => {
    const cargar = async () => {
      if (!usuario) return;

      if (usuario.rol === 'admin') {
        const snap = await getDocs(collection(db, 'cargos'));
        setCargos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } else {
        const qEquipo = query(collection(db, 'usuarios'), where('supervisorId', '==', usuario.uid));
        const snapEquipo = await getDocs(qEquipo);
        const idsUnicos = [...new Set(snapEquipo.docs.map((d) => d.data().cargoId).filter(Boolean))];
        const cargosCargados = await Promise.all(
          idsUnicos.map(async (id) => {
            const s = await getDoc(doc(db, 'cargos', id));
            return s.exists() ? { id: s.id, ...s.data() } : null;
          })
        );
        setCargos(cargosCargados.filter(Boolean));
      }

      setCargandoDatos(false);
    };

    if (usuario) cargar();
  }, [usuario]);

  const seleccionarCargo = async (cargo) => {
    setCargoSeleccionado(cargo);
    setMensaje('');

    const tareas = cargo.tareasCriticas || [];
    const resultado = {};

    await Promise.all(
      tareas.map(async (t) => {
        const snap = await getDoc(doc(db, 'contenidoAprendizaje', \`\${cargo.id}_\${t.id}\`));
        if (snap.exists()) {
          resultado[t.id] = {
            texto: snap.data().texto || '',
            audioBase64: snap.data().audioBase64 || null,
            audioDesactualizado: snap.data().audioDesactualizado || false,
            textoGuardado: snap.data().texto || '',
          };
        } else {
          resultado[t.id] = {
            texto: '',
            audioBase64: null,
            audioDesactualizado: false,
            textoGuardado: '',
          };
        }
      })
    );

    setInstructivos(resultado);
  };

  const actualizarTexto = (tareaId, texto) => {
    setInstructivos((prev) => ({
      ...prev,
      [tareaId]: { ...prev[tareaId], texto },
    }));
  };

  const agregarTranscripcion = (tareaId, texto) => {
    setInstructivos((prev) => {
      const actual = prev[tareaId]?.texto || '';
      return {
        ...prev,
        [tareaId]: { ...prev[tareaId], texto: actual ? \`\${actual} \${texto}\` : texto },
      };
    });
  };

  const guardarInstructivo = async (tareaId) => {
    setGuardando((prev) => ({ ...prev, [tareaId]: true }));

    const ref_doc = doc(db, 'contenidoAprendizaje', \`\${cargoSeleccionado.id}_\${tareaId}\`);
    const texto = instructivos[tareaId]?.texto || '';
    const textoAnterior = instructivos[tareaId]?.textoGuardado || '';
    const audioExistente = instructivos[tareaId]?.audioBase64 || null;
    const textoChanged = texto !== textoAnterior && audioExistente;

    await setDoc(ref_doc, {
      cargoId: cargoSeleccionado.id,
      tareaId,
      texto,
      autorId: usuario.uid,
      autorRol: usuario.rol,
      fecha: serverTimestamp(),
      ...(textoChanged && { audioDesactualizado: true }),
    }, { merge: true });

    setMensaje('Instructivo guardado. Generando diagrama y audio...');

    try {
      const resFlujo = await fetch('/api/generar-flujo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });
      if (resFlujo.ok) {
        const { flujo } = await resFlujo.json();
        await setDoc(ref_doc, { flujo }, { merge: true });
      }
    } catch (err) {
      console.error('Error generando flujo:', err);
    }

    try {
      const resAudio = await fetch('/api/tts-instructivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });

      if (resAudio.ok) {
        const { base64 } = await resAudio.json();

        await setDoc(ref_doc, {
          audioBase64: base64,
          audioGeneradoEn: serverTimestamp(),
          audioDesactualizado: false,
        }, { merge: true });

        setInstructivos((prev) => ({
          ...prev,
          [tareaId]: {
            ...prev[tareaId],
            audioBase64: base64,
            audioDesactualizado: false,
            textoGuardado: texto,
          },
        }));

        setMensaje('Instructivo, diagrama y audio guardados.');
      } else {
        setMensaje('Instructivo y diagrama guardados. El audio no se pudo generar.');
      }
    } catch (err) {
      console.error('Error generando audio:', err);
      setMensaje('Instructivo y diagrama guardados. El audio no se pudo generar.');
    }

    setGuardando((prev) => ({ ...prev, [tareaId]: false }));
  };

  if (cargando || cargandoDatos) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="font-bold">Instructivos por tarea</h1>
        <p className="text-xs text-gray-500">
          Esto le da a la IA algo real con qué comparar al generar recomendaciones, en vez de inventar desde cero.
        </p>
      </header>

      <main className="p-6 max-w-2xl">
        {mensaje && <p className="text-sm text-teal-400 mb-4">{mensaje}</p>}

        {cargos.length === 0 ? (
          <p className="text-gray-400">No hay cargos disponibles todavía.</p>
        ) : (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-2">Selecciona un cargo:</p>
            <div className="flex gap-2 flex-wrap">
              {cargos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => seleccionarCargo(c)}
                  className={\`px-3 py-2 rounded-md text-sm border \${
                    cargoSeleccionado?.id === c.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-600'
                  }\`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        {cargoSeleccionado && (
          <div className="space-y-6">
            {(cargoSeleccionado.tareasCriticas || []).map((t) => {
              const inst = instructivos[t.id] || {};
              return (
                <div key={t.id} className="border-b border-gray-800 pb-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{t.nombre}</p>
                    {inst.audioBase64 && (
                      <span className={\`text-xs px-2 py-1 rounded-full \${
                        inst.audioDesactualizado
                          ? 'bg-amber-950 text-amber-400'
                          : 'bg-green-950 text-green-400'
                      }\`}>
                        {inst.audioDesactualizado ? '⚠ Audio desactualizado' : '✓ Audio listo'}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={inst.texto || ''}
                    onChange={(e) => actualizarTexto(t.id, e.target.value)}
                    placeholder="¿Cómo se hace bien esta tarea? (texto o graba audio abajo)"
                    rows={3}
                    className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <GrabadorAudio onTranscripcion={(texto) => agregarTranscripcion(t.id, texto)} />
                    <button
                      onClick={() => guardarInstructivo(t.id)}
                      disabled={guardando[t.id]}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 rounded-md text-xs font-medium"
                    >
                      {guardando[t.id] ? 'Guardando...' : 'Guardar instructivo'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}`;

fs.writeFileSync('app/instructivos/page.js', contenido, 'utf8');
console.log('Archivo escrito. Líneas:', contenido.split('\n').length);