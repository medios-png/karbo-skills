const fs = require('fs');

fs.mkdirSync('app/diagnostico', { recursive: true });

const content = `'use client';

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
  { valor: 1, etiqueta: 'Apenas la conozco' },
  { valor: 2, etiqueta: 'La hago con ayuda' },
  { valor: 3, etiqueta: 'La hago sola, con dudas' },
  { valor: 4, etiqueta: 'La domino bien' },
  { valor: 5, etiqueta: 'La domino completamente' },
];

export default function DiagnosticoPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  const [cargo, setCargo] = useState(null);
  const [cargandoCargo, setCargandoCargo] = useState(true);
  const [yaCompletado, setYaCompletado] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cargando && !usuario) {
      router.push('/login');
    }
  }, [cargando, usuario, router]);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      if (!usuario || !usuario.cargoId) {
        if (activo) setCargandoCargo(false);
        return;
      }

      try {
        const cargoSnap = await getDoc(doc(db, 'cargos', usuario.cargoId));
        if (cargoSnap.exists() && activo) {
          setCargo({ id: cargoSnap.id, ...cargoSnap.data() });
        }

        const q = query(
          collection(db, 'diagnosticosPersona'),
          where('usuarioId', '==', usuario.uid),
          where('cargoId', '==', usuario.cargoId)
        );
        const existentes = await getDocs(q);
        if (!existentes.empty && activo) {
          setYaCompletado(existentes.docs[0].data());
        }
      } catch (err) {
        console.error('Error cargando cargo o diagnostico:', err);
      }

      if (activo) setCargandoCargo(false);
    };

    if (usuario) cargar();

    return () => {
      activo = false;
    };
  }, [usuario]);

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

    await addDoc(collection(db, 'diagnosticosPersona'), {
      usuarioId: usuario.uid,
      cargoId: usuario.cargoId,
      respuestas: respuestasArray,
      fecha: serverTimestamp(),
    });

    for (const r of respuestasArray) {
      await setDoc(doc(db, 'dominioTareas', \`\${usuario.uid}_\${r.tareaId}\`), {
        usuarioId: usuario.uid,
        cargoId: usuario.cargoId,
        tareaId: r.tareaId,
        nivelDominio: r.nivelDominio,
        origen: 'diagnostico_persona',
        fecha: serverTimestamp(),
      });
    }

    setEnviando(false);
    setEnviado(true);
  };

  if (cargando || cargandoCargo) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!usuario.cargoId || !cargo) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <p className="text-gray-400 text-center max-w-sm">
          Todavía no tienes un cargo asignado. Contacta a tu administrador para que te asigne uno antes de hacer el diagnóstico.
        </p>
      </div>
    );
  }

  if (yaCompletado || enviado) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-white mb-2">Diagnóstico completado</h1>
          <p className="text-gray-400">
            Ya respondiste tu parte. Tu supervisor va a completar la suya, y cuando ambos terminen vas a poder ver tu Índice de Claridad de Rol y tu plan de aprendizaje.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-md text-sm font-medium text-white"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  const tareas = cargo?.tareasCriticas || [];

  if (tareas.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <p className="text-gray-400 text-center max-w-sm">
          Tu cargo ("{cargo?.nombre}") todavía no tiene tareas críticas definidas. Contacta a tu administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="font-bold">Diagnóstico de Rol</h1>
        <p className="text-xs text-gray-500">{cargo?.nombre} — esto nos ayuda a armar tu plan de aprendizaje, no es una evaluación de desempeño.</p>
      </header>

      <form onSubmit={enviarDiagnostico} className="p-6 max-w-2xl space-y-8">
        {tareas.map((t) => (
          <div key={t.id} className="border-b border-gray-800 pb-6">
            <p className="font-medium mb-1">{t.nombre}</p>
            {t.descripcion && <p className="text-sm text-gray-500 mb-3">{t.descripcion}</p>}

            <p className="text-xs text-gray-400 mb-2">¿Qué tanto dominas esta tarea hoy?</p>
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
              placeholder="¿Cómo la haces hoy? (opcional, puedes escribir o grabar audio)"
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
    </div>
  );
}
`;

fs.writeFileSync('app/diagnostico/page.js', content, 'utf8');
console.log('app/diagnostico/page.js actualizado, longitud:', content.length);