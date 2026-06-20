import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { cargoNombre, tareasPersona, tareasSupervisor, instructivos } = await request.json();

    const seccionInstructivos = instructivos && instructivos.length > 0
      ? `\n\nInstructivos de referencia para algunas tareas (cómo se supone que se hacen bien, según la empresa):\n${JSON.stringify(instructivos, null, 2)}`
      : '';

    const prompt = `Eres un consultor de desarrollo organizacional analizando un diagnóstico doble de rol para el cargo "${cargoNombre}".

Respuestas de autopercepción (la persona evaluándose a sí misma):
${JSON.stringify(tareasPersona, null, 2)}

Respuestas de observación del supervisor (sobre la misma persona):
${JSON.stringify(tareasSupervisor, null, 2)}${seccionInstructivos}

Cada respuesta tiene: tareaNombre, nivelDominio (1-5, donde 5 es dominio completo), y comentario.

Analiza ambas miradas y responde SOLO con un objeto JSON (sin texto adicional, sin markdown) con esta estructura exacta:
{
  "indiceClaridad": <número entero 0-100, qué tan clara y alineada está esta persona sobre su rol>,
  "brechasCoincidentes": [ { "tarea": "...", "nota": "..." } ],
  "brechasDivergentes": [ { "tarea": "...", "autopercepcion": "...", "observacionSupervisor": "...", "nota": "..." } ],
  "recomendaciones": [ "...", "..." ]
}

Importante: si hay un instructivo de referencia para una tarea, compara lo que la persona y el supervisor dijeron contra ESE instructivo específico, no contra buenas prácticas genéricas — tus recomendaciones deben citar pasos concretos del instructivo cuando exista uno. Si no hay instructivo para una tarea, ahí sí puedes dar una recomendación general. El lenguaje debe sentirse constructivo, no punitivo, esto es para armar un plan de aprendizaje. Responde en español.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error de OpenAI:', errText);
      return NextResponse.json({ error: 'Error generando análisis' }, { status: 500 });
    }

    const data = await response.json();
    const analisis = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(analisis);
  } catch (err) {
    console.error('Error en /api/analizar-diagnostico:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}