import { createFileRoute } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import "./admin.css";
import { supabase } from "@/integrations/supabase/client";
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
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="incognitto-admin">
      {session === undefined && <div className="loading-state">Cargando…</div>}
      {session === null && <LoginScreen />}
      {session && <Dashboard session={session} />}
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      console.error("[admin login] Supabase auth error:", error.status, error.message, error);
      if (error.message.toLowerCase().includes("invalid api key")) {
        setError(
          "Error de configuración: la conexión a Supabase no es válida (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). Revisa las variables de entorno del despliegue.",
        );
      } else if (error.message.toLowerCase().includes("invalid login credentials")) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError(error.message);
      }
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 className="serif">Acceso administración</h1>
        <p className="sub">Ingresa con tu cuenta de INCOGNITTO.</p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
          {error && <p className="error-msg">{error}</p>}
        </form>
      </div>
    </div>
  );
}

function Dashboard({ session }: { session: Session }) {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [preguntas, setPreguntas] = useState<ChatPregunta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: asigs }, { data: chats }] = await Promise.all([
        supabase
          .from("asignaciones_mision")
          .select("*")
          .order("fecha_mision", { ascending: false }),
        supabase.from("chat_preguntas").select("*").order("fecha", { ascending: false }).limit(500),
      ]);
      if (cancelled) return;
      setAsignaciones(asigs ?? []);
      setPreguntas(chats ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
            <span className="pill">{session.user.email}</span>
            <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="wrap">
        <h1 className="serif">Cumplimiento de capacitación</h1>
        <p className="page-sub">Estado en tiempo real de los evaluadores asignados.</p>

        {loading ? (
          <div className="loading-state">Cargando datos…</div>
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
