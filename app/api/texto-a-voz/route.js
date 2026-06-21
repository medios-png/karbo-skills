import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { texto } = await request.json();

    if (!texto) {
      return NextResponse.json({ error: 'Falta el texto' }, { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'alloy',
        input: texto,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error de TTS:', errText);
      return NextResponse.json({ error: 'Error generando audio' }, { status: 500 });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (err) {
    console.error('Error en /api/texto-a-voz:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}