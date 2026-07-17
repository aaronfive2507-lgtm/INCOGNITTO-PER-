import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  empresa: z.string().trim().min(1, "La empresa es obligatoria"),
  correo: z.string().trim().email("Correo inválido"),
  mensaje: z.string().trim().optional().default(""),
});

const CONTACT_TO = "hola@incognitto.com";
const CONTACT_FROM = "INCOGNITTO <onboarding@resend.dev>";

export const sendContactEmail = createServerFn({ method: "POST" })
  .validator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "El envío de correo no está configurado todavía (falta RESEND_API_KEY). Ver SETUP.md.",
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: [CONTACT_TO],
        reply_to: data.correo,
        subject: `Nueva solicitud de ${data.nombre} — ${data.empresa}`,
        text: `Nombre: ${data.nombre}\nEmpresa: ${data.empresa}\nCorreo: ${data.correo}\n\nMensaje:\n${data.mensaje || "(sin mensaje)"}`,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`No se pudo enviar el correo (${res.status}): ${body}`);
    }

    return { ok: true };
  });
