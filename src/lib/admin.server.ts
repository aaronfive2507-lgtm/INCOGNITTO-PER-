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
