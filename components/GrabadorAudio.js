'use client';

import { useState, useRef } from 'react';

export default function GrabadorAudio({ onTranscripcion }) {
  const [grabando, setGrabando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const iniciarGrabacion = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribir(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setGrabando(true);
    } catch (err) {
      setError('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorderRef.current && grabando) {
      mediaRecorderRef.current.stop();
      setGrabando(false);
    }
  };

  const transcribir = async (audioBlob) => {
    setTranscribiendo(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'grabacion.webm');

      const res = await fetch('/api/transcribir', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error en la transcripción');

      const data = await res.json();
      onTranscripcion(data.texto);
    } catch (err) {
      setError('No se pudo transcribir el audio. Intenta de nuevo o escribe directamente.');
    } finally {
      setTranscribiendo(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!grabando ? (
        <button
          type="button"
          onClick={iniciarGrabacion}
          disabled={transcribiendo}
          className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-3 py-1.5 rounded-md text-gray-300"
        >
          🎤 {transcribiendo ? 'Transcribiendo...' : 'Grabar audio'}
        </button>
      ) : (
        <button
          type="button"
          onClick={detenerGrabacion}
          className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-md text-white"
        >
          ⏹ Detener grabación
        </button>
      )}
      {error && <span className="text-xs text-amber-500">{error}</span>}
    </div>
  );
}