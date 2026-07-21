import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import "./admin.css";
import { adminLogin, fetchAdminData } from "@/lib/admin.server";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "INCOGNITTO — Panel de cumplimiento" }],
  }),
  component: AdminPage,
  ssr: false,
});

type Asignacion = Tables<"asignaciones_mision">;
type ChatPregunta = Tables<"chat_preguntas">;

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

function Dashboard({ password, onLogout }: { password: string; onLogout: () => void }) {
  const getData = useServerFn(fetchAdminData);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [preguntas, setPreguntas] = useState<ChatPregunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getData({ data: { password } })
      .then((res) => {
        if (cancelled) return;
        setAsignaciones(res.asignaciones);
        setPreguntas(res.preguntas);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [password, getData]);

  const total = asignaciones.length;
  const aprobados = asignaciones.filter(
    (a) => a.estado === "capacitado" || a.estado === "completado",
  ).length;
  const pendientes = asignaciones.filter((a) => a.estado === "pendiente").length;
  const alertas = asignaciones.filter(
    (a) => a.estado === "reprobado" && (a.intentos_quiz ?? 0) >= 2,
  ).length;

  const topPreguntas = groupPreguntas(preguntas).slice(0, 8);

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
              <div className="section-title">
                <h2>Evaluadores</h2>
                <span className="filter mono">{total} registros</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Evaluador</th>
                    <th>Local asignado</th>
                    <th>Campaña</th>
                    <th>Intentos quiz</th>
                    <th>Estado</th>
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
                      </tr>
                    );
                  })}
                  {asignaciones.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-row">
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
