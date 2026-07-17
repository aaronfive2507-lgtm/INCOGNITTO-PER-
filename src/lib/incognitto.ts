// Tipos y helpers de datos para el portal de evaluadores de INCOGNITTO.
import { supabase } from "@/integrations/supabase/client";

export type QuizPregunta = {
  pregunta: string;
  opciones: string[];
  correcta: number;
};

export type EstadoMision = "pendiente" | "capacitado" | "reprobado" | "completado";

export interface AsignacionMision {
  id: string;
  celular_evaluador: string;
  nombre_evaluador: string | null;
  local_asignado: string;
  campana: string | null;
  fecha_mision: string | null;
  video_url: string;
  categoria: string | null;
  pasos_evaluacion: string[];
  alerta_identidad: string;
  preguntas_quiz: QuizPregunta[];
  system_prompt_chat: string;
  estado: EstadoMision;
  intentos_quiz: number;
}

// --- YouTube helpers ---------------------------------------------------

export function extractYoutubeId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{6,15}$/.test(trimmed)) return trimmed;
  const patterns = [
    /youtube\.com\/embed\/([A-Za-z0-9_-]+)/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/,
    /youtu\.be\/([A-Za-z0-9_-]+)/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return "";
}

export function toEmbedUrl(input: string): string {
  const id = extractYoutubeId(input);
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

// --- Búsqueda de misión por celular (RPC, no expone la tabla cruda) ----

export async function buscarMisionesPorCelular(celular: string): Promise<AsignacionMision[]> {
  const { data, error } = await supabase.rpc("buscar_misiones_por_celular", {
    p_celular: celular,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AsignacionMision[];
}

// --- Registro de resultado de quiz (RPC) -------------------------------

export async function registrarResultadoQuiz(
  asignacionId: string,
  puntaje: number,
): Promise<{ aprobado: boolean; intentos: number }> {
  const { data, error } = await supabase.rpc("registrar_resultado_quiz", {
    p_asignacion_id: asignacionId,
    p_puntaje: puntaje,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    aprobado: Boolean(row?.aprobado),
    intentos: Number(row?.intentos ?? 0),
  };
}

// --- Chat con Claude (vía función edge, con registro server-side) ------

export async function callClaude(opts: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  asignacionId?: string;
}): Promise<string> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 600,
      system: opts.system,
      messages: opts.messages,
      asignacion_id: opts.asignacionId,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Error al consultar al asistente.");
  }
  return data.text || "";
}

export function buildSystemPrompt(a: AsignacionMision): string {
  return `${a.system_prompt_chat}

CONTEXTO DE LA MISIÓN
- Local: ${a.local_asignado}
- Categoría: ${a.categoria ?? "—"}
- Pasos de la visita: ${a.pasos_evaluacion.join(" | ")}
- Alerta de identidad: ${a.alerta_identidad}

Responde siempre en español peruano, breve y operativo (máx. 4 oraciones). Este chat responde solo dudas sobre la misión asignada; si preguntan algo fuera de tema, redirige amablemente al briefing.`;
}
