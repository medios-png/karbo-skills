'use client';

import { useState, useMemo } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;

const NODE_STYLES = {
  inicio: {
    background: '#14532d',
    border: '1px solid #16a34a',
    color: '#bbf7d0',
    borderRadius: '24px',
    fontSize: '12px',
    padding: '8px 12px',
    width: NODE_WIDTH,
  },
  accion: {
    background: '#1e3a5f',
    border: '1px solid #3b82f6',
    color: '#bfdbfe',
    borderRadius: '6px',
    fontSize: '12px',
    padding: '8px 12px',
    width: NODE_WIDTH,
  },
  decision: {
    background: '#78350f',
    border: '1px solid #f59e0b',
    color: '#fef3c7',
    borderRadius: '6px',
    fontSize: '12px',
    padding: '8px 12px',
    width: NODE_WIDTH,
  },
  fin: {
    background: '#3b1414',
    border: '1px solid #ef4444',
    color: '#fecaca',
    borderRadius: '24px',
    fontSize: '12px',
    padding: '8px 12px',
    width: NODE_WIDTH,
  },
};

function buildReactFlowElements(flujo) {
  if (!flujo?.pasos?.length) return { nodes: [], edges: [] };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });

  flujo.pasos.forEach((paso) => {
    g.setNode(paso.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  flujo.conexiones.forEach((conn) => {
    if (conn.origen && conn.destino) g.setEdge(conn.origen, conn.destino);
  });

  dagre.layout(g);

  const nodes = flujo.pasos.map((paso) => {
    const nodePos = g.node(paso.id);
    return {
      id: paso.id,
      position: {
        x: nodePos.x - NODE_WIDTH / 2,
        y: nodePos.y - NODE_HEIGHT / 2,
      },
      data: { label: paso.titulo },
      style: NODE_STYLES[paso.tipo] || NODE_STYLES.accion,
    };
  });

  const edges = flujo.conexiones
    .filter((conn) => conn.origen && conn.destino)
    .map((conn, i) => ({
      id: `e${i}`,
      source: conn.origen,
      target: conn.destino,
      label: conn.etiqueta || undefined,
      type: 'smoothstep',
      style: { stroke: '#4b5563' },
      labelStyle: { fontSize: '10px', fill: '#9ca3af' },
    }));

  return { nodes, edges };
}

export default function VisorInstructivo({ texto, flujo, audioUrl, audioDesactualizado }) {
  const [pestana, setPestana] = useState('texto');
  const [reproduciendo, setReproduciendo] = useState(false);
  const [audioLocalUrl, setAudioLocalUrl] = useState(null);
  const [errorAudio, setErrorAudio] = useState('');

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildReactFlowElements(flujo),
    [flujo]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const urlParaReproducir = audioLocalUrl || audioUrl;

  const handleEscuchar = async () => {
    setErrorAudio('');

    if (urlParaReproducir) {
      const audio = new Audio(urlParaReproducir);
      setReproduciendo(true);
      audio.play();
      audio.onended = () => setReproduciendo(false);
      return;
    }

    setReproduciendo(true);
    try {
      const res = await fetch('/api/tts-instructivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });

      if (!res.ok) throw new Error('Error del servidor');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioLocalUrl(url);

      const audio = new Audio(url);
      audio.play();
      audio.onended = () => setReproduciendo(false);
    } catch (err) {
      console.error('Error TTS:', err);
      setErrorAudio('No se pudo generar el audio. Intenta de nuevo.');
      setReproduciendo(false);
    }
  };

  const handleDescargar = () => {
    if (!urlParaReproducir) return;
    const a = document.createElement('a');
    a.href = urlParaReproducir;
    a.download = 'instructivo.mp3';
    a.click();
  };

  const TABS = [
    { id: 'texto', label: '📄 Texto' },
    { id: 'diagrama', label: '🔀 Diagrama' },
    { id: 'audio', label: '🔊 Audio' },
  ];

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="flex border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPestana(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              pestana === tab.id
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {pestana === 'texto' && (
        <div className="p-4 min-h-32">
          {texto ? (
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{texto}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">No hay instructivo escrito todavía.</p>
          )}
        </div>
      )}

      {pestana === 'diagrama' && (
        <div style={{ height: '420px', width: '100%' }}>
          {nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#374151" gap={20} />
              <Controls showInteractive={false} />
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-500 italic text-center px-4">
                {flujo
                  ? 'El diagrama no tiene pasos definidos.'
                  : 'El diagrama se genera la primera vez que el supervisor guarda el instructivo.'}
              </p>
            </div>
          )}
        </div>
      )}

      {pestana === 'audio' && (
        <div className="p-6 flex flex-col items-center gap-4 min-h-32">
          {audioDesactualizado && (
            <p className="text-xs text-amber-400 text-center">
              ⚠ El texto del instructivo cambió. El supervisor debe volver a guardarlo para actualizar el audio.
            </p>
          )}
          {!texto ? (
            <p className="text-sm text-gray-500 italic">No hay texto para reproducir.</p>
          ) : (
            <>
              <button
                onClick={handleEscuchar}
                disabled={reproduciendo}
                className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-6 py-3 rounded-lg text-sm font-medium"
              >
                {reproduciendo
                  ? '▶ Reproduciendo...'
                  : urlParaReproducir
                  ? '▶ Reproducir de nuevo'
                  : '▶ Escuchar instructivo'}
              </button>
              {urlParaReproducir && (
                <button
                  onClick={handleDescargar}
                  className="text-xs text-gray-400 hover:text-gray-200 underline"
                >
                  ⬇ Descargar audio (.mp3)
                </button>
              )}
              {errorAudio && <p className="text-xs text-red-400">{errorAudio}</p>}
              <p className="text-xs text-gray-500 text-center">
                La IA lee el instructivo en voz alta.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}