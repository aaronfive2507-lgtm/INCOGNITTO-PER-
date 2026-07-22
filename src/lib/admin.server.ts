import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const passwordSchema = z.object({ password: z.string().min(1) });

function checkPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD no está configurado en el servidor. Ver SETUP.md.");
  }
  if (password !== expected) {
    throw new Error("Contraseña incorrecta.");
  }
}

export const adminLogin = createServerFn({ method: "POST" })
  .validator((data: unknown) => passwordSchema.parse(data))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    return { ok: true };
  });

export const fetchAdminData = createServerFn({ method: "POST" })
  .validator((data: unknown) => passwordSchema.parse(data))
  .handler(async ({ data }) => {
    checkPassword(data.password);

    const [{ data: asignaciones, error: asigError }, { data: preguntas, error: chatError }] =
      await Promise.all([
        supabaseAdmin
          .from("asignaciones_mision")
          .select("*")
          .order("fecha_mision", { ascending: false }),
        supabaseAdmin
          .from("chat_preguntas")
          .select("*")
          .order("fecha", { ascending: false })
          .limit(500),
      ]);

    if (asigError) throw new Error(asigError.message);
    if (chatError) throw new Error(chatError.message);

    return { asignaciones: asignaciones ?? [], preguntas: preguntas ?? [] };
  });

const DEFAULT_SYSTEM_PROMPT =
  "Eres el asistente de misión de INCOGNITTO. Tu rol es resolver dudas de un evaluador antes y durante la visita. Hablas en español peruano, eres breve, directo y operativo (máx. 4 oraciones).";

// El quiz de cada misión debe tener siempre exactamente esta cantidad de preguntas.
const QUIZ_LENGTH = 5;

const quizPreguntaSchema = z.object({
  pregunta: z.string(),
  opciones: z.array(z.string()),
  correcta: z.number(),
});

const misionInputSchema = z.object({
  id: z.string().optional(),
  celular_evaluador: z.string().min(1, "El celular es obligatorio"),
  nombre_evaluador: z.string().optional().default(""),
  local_asignado: z.string().min(1, "El local asignado es obligatorio"),
  campana: z.string().optional().default(""),
  fecha_mision: z.string().optional().default(""),
  video_url: z.string().optional().default(""),
  categoria: z.string().optional().default(""),
  pasos_evaluacion: z.array(z.string()).default([]),
  alerta_identidad: z.string().optional().default(""),
  preguntas_quiz: z.array(quizPreguntaSchema).default([]),
  system_prompt_chat: z.string().optional().default(""),
});

const saveMisionSchema = z.object({
  password: z.string().min(1),
  mision: misionInputSchema,
});

export const saveMision = createServerFn({ method: "POST" })
  .validator((data: unknown) => saveMisionSchema.parse(data))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const m = data.mision;

    const preguntasValidas = m.preguntas_quiz.filter((q) => q.pregunta.trim());
    if (preguntasValidas.length !== QUIZ_LENGTH) {
      throw new Error(
        `El quiz debe tener exactamente ${QUIZ_LENGTH} preguntas (tiene ${preguntasValidas.length}). Usa "Generar quiz con IA" o agrega/quita preguntas manualmente.`,
      );
    }

    const payload = {
      celular_evaluador: m.celular_evaluador.trim(),
      nombre_evaluador: m.nombre_evaluador.trim() || null,
      local_asignado: m.local_asignado.trim(),
      campana: m.campana.trim() || null,
      fecha_mision: m.fecha_mision || null,
      video_url: m.video_url.trim(),
      categoria: m.categoria.trim() || null,
      pasos_evaluacion: m.pasos_evaluacion.map((p) => p.trim()).filter(Boolean),
      alerta_identidad: m.alerta_identidad.trim(),
      preguntas_quiz: preguntasValidas,
      system_prompt_chat: m.system_prompt_chat.trim() || DEFAULT_SYSTEM_PROMPT,
    };

    if (m.id) {
      const { error } = await supabaseAdmin
        .from("asignaciones_mision")
        .update(payload)
        .eq("id", m.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("asignaciones_mision").insert(payload);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

const generateQuizSchema = z.object({
  password: z.string().min(1),
  contexto: z.object({
    local_asignado: z.string().min(1),
    categoria: z.string().optional().default(""),
    campana: z.string().optional().default(""),
    pasos_evaluacion: z.array(z.string()).default([]),
    alerta_identidad: z.string().optional().default(""),
  }),
});

function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

async function callClaudeForJson(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || "Error al consultar a Claude.");
  }
  return json.content?.[0]?.text ?? "";
}

