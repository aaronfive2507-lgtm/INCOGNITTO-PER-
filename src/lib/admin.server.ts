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
      preguntas_quiz: m.preguntas_quiz.filter((q) => q.pregunta.trim()),
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
