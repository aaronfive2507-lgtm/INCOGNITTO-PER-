# INCOGNITTO — Puesta en marcha

Este proyecto (Vite + TanStack Start + Supabase) ya tiene todo el código listo. Faltan pasos que solo se pueden hacer desde tus propias cuentas (Supabase, Resend, Vercel, GitHub). Sigue este orden.

## 1. Aplicar el esquema de base de datos

1. Entra al dashboard de tu proyecto Supabase (`crgbihaefbudqfosddwa`) → **SQL Editor**.
2. Pega y ejecuta el contenido de [`supabase/migrations/20260715000000_incognitto_schema.sql`](supabase/migrations/20260715000000_incognitto_schema.sql).
3. Verifica que se crearon las tablas `asignaciones_mision`, `quiz_resultados`, `chat_preguntas` y las funciones `buscar_misiones_por_celular` / `registrar_resultado_quiz`.
4. (Opcional pero recomendado) Si más adelante instalas el Supabase CLI y conectas este proyecto, corre:
   ```bash
   supabase gen types typescript --project-id crgbihaefbudqfosddwa > src/integrations/supabase/types.ts
   ```
   para reemplazar la versión escrita a mano en `src/integrations/supabase/types.ts` por la generada automáticamente.

## 2. Cargar misiones de prueba (opcional)

Para probar el flujo de `/capacitacion` sin esperar datos reales, inserta una fila de ejemplo desde el SQL Editor:

```sql
insert into public.asignaciones_mision
  (celular_evaluador, nombre_evaluador, local_asignado, campana, fecha_mision, video_url, categoria, pasos_evaluacion, alerta_identidad, preguntas_quiz)
values (
  '987654321', 'Evaluador de prueba', 'Pollería Don Tito', 'Prueba', current_date, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Restaurantes',
  '["Cronometra desde que te sientas hasta que el mesero te saluda.", "Verifica si el mesero menciona alguna promoción sin que preguntes.", "Haz un pedido especial y observa la disposición.", "Observa la despedida al pagar.", "Completa el formulario dentro de 30 minutos tras salir."]'::jsonb,
  'Bajo ninguna circunstancia reveles que eres evaluador. Si te preguntan, mantén tu rol de cliente.',
  '[{"pregunta":"¿En cuánto tiempo debe saludarte el mesero?","opciones":["En cualquier momento","Antes de 1 minuto","Antes de 5 minutos"],"correcta":1},
    {"pregunta":"¿Puedes decir que eres evaluador?","opciones":["Sí, si preguntan","Sí, al pagar","No, nunca"],"correcta":2},
    {"pregunta":"¿Cuándo llenas el formulario?","opciones":["Al día siguiente","Dentro de 30 min de salir","Antes de entrar"],"correcta":1},
    {"pregunta":"¿Qué debes hacer si el mesero no ofrece ninguna promoción?","opciones":["Pedir que te ofrezca una","Anotar que no lo hizo, tal como ocurrió","No decir nada y salir"],"correcta":1},
    {"pregunta":"¿Por qué debes hacer un pedido especial durante la visita?","opciones":["Para poner a prueba la paciencia del mesero","Para evaluar la disposición real del mesero ante algo fuera de rutina","No es necesario, es opcional"],"correcta":1}]'::jsonb
);
```

Prueba con el celular `987654321` en `/capacitacion`.

## 3. Función edge `anthropic-chat`

Ya existía y se extendió para registrar cada pregunta del chat en `chat_preguntas`. Debes:

