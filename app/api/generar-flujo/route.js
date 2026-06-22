import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request) {
  try {
    const { texto } = await request.json();

    if (!texto || texto.trim().length < 10) {
      return NextResponse.json({ error: 'Texto de instructivo vacío o muy corto' }, { status: 400 });
    }

    const prompt = `Convierte el siguiente instructivo en pasos para un diagrama de flujo. Responde ÚNICAMENTE con JSON válido, sin texto adicional ni bloques de markdown.

Instructivo:
"""
${texto}
"""

Formato exacto:
{
  "pasos": [
    { "id": "1", "titulo": "string corto, máx 6 palabras", "tipo": "inicio|accion|decision|fin", "icono": "Play|FileText|CheckCircle|AlertTriangle|Flag|Clock|Users", "descripcion": "1-2 frases" }
  ],
  "conexiones": [
    { "origen": "id_paso", "destino": "id_paso", "etiqueta": "" }
  ]
}

Reglas:
- El primer paso es tipo "inicio", el último tipo "fin".
- "decision" solo si el instructivo describe una bifurcación real (si/no, depende de...).
- Máximo 8 pasos; si el instructivo es simple, usa 3-4.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const flujo = JSON.parse(completion.choices[0].message.content);
    flujo.generadoFecha = new Date().toISOString();

    return NextResponse.json({ flujo });
  } catch (error) {
    console.error('Error generando flujo:', error);
    return NextResponse.json({ error: 'Error generando el diagrama' }, { status: 500 });
  }
}