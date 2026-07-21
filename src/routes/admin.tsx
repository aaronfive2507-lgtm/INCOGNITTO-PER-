import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import "./admin.css";
import {
  adminLogin,
  deleteMision,
  fetchAdminData,
  generateQuiz,
  reassignMision,
  saveMision,
} from "@/lib/admin.server";
import type { Json, Tables } from "@/integrations/supabase/types";
import type { QuizPregunta } from "@/lib/incognitto";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "INCOGNITTO — Panel de cumplimiento" }],
  }),
  component: AdminPage,
  ssr: false,
});

type Asignacion = Tables<"asignaciones_mision">;
type ChatPregunta = Tables<"chat_preguntas">;

function asStringArray(json: Json): string[] {
  return Array.isArray(json) ? json.filter((x): x is string => typeof x === "string") : [];
}

function asQuizArray(json: Json): QuizPregunta[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((x) => typeof x === "object" && x !== null && !Array.isArray(x))
    .map((x) => {
      const obj = x as Record<string, unknown>;
      const opciones = Array.isArray(obj.opciones)
        ? obj.opciones.filter((o): o is string => typeof o === "string")
        : [];
      return {
        pregunta: typeof obj.pregunta === "string" ? obj.pregunta : "",
        opciones,
        correcta: typeof obj.correcta === "number" ? obj.correcta : 0,
      };
    });
}

function AdminPage() {
  const [password, setPassword] = useState<string | null>(null);

  return (
    <div className="incognitto-admin">
      {password === null ? (
        <LoginScreen onSuccess={setPassword} />
      ) : (
        <Dashboard password={password} onLogout={() => setPassword(null)} />
      )}
    </div>
  );
}

function LoginScreen({ onSuccess }: { onSuccess: (password: string) => void }) {
  const login = useServerFn(adminLogin);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ data: { password: input } });
      onSuccess(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo verificar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 className="serif">Acceso administración</h1>
        <p className="sub">Ingresa la contraseña del equipo INCOGNITTO.</p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Verificando…" : "Ingresar"}
          </button>
          {error && <p className="error-msg">{error}</p>}
        </form>
      </div>
    </div>
  );
}

type View = "lista" | "form";

