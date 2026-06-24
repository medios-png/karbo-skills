import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request) {
  try {
    const { texto, tareasCriticas } = await request.json();

    if (!texto || texto.trim().length < 5) {
      return NextResponse.json({ error: 'Texto vacío' }, { status: 400 });
    }

    const listaTareas = tareasCriticas.map((t) => t.nombre).join(', ');

    const prompt = `Eres un asistente de formación operativa. Recibirás la observación de un supervisor sobre el desempeño de un colaborador.
Identifica: (1) la tarea crítica a la que se refiere la observación, eligiendo de esta lista: [${listaTareas}].
(2) Si la observación es positiva (dominio confirmado), negativa (brecha detectada) o neutra (sin evidencia suficiente).
(3) Una etiqueta breve de máximo 8 palabras que resuma la observación.
Responde SOLO en JSON válido, sin texto adicional:
{"tareaCritica": "nombre_exacto_de_la_lista", "tipo": "positiva|negativa|neutra", "etiqueta": "texto breve"}

Observación del supervisor: "${texto}"`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const resultado = JSON.parse(completion.choices[0].message.content);

    const tareaEncontrada = tareasCriticas.find(
      (t) => t.nombre.toLowerCase().trim() === resultado.tareaCritica?.toLowerCase().trim()
    );

    return NextResponse.json({
      resultado,
      confianzaAlta: !!tareaEncontrada,
      tareaEncontrada: tareaEncontrada || null,
    });
  } catch (error) {
    console.error('Error clasificando observación:', error);
    return NextResponse.json({ error: 'Error clasificando la observación' }, { status: 500 });
  }
}