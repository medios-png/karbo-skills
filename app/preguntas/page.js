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
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import GrabadorAudio from '@/components/GrabadorAudio';

export default function PreguntasPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  const [cargo, setCargo] = useState(null);
  const [interacciones, setInteracciones] = useState([]);
  const [pregunta, setPregunta] = useState('');
  const [modalidad, setModalidad] = useState('texto');
  const [enviando, setEnviando] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cargando && !usuario) {
      router.push('/login');
    }
  }, [cargando, usuario, router]);

  useEffect(() => {
    const cargarCargo = async () => {
      if (!usuario || !usuario.cargoId) return;
      const snap = await getDoc(doc(db, 'cargos', usuario.cargoId));
      if (snap.exists()) setCargo({ id: snap.id, ...snap.data() });
    };
    if (usuario) cargarCargo();
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    const q = query(
      collection(db, 'interacciones'),
      where('usuarioId', '==', usuario.uid),
      orderBy('fecha', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setInteracciones(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [usuario]);

  const agregarTranscripcionPregunta = (texto) => {
    setPregunta((prev) => (prev ? `${prev} ${texto}` : texto));
  };

  const enviarPregunta = async (e) => {
    e.preventDefault();
    if (!pregunta.trim() || !cargo) return;

    setError('');
    setEnviando(true);
    setAudioUrl(null);

    try {
      const instructivosSnap = await Promise.all(
        (cargo.tareasCriticas || []).map((t) =>
          getDoc(doc(db, 'contenidoAprendizaje', `${cargo.id}_${t.id}`))
        )
      );
      const instructivos = (cargo.tareasCriticas || [])
        .map((t, i) => ({
          tareaNombre: t.nombre,
          instructivo: instructivosSnap[i].exists() ? instructivosSnap[i].data().texto : null,
        }))
        .filter((x) => x.instructivo);

      const res = await fetch('/api/responder-pregunta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregunta,
          cargoNombre: cargo.nombre,
          tareasCriticas: cargo.tareasCriticas,
          instructivos,
        }),
      });

      if (!res.ok) throw new Error('Error generando respuesta');

      const data = await res.json();

      await addDoc(collection(db, 'interacciones'), {
        usuarioId: usuario.uid,
        pregunta,
        respuesta: data.respuesta,
        modalidadRespuesta: modalidad,
        cargoId: usuario.cargoId,
        fecha: serverTimestamp(),
      });

      if (modalidad === 'audio') {
        const resAudio = await fetch('/api/texto-a-voz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: data.respuesta }),
        });

        if (resAudio.ok) {
          const blob = await resAudio.blob();
          setAudioUrl(URL.createObjectURL(blob));
        }
      }

      setPregunta('');
    } catch (err) {
      console.error('Error:', err);
      setError('Hubo un error generando la respuesta. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!usuario.cargoId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <p className="text-gray-400 text-center max-w-sm">
          Todavía no tienes un cargo asignado.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="font-bold">Preguntas sobre tu trabajo</h1>
        <p className="text-xs text-gray-500">{cargo?.nombre}</p>
      </header>

      <main className="p-6 max-w-2xl">
        <form onSubmit={enviarPregunta} className="space-y-3 mb-8">
          <textarea
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="¿Qué quieres preguntar sobre tu cargo? (escribe o graba abajo)"
            rows={3}
            className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />

          <GrabadorAudio onTranscripcion={agregarTranscripcionPregunta} />

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Quiero la respuesta en:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalidad('texto')}
                className={`px-3 py-1.5 rounded-md text-xs border ${
                  modalidad === 'texto'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-900 border-gray-800 text-gray-400'
                }`}
              >
                📄 Texto
              </button>
              <button
                type="button"
                onClick={() => setModalidad('audio')}
                className={`px-3 py-1.5 rounded-md text-xs border ${
                  modalidad === 'audio'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-900 border-gray-800 text-gray-400'
                }`}
              >
                🔊 Audio
              </button>
            </div>
            <button
              disabled={enviando}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-1.5 rounded-md text-sm font-medium ml-auto"
            >
              {enviando ? 'Pensando...' : 'Preguntar'}
            </button>
          </div>
          {error && <p className="text-sm text-amber-500">{error}</p>}
        </form>

        {audioUrl && (
          <div className="mb-6">
            <audio controls autoPlay src={audioUrl} className="w-full" />
          </div>
        )}

        <div className="space-y-4">
          {interacciones.map((i) => (
            <div key={i.id} className="bg-gray-900 border border-gray-800 rounded-md p-4">
              <p className="text-sm font-medium text-blue-400 mb-1">{i.pregunta}</p>
              <p className="text-sm text-gray-300">{i.respuesta}</p>
              <p className="text-xs text-gray-600 mt-2">{i.modalidadRespuesta === 'audio' ? '🔊' : '📄'}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}