export const generateQuiz = createServerFn({ method: "POST" })
  .validator((data: unknown) => generateQuizSchema.parse(data))
  .handler(async ({ data }) => {
    checkPassword(data.password);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY no está configurado en el servidor. Ver SETUP.md.");
    }

    const c = data.contexto;
    const pasos = c.pasos_evaluacion.filter((p) => p.trim());
    const prompt = `Vas a redactar un quiz de opción múltiple para EVALUAR LA COMPRENSIÓN REAL — no la memorización — de un evaluador de mystery shopping antes de su visita.

Local a evaluar: ${c.local_asignado}
Categoría: ${c.categoria || "no especificada"}
Campaña: ${c.campana || "no especificada"}
Pasos que debe seguir el evaluador durante la visita:
${pasos.length ? pasos.map((p, i) => `${i + 1}. ${p}`).join("\n") : "(sin pasos definidos)"}
Alerta de identidad: ${c.alerta_identidad || "no revelar que es evaluador bajo ninguna circunstancia"}

Requisitos de las preguntas (muy importante, no los ignores):
- NO hagas preguntas de memorización directa que solo repitan un dato textual de la lista de pasos (ej. "¿cuánto tiempo debe...?" cuando el paso ya lo dice literal). Eso es demasiado obvio.
- La mayoría de las preguntas deben ser de escenario: plantea una situación concreta que podría pasar durante la visita ("¿qué harías si...?", "el vendedor te dice X, ¿cómo respondes?") y pregunta qué debería hacer, registrar u observar el evaluador.
- Al menos 2 de las 5 preguntas deben requerir combinar o relacionar dos pasos/datos distintos del checklist, no solo uno aislado.
- Las 2 opciones incorrectas de cada pregunta deben ser errores creíbles y comunes que un evaluador descuidado podría cometer — nunca opciones absurdas, graciosas o obviamente falsas a simple vista. Alguien que no entendió bien la misión debería poder dudar entre las 3 opciones.
- Cada pregunta tiene una única respuesta correcta e inequívoca dado el contexto de arriba.
- Las preguntas deben ser específicas a este local, categoría y estos pasos — no genéricas ni reutilizables para cualquier misión.

Genera EXACTAMENTE ${QUIZ_LENGTH} preguntas de opción múltiple (3 opciones cada una). Es obligatorio que el array tenga exactamente ${QUIZ_LENGTH} elementos, ni más ni menos.

Responde ÚNICAMENTE con un array JSON válido, sin texto adicional ni bloques de código, con este formato exacto:
[{"pregunta": "...", "opciones": ["...", "...", "..."], "correcta": 0}]
donde "correcta" es el índice (0, 1 o 2) de la opción correcta dentro de "opciones".`;

    const text = await callClaudeForJson(apiKey, prompt);
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFences(text));
    } catch {
      throw new Error("Claude no devolvió un formato válido. Intenta generar el quiz de nuevo.");
    }

    const result = z.array(quizPreguntaSchema).safeParse(parsed);
    if (!result.success) {
      throw new Error("El quiz generado no tuvo el formato esperado. Intenta de nuevo.");
    }
    if (result.data.length !== QUIZ_LENGTH) {
      throw new Error(
        `Claude generó ${result.data.length} preguntas en vez de ${QUIZ_LENGTH}. Intenta generar de nuevo.`,
      );
    }

    return { preguntas_quiz: result.data };
  });

const generatePasosSchema = z.object({
  password: z.string().min(1),
  contexto: z.object({
    local_asignado: z.string().min(1),
    categoria: z.string().optional().default(""),
    campana: z.string().optional().default(""),
  }),
});

export const generatePasos = createServerFn({ method: "POST" })
  .validator((data: unknown) => generatePasosSchema.parse(data))
  .handler(async ({ data }) => {
    checkPassword(data.password);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY no está configurado en el servidor. Ver SETUP.md.");
    }

    const c = data.contexto;
    const prompt = `Vas a redactar el checklist de pasos que debe seguir un evaluador de mystery shopping (INCOGNITTO) durante su visita a un local, para capacitarlo antes de ir.

Local a evaluar: ${c.local_asignado}
Categoría: ${c.categoria || "no especificada"}
Campaña: ${c.campana || "no especificada"}

Genera entre 5 y 8 pasos concretos y específicos al tipo de negocio de este local (por ejemplo: en un restaurante, pasos sobre pedir la carta, tiempo de espera, calidad del servicio, limpieza del local; en una concesionaria de autos, pasos sobre atención del vendedor, tiempo de espera, presentación de modelos, prueba de manejo, seguimiento post-visita). Cada paso debe describir una acción u observación puntual y verificable que el evaluador puede ejecutar y registrar durante la visita — no consejos genéricos.

Responde ÚNICAMENTE con un array JSON de strings, sin texto adicional ni bloques de código, con este formato exacto:
["Paso 1...", "Paso 2...", "Paso 3..."]`;

    const text = await callClaudeForJson(apiKey, prompt);
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFences(text));
    } catch {
      throw new Error("Claude no devolvió un formato válido. Intenta generar los pasos de nuevo.");
    }

    const result = z.array(z.string()).safeParse(parsed);
    if (!result.success || result.data.length === 0) {
      throw new Error("Los pasos generados no tuvieron el formato esperado. Intenta de nuevo.");
    }

    return { pasos_evaluacion: result.data };
  });

const buscarLocalSchema = z.object({
  password: z.string().min(1),
  local_asignado: z.string().min(1),
});

export const buscarDatosLocal = createServerFn({ method: "POST" })
  .validator((data: unknown) => buscarLocalSchema.parse(data))
  .handler(async ({ data }) => {
    checkPassword(data.password);

    const { data: rows, error } = await supabaseAdmin
      .from("asignaciones_mision")
      .select("campana, categoria")
      .ilike("local_asignado", data.local_asignado.trim())
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);

    const row = rows?.[0];
    return { campana: row?.campana ?? null, categoria: row?.categoria ?? null };
  });

const idSchema = z.object({ password: z.string().min(1), id: z.string().min(1) });

export const deleteMision = createServerFn({ method: "POST" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { error } = await supabaseAdmin.from("asignaciones_mision").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reassignMision = createServerFn({ method: "POST" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { error } = await supabaseAdmin
      .from("asignaciones_mision")
      .update({ estado: "pendiente", intentos_quiz: 0 })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
