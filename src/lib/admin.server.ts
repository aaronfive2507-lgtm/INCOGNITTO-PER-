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

// TEMPORARY DIAGNOSTIC — remove once the "JWT issued at future" issue is confirmed fixed.
// Decodes the service role key's JWT payload (no signature/secret exposed) and compares
// its `iat` against the server's own clock, since that mismatch is exactly what the error means.
function logServiceKeyDiagnostics() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  console.info("[admin debug] SUPABASE_SERVICE_ROLE_KEY length:", key.length);
  console.info("[admin debug] first 10 / last 10 chars:", key.slice(0, 10), key.slice(-10));
  const parts = key.split(".");
  console.info("[admin debug] JWT segment count (should be 3):", parts.length);
  if (parts.length === 3) {
    try {
      const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = Buffer.from(payloadB64, "base64").toString("utf8");
      const claims = JSON.parse(json);
      console.info("[admin debug] decoded claims:", claims);
      if (typeof claims.iat === "number") {
        console.info("[admin debug] iat as date:", new Date(claims.iat * 1000).toISOString());
      }
    } catch (e) {
      console.info("[admin debug] failed to decode JWT payload:", e);
    }
  }
  console.info("[admin debug] server time now:", new Date().toISOString());
}

export const fetchAdminData = createServerFn({ method: "POST" })
  .validator((data: unknown) => passwordSchema.parse(data))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    logServiceKeyDiagnostics();

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
