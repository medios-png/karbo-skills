import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { pregunta, cargoNombre, tareasCriticas, instructivos } = await request.json();

    const contextoTareas = (tareasCriticas || [])
      .map((t) => `- ${t.nombre}: ${t.descripcion || 'sin descripción'}`)
      .join('\n');

    const contextoInstructivos = (instructivos || [])
      .map((i) => `- ${i.tareaNombre}: ${i.instructivo}`)
      .join('\n');

    const prompt = `Eres un asistente que ayuda a alguien en el cargo "${cargoNombre}" a resolver dudas sobre cómo hacer su trabajo.

Tareas críticas del cargo:
${contextoTareas || 'No hay tareas definidas todavía.'}

Instructivos de referencia disponibles:
${contextoInstructivos || 'No hay instructivos guardados todavía.'}

Pregunta de la persona: "${pregunta}"

Responde de forma directa, breve y práctica, en español. Si la pregunta se relaciona con una tarea que tiene instructivo, básate en ese instructivo. Si no, responde con buen criterio general para el cargo. No uses markdown, responde en texto plano.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error de OpenAI:', errText);
      return NextResponse.json({ error: 'Error generando respuesta' }, { status: 500 });
    }

    const data = await response.json();
    const respuesta = data.choices[0].message.content;

    return NextResponse.json({ respuesta });
  } catch (err) {
    console.error('Error en /api/responder-pregunta:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}