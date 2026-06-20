import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      return NextResponse.json({ error: 'No se recibió audio' }, { status: 400 });
    }

    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile, 'audio.webm');
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'es');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error de Whisper:', errText);
      return NextResponse.json({ error: 'Error transcribiendo' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ texto: data.text });
  } catch (err) {
    console.error('Error en /api/transcribir:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
