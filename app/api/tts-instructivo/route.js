import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function stripMarkdown(texto) {
  return texto
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^\s*[-*+]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    .trim();
}

function dividirEnBloques(texto, limite = 4096) {
  if (texto.length <= limite) return [texto];
  const bloques = [];
  let inicio = 0;
  while (inicio < texto.length) {
    let fin = inicio + limite;
    if (fin < texto.length) {
      const corte = texto.lastIndexOf('.', fin);
      if (corte > inicio) fin = corte + 1;
    }
    bloques.push(texto.slice(inicio, fin).trim());
    inicio = fin;
  }
  return bloques;
}

export async function POST(request) {
  try {
    const { texto, voz = 'alloy' } = await request.json();

    if (!texto || texto.trim().length < 10) {
      return NextResponse.json({ error: 'Texto vacío o muy corto' }, { status: 400 });
    }

    const textoLimpio = stripMarkdown(texto);
    const bloques = dividirEnBloques(textoLimpio);

    const buffers = await Promise.all(
      bloques.map(async (bloque) => {
        const mp3 = await openai.audio.speech.create({
          model: 'tts-1',
          voice: voz,
          input: bloque,
        });
        return Buffer.from(await mp3.arrayBuffer());
      })
    );

    const audioFinal = Buffer.concat(buffers);

    return new NextResponse(audioFinal, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioFinal.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error TTS:', error);
    return NextResponse.json({ error: 'Error generando audio' }, { status: 500 });
  }
}