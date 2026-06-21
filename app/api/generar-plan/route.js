import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { cargoNombre, indiceClaridad, brechasCoincidentes, brechasDivergentes, recomendaciones } =
      await request.json();

    const prompt = `Basado en este análisis de diagnóstico de rol para el cargo "${cargoNombre}":

Índice de Claridad: ${indiceClaridad}
Brechas coincidentes: ${JSON.stringify(brechasCoincidentes)}
Brechas divergentes: ${JSON.stringify(brechasDivergentes)}
Recomendaciones: ${JSON.stringify(recomendaciones)}

Genera un plan de aprendizaje con:
1. Entre 2 y 4 objetivos de aprendizaje priorizados.
2. Entre 3 y 5 retos concretos, accionables y verificables — algo que la persona pueda hacer esta semana, no algo abstracto.

Responde SOLO con un objeto JSON, sin texto adicional, con esta estructura exacta:
{
  "objetivos": [ { "tema": "...", "origen": "brecha_persona|brecha_supervisor|ambas", "prioridad": "alta|media|baja" } ],
  "retos": [ { "descripcion": "..." } ]
}

Ejemplo de reto bueno: "Pedir a tu supervisor que te acompañe en el próximo cierre de facturación y tomar nota de cada paso." Ejemplo de reto malo (evítalo): "Mejorar en facturación." Lenguaje constructivo, en español.`;

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
      return NextResponse.json({ error: 'Error generando plan' }, { status: 500 });
    }

    const data = await response.json();
    const plan = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(plan);
  } catch (err) {
    console.error('Error en /api/generar-plan:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}