1. Confirmar que el secreto `ANTHROPIC_API_KEY` sigue configurado (dashboard → Edge Functions → Secrets). Si no existe, agrégalo con tu API key de [console.anthropic.com](https://console.anthropic.com).
2. **Importante**: `supabase/config.toml` ahora marca esta función con `verify_jwt = false` (la app la llama con la publishable key `sb_publishable_...`, que ya no es un JWT, y el gateway de Supabase la rechazaba antes de ejecutar el código — eso causaba el error "Invalid API key" / "Error al consultar al asistente" en el chat de `/capacitacion`). Este cambio de config solo se aplica al volver a desplegar:
   ```bash
   supabase functions deploy anthropic-chat
   ```
   (requiere Supabase CLI autenticado y vinculado al proyecto). `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles automáticamente dentro de las funciones edge — no hace falta configurarlos a mano.

## 3.1. Quiz: 5 preguntas, mínimo 4 correctas para aprobar

El panel de administración ahora exige que cada misión tenga **exactamente 5 preguntas** de quiz (al guardar o generar con IA), y el evaluador necesita acertar **al menos 4 de 5** para pasar al chat de dudas.

La misión de prueba de Aarón (`986832102`, Pollería Don Tito) y la del Paso 2 (`987654321`) se crearon antes de este cambio con solo 3 preguntas — con 3 preguntas es matemáticamente imposible sacar 4 correctas. Edítalas en `/admin` (botón **Editar** → **Generar quiz con IA**) para que tengan 5 preguntas antes de probar el flujo de nuevo.

## 4. Correo del formulario de contacto (Resend)

1. Crea una cuenta gratuita en [resend.com](https://resend.com) y genera una API key.
2. Verifica un dominio/remitente propio, o usa temporalmente `onboarding@resend.dev` (ya configurado como remitente por defecto en `src/lib/contact.server.ts` — cámbialo por tu dominio verificado cuando lo tengas).
3. Configura la variable de entorno `RESEND_API_KEY` donde despliegues el servidor TanStack Start (Vercel → Project Settings → Environment Variables).
4. Cambia el correo destino `hola@incognitto.com` en `src/lib/contact.server.ts` si usan otro.

Sin `RESEND_API_KEY`, el formulario muestra un error claro en vez de fallar silenciosamente.

## 5. Contraseña del panel de administración

`/admin` ya no usa cuentas individuales de Supabase Auth — usa una única contraseña compartida por el equipo (Felipe, Vanessa, Fátima), verificada del lado del servidor en `src/lib/admin.server.ts`. Los datos (`asignaciones_mision`, `chat_preguntas`) se leen con la service role key desde el servidor, así que nunca quedan expuestos por la clave pública aunque alguien inspeccione el tráfico del navegador.

1. Elige una contraseña y configúrala como variable de entorno `ADMIN_PASSWORD` en Vercel (ver tabla del paso 6). No hay usuario/correo, solo esa contraseña.
2. Necesitas también la **service role key** de tu proyecto Supabase: dashboard → **Settings → API → service_role** (la clave secreta, no la `anon`/`publishable`). Configúrala como `SUPABASE_SERVICE_ROLE_KEY` en Vercel — **nunca** la pongas en una variable `VITE_*` ni la subas a ningún archivo del repo, solo vive en las variables de entorno del servidor.

## 6. Variables de entorno necesarias en Vercel

| Variable                        | Dónde se usa                                                  | Ya existe                   |
| ------------------------------- | ------------------------------------------------------------- | --------------------------- |
| `VITE_SUPABASE_URL`             | Cliente (browser)                                             | Sí (`.env`)                 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Cliente (browser)                                             | Sí (`.env`)                 |
| `SUPABASE_URL`                  | SSR / server functions                                        | Sí (`.env`)                 |
| `SUPABASE_PUBLISHABLE_KEY`      | SSR / server functions                                        | Sí (`.env`)                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | `src/lib/admin.server.ts` (panel de administración)           | **Falta agregar**           |
| `ADMIN_PASSWORD`                | `src/lib/admin.server.ts` (login del panel de administración) | **Falta agregar**           |
| `RESEND_API_KEY`                | `src/lib/contact.server.ts`                                   | **Falta agregar**           |
| `ANTHROPIC_API_KEY`             | `src/lib/admin.server.ts` (generar quiz con IA en `/admin`)   | **Falta agregar en Vercel** |

`ANTHROPIC_API_KEY` debe estar configurada en **dos lugares distintos** con el mismo valor: como secreto de la función edge `anthropic-chat` en Supabase (ya lo estaba, para el chat del evaluador) y ahora también como variable de entorno en Vercel (para que el botón "Generar quiz con IA" del panel de administración funcione).

## 7. Desplegar en Vercel

1. Conecta el repositorio de GitHub desde el dashboard de Vercel ("Import Project").
2. Framework preset: Vite (o "Other" si Vercel no detecta TanStack Start automáticamente; el build ya usa Nitro con salida compatible).
3. Build command: `npm run build`. Output: el que genera Nitro (`.output` / `dist`, según el preset activo en `vite.config.ts`).
4. Agrega las variables de entorno de la tabla de arriba.
5. Deploy.
