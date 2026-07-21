import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const celularSchema = z.object({ celular: z.string().min(1) });

export const buscarMisionPorCelular = createServerFn({ method: "POST" })
  .validator((data: unknown) => celularSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: asignaciones, error } = await supabaseAdmin
      .from("asignaciones_mision")
      .select("*")
      .eq("celular_evaluador", data.celular.trim())
      .in("estado", ["pendiente", "reprobado"])
      .order("fecha_mision", { ascending: true, nullsFirst: false });

    if (error) throw new Error(error.message);
    return { asignaciones: asignaciones ?? [] };
  });

const registrarQuizSchema = z.object({
  asignacion_id: z.string().min(1),
  puntaje: z.number().int().min(0),
});

// El quiz siempre tiene 5 preguntas (impuesto en el panel de administración);
// se necesitan al menos 4 correctas para aprobar.
const PUNTAJE_MINIMO_APROBAR = 4;

export const registrarResultadoQuizFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => registrarQuizSchema.parse(data))
  .handler(async ({ data }) => {
    const aprobado = data.puntaje >= PUNTAJE_MINIMO_APROBAR;

    const { error: insertError } = await supabaseAdmin
      .from("quiz_resultados")
      .insert({ asignacion_id: data.asignacion_id, puntaje: data.puntaje, aprobado });
    if (insertError) throw new Error(insertError.message);

    const { data: current, error: fetchError } = await supabaseAdmin
      .from("asignaciones_mision")
      .select("intentos_quiz")
      .eq("id", data.asignacion_id)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    const intentos = (current?.intentos_quiz ?? 0) + 1;

    const { error: updateError } = await supabaseAdmin
      .from("asignaciones_mision")
      .update({
        intentos_quiz: intentos,
        estado: aprobado ? "capacitado" : "reprobado",
      })
      .eq("id", data.asignacion_id);
    if (updateError) throw new Error(updateError.message);

    return { aprobado, intentos };
  });