function Dashboard({ password, onLogout }: { password: string; onLogout: () => void }) {
  const getData = useServerFn(fetchAdminData);
  const removeMision = useServerFn(deleteMision);
  const reassign = useServerFn(reassignMision);

  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [preguntas, setPreguntas] = useState<ChatPregunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("lista");
  const [editing, setEditing] = useState<Asignacion | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    getData({ data: { password } })
      .then((res) => {
        setAsignaciones(res.asignaciones);
        setPreguntas(res.preguntas);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
        setLoading(false);
      });
  }, [password, getData]);

  useEffect(() => {
    load();
  }, [load]);

  const total = asignaciones.length;
  const aprobados = asignaciones.filter(
    (a) => a.estado === "capacitado" || a.estado === "completado",
  ).length;
  const pendientes = asignaciones.filter((a) => a.estado === "pendiente").length;
  const alertas = asignaciones.filter(
    (a) => a.estado === "reprobado" && (a.intentos_quiz ?? 0) >= 2,
  ).length;

  const topPreguntas = groupPreguntas(preguntas).slice(0, 8);

  const handleDelete = async (a: Asignacion) => {
    if (!confirm(`¿Eliminar la misión de ${a.nombre_evaluador || a.local_asignado}?`)) return;
    try {
      await removeMision({ data: { password, id: a.id } });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar.");
    }
  };

  const handleReassign = async (a: Asignacion) => {
    try {
      await reassign({ data: { password, id: a.id } });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo reasignar.");
    }
  };

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand">
            <span className="mono">INCOGNITTO</span>
            <div className="divider" />
            <span className="page-label">Panel de cumplimiento</span>
          </div>
          <div className="top-actions">
            <button onClick={onLogout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="wrap">
        <h1 className="serif">Cumplimiento de capacitación</h1>
        <p className="page-sub">Estado en tiempo real de los evaluadores asignados.</p>

        {loading ? (
          <div className="loading-state">Cargando datos…</div>
        ) : error ? (
          <p className="error-msg">{error}</p>
        ) : view === "form" ? (
          <MisionForm
            password={password}
            initial={editing}
            onCancel={() => {
              setView("lista");
              setEditing(null);
            }}
            onSaved={() => {
              setView("lista");
              setEditing(null);
              load();
            }}
          />
        ) : (
          <>
            <div className="summary-grid">
              <div className="summary-card">
                <div className="num">{total}</div>
                <div className="label">Evaluadores con misión activa</div>
              </div>
              <div className="summary-card">
                <div className="num ok">{aprobados}</div>
                <div className="label">Capacitación aprobada</div>
              </div>
              <div className="summary-card">
                <div className="num warn">{pendientes}</div>
                <div className="label">En proceso / sin completar</div>
              </div>
              <div className="summary-card">
                <div className="num danger">{alertas}</div>
                <div className="label">Alertas: 2+ intentos reprobados</div>
              </div>
            </div>

            <section className="block">
              <div className="section-title-row">
                <h2>Evaluadores</h2>
                <button
                  className="btn-new"
                  onClick={() => {
                    setEditing(null);
                    setView("form");
                  }}
                >
                  + Nueva misión
                </button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Evaluador</th>
                    <th>Local asignado</th>
                    <th>Campaña</th>
                    <th>Intentos quiz</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {asignaciones.map((a) => {
                    const isAlert = a.estado === "reprobado" && (a.intentos_quiz ?? 0) >= 2;
                    return (
                      <tr key={a.id} className={isAlert ? "alert-row" : ""}>
                        <td className="name-cell">{a.nombre_evaluador ?? "—"}</td>
                        <td>{a.local_asignado}</td>
                        <td>{a.campana ?? "—"}</td>
                        <td className={(a.intentos_quiz ?? 0) >= 2 ? "attempts high" : "attempts"}>
                          {a.intentos_quiz ?? 0}
                        </td>
                        <td>
                          <EstadoBadge estado={a.estado} alerta={isAlert} />
                        </td>
                        <td>
                          <button
                            className="action-link"
                            onClick={() => {
                              setEditing(a);
                              setView("form");
                            }}
                          >
                            Editar
                          </button>
                          {isAlert && (
                            <button className="action-link" onClick={() => handleReassign(a)}>
                              Reasignar
                            </button>
                          )}
                          <button className="action-link danger" onClick={() => handleDelete(a)}>
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {asignaciones.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-row">
                        Sin evaluadores registrados todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="block">
              <div className="section-title">
                <h2>Preguntas más frecuentes al chat de IA</h2>
                <span className="filter mono">Últimos registros</span>
              </div>
              {topPreguntas.length === 0 ? (
                <p style={{ color: "var(--ink-faint)", fontSize: 13.5 }}>
                  Aún no hay preguntas registradas.
                </p>
              ) : (
                <div className="questions-grid">
                  {topPreguntas.map((p) => (
                    <div className="question-card" key={p.pregunta}>
                      <div className="qtop">
                        <div className="qtext">"{p.pregunta}"</div>
                        <div className="qcount">×{p.count}</div>
                      </div>
                      <div className="qmeta">
                        Última vez: {new Date(p.ultima).toLocaleDateString("es-PE")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}

function EstadoBadge({ estado, alerta }: { estado: Asignacion["estado"]; alerta: boolean }) {
  if (alerta) {
    return (
      <span className="badge danger">
        <span className="dot" />
        Reprobado — reasignar
      </span>
    );
  }
  if (estado === "capacitado" || estado === "completado") {
    return (
      <span className="badge ok">
        <span className="dot" />
        Aprobado
      </span>
    );
  }
  if (estado === "reprobado") {
    return (
      <span className="badge danger">
        <span className="dot" />
        Reprobado
      </span>
    );
  }
  return (
    <span className="badge pending">
      <span className="dot" />
      Pendiente
    </span>
  );
}

function groupPreguntas(rows: ChatPregunta[]) {
  const map = new Map<string, { pregunta: string; count: number; ultima: string }>();
  for (const r of rows) {
    const key = r.pregunta.trim().toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (r.fecha > existing.ultima) existing.ultima = r.fecha;
    } else {
      map.set(key, { pregunta: r.pregunta, count: 1, ultima: r.fecha });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// ---------------- Formulario de misión ----------------

interface MisionFormState {
  celular_evaluador: string;
  nombre_evaluador: string;
  local_asignado: string;
  campana: string;
  fecha_mision: string;
  video_url: string;
  categoria: string;
  pasos_evaluacion: string[];
  alerta_identidad: string;
  preguntas_quiz: QuizPregunta[];
  system_prompt_chat: string;
}

const DEFAULT_SYSTEM_PROMPT =
  "Eres el asistente de misión de INCOGNITTO. Tu rol es resolver dudas de un evaluador antes y durante la visita. Hablas en español peruano, eres breve, directo y operativo (máx. 4 oraciones).";

// El quiz de cada misión debe tener siempre exactamente esta cantidad de preguntas
// (el evaluador necesita 4 de 5 correctas para aprobar — ver capacitacion.server.ts).
const QUIZ_LENGTH = 5;

function emptyMision(): MisionFormState {
  return {
    celular_evaluador: "",
    nombre_evaluador: "",
    local_asignado: "",
    campana: "",
    fecha_mision: "",
    video_url: "",
    categoria: "",
    pasos_evaluacion: [""],
    alerta_identidad:
      "Bajo ninguna circunstancia reveles que eres evaluador. Si te preguntan, mantén tu rol de cliente.",
    preguntas_quiz: [],
    system_prompt_chat: DEFAULT_SYSTEM_PROMPT,
  };
}

function misionFromExisting(a: Asignacion): MisionFormState {
  return {
    celular_evaluador: a.celular_evaluador,
    nombre_evaluador: a.nombre_evaluador ?? "",
    local_asignado: a.local_asignado,
    campana: a.campana ?? "",
    fecha_mision: a.fecha_mision ?? "",
    video_url: a.video_url,
    categoria: a.categoria ?? "",
    pasos_evaluacion: asStringArray(a.pasos_evaluacion).length
      ? asStringArray(a.pasos_evaluacion)
      : [""],
    alerta_identidad: a.alerta_identidad,
    preguntas_quiz: asQuizArray(a.preguntas_quiz),
    system_prompt_chat: a.system_prompt_chat,
  };
}

function MisionForm({
  password,
  initial,
  onCancel,
  onSaved,
}: {
  password: string;
  initial: Asignacion | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const save = useServerFn(saveMision);
  const generate = useServerFn(generateQuiz);
  const [state, setState] = useState<MisionFormState>(
    initial ? misionFromExisting(initial) : emptyMision(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const upd = <K extends keyof MisionFormState>(key: K, value: MisionFormState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const handleGenerateQuiz = async () => {
    const pasos = state.pasos_evaluacion.filter((p) => p.trim());
    if (!state.local_asignado.trim() || pasos.length === 0) {
      setGenerateError(
        "Completa el local asignado y al menos un paso de la visita antes de generar el quiz.",
      );
      return;
    }
    if (
      state.preguntas_quiz.length > 0 &&
      !confirm("Esto reemplazará las preguntas actuales del quiz. ¿Continuar?")
    ) {
      return;
    }
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await generate({
        data: {
          password,
          contexto: {
            local_asignado: state.local_asignado,
            categoria: state.categoria,
            campana: state.campana,
            pasos_evaluacion: pasos,
            alerta_identidad: state.alerta_identidad,
          },
        },
      });
      upd("preguntas_quiz", res.preguntas_quiz);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "No se pudo generar el quiz.");
    } finally {
      setGenerating(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.celular_evaluador.trim() || !state.local_asignado.trim()) {
      setError("El celular y el local asignado son obligatorios.");
      return;
    }
    const preguntasValidas = state.preguntas_quiz.filter((q) => q.pregunta.trim());
    if (preguntasValidas.length !== QUIZ_LENGTH) {
      setError(
        `El quiz debe tener exactamente ${QUIZ_LENGTH} preguntas (tiene ${preguntasValidas.length}). Usa "Generar quiz con IA" o ajusta las preguntas manualmente.`,
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      await save({
        data: {
          password,
          mision: { id: initial?.id, ...state },
        },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la misión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-card">
      <h2 style={{ marginBottom: 20 }}>{initial ? "Editar misión" : "Nueva misión"}</h2>
      <form onSubmit={submit}>
        <div className="form-row">
          <div className="field">
            <label>Celular del evaluador</label>
            <input
              value={state.celular_evaluador}
              onChange={(e) => upd("celular_evaluador", e.target.value.replace(/\D/g, ""))}
              placeholder="987654321"
              maxLength={9}
              required
            />
          </div>
          <div className="field">
            <label>Nombre del evaluador</label>
            <input
              value={state.nombre_evaluador}
              onChange={(e) => upd("nombre_evaluador", e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Local asignado</label>
          <input
            value={state.local_asignado}
            onChange={(e) => upd("local_asignado", e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label>Campaña</label>
            <input value={state.campana} onChange={(e) => upd("campana", e.target.value)} />
          </div>
          <div className="field">
            <label>Fecha de misión</label>
            <input
              type="date"
              value={state.fecha_mision}
              onChange={(e) => upd("fecha_mision", e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Categoría</label>
            <input value={state.categoria} onChange={(e) => upd("categoria", e.target.value)} />
          </div>
          <div className="field">
            <label>Video de YouTube (no listado)</label>
            <input
              value={state.video_url}
              onChange={(e) => upd("video_url", e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
        </div>

        <DynamicList
          label="Pasos de la visita (checklist)"
          values={state.pasos_evaluacion}
          onChange={(v) => upd("pasos_evaluacion", v)}
        />

        <div className="field">
          <label>Alerta de identidad</label>
          <textarea
            value={state.alerta_identidad}
            onChange={(e) => upd("alerta_identidad", e.target.value)}
          />
        </div>

        <div className="field">
          <div className="quiz-generate-row">
            <label style={{ marginBottom: 0 }}>Quiz</label>
            <button
              type="button"
              className="btn-generate"
              onClick={handleGenerateQuiz}
              disabled={generating}
            >
              {generating
                ? "Generando…"
                : state.preguntas_quiz.length > 0
                  ? "↻ Regenerar quiz con IA"
                  : "✨ Generar quiz con IA"}
            </button>
          </div>
          <p className="quiz-generate-hint">
            Claude redacta las 5 preguntas a partir del local, la categoría y los pasos de la visita
            que ya escribiste arriba. Puedes editar el resultado antes de guardar.
          </p>
          {generateError && <p className="error-msg">{generateError}</p>}
        </div>

        <QuizEditor items={state.preguntas_quiz} onChange={(v) => upd("preguntas_quiz", v)} />

        <div className="field">
          <label>System prompt del chat de IA</label>
          <textarea
            value={state.system_prompt_chat}
            onChange={(e) => upd("system_prompt_chat", e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary-sm" disabled={saving}>
            {saving ? "Guardando…" : "Guardar misión"}
          </button>
          <button type="button" className="btn-secondary-sm" onClick={onCancel}>
            Cancelar
          </button>
          {error && <span className="error-msg">{error}</span>}
        </div>
      </form>
    </div>
  );
}

function DynamicList({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const setAt = (i: number, val: string) => {
    const next = [...values];
    next[i] = val;
    onChange(next);
  };
  const removeAt = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const add = () => onChange([...values, ""]);

  return (
    <div className="field">
      <label>{label}</label>
      {values.map((v, i) => (
        <div className="dynamic-item" key={i}>
          <span className="mono" style={{ color: "var(--ink-faint)", paddingTop: 10 }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <input value={v} onChange={(e) => setAt(i, e.target.value)} />
          <button type="button" className="btn-icon" onClick={() => removeAt(i)}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn-add" onClick={add}>
        + Agregar paso
      </button>
    </div>
  );
}

function QuizEditor({
  items,
  onChange,
}: {
  items: QuizPregunta[];
  onChange: (v: QuizPregunta[]) => void;
}) {
  const add = () => {
    if (items.length >= QUIZ_LENGTH) return;
    onChange([...items, { pregunta: "", opciones: ["", "", ""], correcta: 0 }]);
  };
  const setAt = (i: number, q: QuizPregunta) => {
    const next = [...items];
    next[i] = q;
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="field">
      <label>
        Quiz (exactamente {QUIZ_LENGTH} preguntas — {items.length}/{QUIZ_LENGTH})
      </label>
      {items.map((q, i) => (
        <div className="quiz-question-block" key={i}>
          <div className="qhead">
            <span>Pregunta {i + 1}</span>
            <button type="button" className="action-link danger" onClick={() => remove(i)}>
              Eliminar
            </button>
          </div>
          <input
            value={q.pregunta}
            onChange={(e) => setAt(i, { ...q, pregunta: e.target.value })}
            placeholder="Enunciado de la pregunta"
            style={{ marginBottom: 10 }}
          />
          {q.opciones.map((op, oi) => (
            <div className="quiz-option-row" key={oi}>
              <input
                type="radio"
                name={`correcta-${i}`}
                checked={q.correcta === oi}
                onChange={() => setAt(i, { ...q, correcta: oi })}
              />
              <input
                type="text"
                value={op}
                onChange={(e) => {
                  const opciones = [...q.opciones];
                  opciones[oi] = e.target.value;
                  setAt(i, { ...q, opciones });
                }}
                placeholder={`Opción ${String.fromCharCode(65 + oi)}`}
              />
            </div>
          ))}
        </div>
      ))}
      <button
        type="button"
        className="btn-add"
        onClick={add}
        disabled={items.length >= QUIZ_LENGTH}
      >
        + Agregar pregunta
      </button>
    </div>
  );
}
