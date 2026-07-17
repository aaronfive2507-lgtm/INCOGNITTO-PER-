-- INCOGNITTO — esquema del portal de evaluadores
-- Aplicar en el SQL Editor de Supabase (o `supabase db push` si tienes el CLI conectado).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.asignaciones_mision (
  id uuid primary key default gen_random_uuid(),
  celular_evaluador text not null,
  nombre_evaluador text,
  local_asignado text not null,
  campana text,
  fecha_mision date,
  video_url text not null default '',
  categoria text,
  pasos_evaluacion jsonb not null default '[]'::jsonb,
  alerta_identidad text not null default '',
  preguntas_quiz jsonb not null default '[]'::jsonb,
  system_prompt_chat text not null default
    'Eres el asistente de misión de INCOGNITTO. Tu rol es resolver dudas de un evaluador antes y durante la visita. Hablas en español peruano, eres breve, directo y operativo (máx. 4 oraciones).',
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'capacitado', 'reprobado', 'completado')),
  intentos_quiz integer not null default 0,
  creado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asignaciones_mision_celular_idx
  on public.asignaciones_mision (celular_evaluador);

create table if not exists public.quiz_resultados (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null references public.asignaciones_mision (id) on delete cascade,
  puntaje integer not null,
  aprobado boolean not null,
  fecha timestamptz not null default now()
);

create index if not exists quiz_resultados_asignacion_idx
  on public.quiz_resultados (asignacion_id);

create table if not exists public.chat_preguntas (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid references public.asignaciones_mision (id) on delete set null,
  pregunta text not null,
  respuesta text,
  fecha timestamptz not null default now()
);

create index if not exists chat_preguntas_asignacion_idx
  on public.chat_preguntas (asignacion_id);

-- ---------------------------------------------------------------------------
-- RLS: activado en las 3 tablas. Ningún acceso directo para `anon` —
-- el flujo del evaluador pasa por las funciones RPC de abajo (SECURITY DEFINER),
-- así nunca se expone la tabla completa (celulares, nombres) al rol público.
-- Los usuarios autenticados (equipo interno) sí pueden leer todo para el panel admin.
-- ---------------------------------------------------------------------------

alter table public.asignaciones_mision enable row level security;
alter table public.quiz_resultados enable row level security;
alter table public.chat_preguntas enable row level security;

create policy "authenticated puede leer asignaciones"
  on public.asignaciones_mision for select
  to authenticated
  using (true);

create policy "authenticated puede leer quiz_resultados"
  on public.quiz_resultados for select
  to authenticated
  using (true);

create policy "authenticated puede leer chat_preguntas"
  on public.chat_preguntas for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- RPC: búsqueda de misión por celular (sin login).
-- SECURITY DEFINER + search_path fijo para evitar hijacking de esquema.
-- ---------------------------------------------------------------------------

create or replace function public.buscar_misiones_por_celular(p_celular text)
returns setof public.asignaciones_mision
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.asignaciones_mision
  where celular_evaluador = p_celular
    and estado in ('pendiente', 'reprobado')
  order by fecha_mision asc nulls last;
$$;

revoke all on function public.buscar_misiones_por_celular(text) from public;
grant execute on function public.buscar_misiones_por_celular(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: registrar resultado del quiz (sin login).
-- Aprobado si puntaje >= 3. Actualiza intentos_quiz y estado de la asignación.
-- ---------------------------------------------------------------------------

create or replace function public.registrar_resultado_quiz(
  p_asignacion_id uuid,
  p_puntaje integer
)
returns table (aprobado boolean, intentos integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aprobado boolean;
  v_intentos integer;
begin
  v_aprobado := p_puntaje >= 3;

  insert into public.quiz_resultados (asignacion_id, puntaje, aprobado)
  values (p_asignacion_id, p_puntaje, v_aprobado);

  update public.asignaciones_mision
  set
    intentos_quiz = intentos_quiz + 1,
    estado = case when v_aprobado then 'capacitado' else 'reprobado' end,
    updated_at = now()
  where id = p_asignacion_id
  returning intentos_quiz into v_intentos;

  return query select v_aprobado, v_intentos;
end;
$$;

revoke all on function public.registrar_resultado_quiz(uuid, integer) from public;
grant execute on function public.registrar_resultado_quiz(uuid, integer) to anon, authenticated;
