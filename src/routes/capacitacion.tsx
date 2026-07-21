import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import "./capacitacion.css";
import logo from "@/assets/incognitto-logo.png";
import { buscarMisionPorCelular, registrarResultadoQuizFn } from "@/lib/capacitacion.server";
import { buildSystemPrompt, callClaude, toEmbedUrl, type AsignacionMision } from "@/lib/incognitto";

export const Route = createFileRoute("/capacitacion")({
  head: () => ({
    meta: [
      { title: "INCOGNITTO — Capacitación de misión" },
      {
        name: "description",
        content: "Portal de capacitación para evaluadores de INCOGNITTO.",
      },
    ],
  }),
  component: CapacitacionPage,
  ssr: false,
});

type Step = "phone" | "loading" | "multi" | "mission" | "quiz" | "chat";

function CapacitacionPage() {
  const buscarMision = useServerFn(buscarMisionPorCelular);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [misiones, setMisiones] = useState<AsignacionMision[]>([]);
  const [activa, setActiva] = useState<AsignacionMision | null>(null);
  const [retryBanner, setRetryBanner] = useState(false);

  const buscar = async () => {
    const clean = phone.trim();
    if (clean.length < 9) {
      setError("Ingresa un número de celular válido (9 dígitos).");
      return;
    }
    setError("");
    setStep("loading");
    try {
      const res = await buscarMision({ data: { celular: clean } });
      const result = res.asignaciones as unknown as AsignacionMision[];
      if (result.length === 0) {
        setStep("phone");
        setError(
          "No encontramos una misión activa para este número. Verifica o contacta a tu coordinador.",
        );
      } else if (result.length === 1) {
        setMisiones(result);
        setActiva(result[0]);
        setStep("mission");
      } else {
        setMisiones(result);
        setStep("multi");
      }
    } catch (e) {
      setStep("phone");
      setError(e instanceof Error ? e.message : "Error al buscar tu misión.");
    }
  };

  const reset = () => {
    setPhone("");
    setError("");
    setMisiones([]);
    setActiva(null);
    setRetryBanner(false);
    setStep("phone");
  };

  return (
    <div className="incognitto-cap">
      <div className="card">
        <div className="logo-row">
          <img src={logo} alt="INCOGNITTO" />
        </div>

        {step === "phone" && (
          <PhoneStep phone={phone} setPhone={setPhone} error={error} onContinue={buscar} />
        )}

        {step === "loading" && (
          <div>
            <div className="spinner" />
            <p className="loading-text">Buscando tu misión asignada…</p>
          </div>
        )}

        {step === "multi" && (
          <MultiStep
            misiones={misiones}
            onSelect={(m) => {
              setActiva(m);
              setStep("mission");
            }}
          />
        )}

        {step === "mission" && activa && (
          <MissionStep
            asignacion={activa}
            retryBanner={retryBanner}
            onContinue={() => setStep("quiz")}
          />
        )}

        {step === "quiz" && activa && (
          <QuizStep
            asignacion={activa}
            onPass={() => setStep("chat")}
            onFail={() => {
              setRetryBanner(true);
              setStep("mission");
            }}
          />
        )}

        {step === "chat" && activa && <ChatStep asignacion={activa} onFinish={reset} />}
      </div>
    </div>
  );
}

// ---------------- Paso 1: celular ----------------

function PhoneStep({
  phone,
  setPhone,
  error,
  onContinue,
}: {
  phone: string;
  setPhone: (v: string) => void;
  error: string;
  onContinue: () => void;
}) {
  return (
    <div>
      <h1 className="serif">Tu capacitación de misión</h1>
      <p className="sub">
        Ingresa tu número de celular registrado para ver la evaluación que te corresponde.
      </p>
      <div className="field">
        <label>Número de celular</label>
        <div className="phone-input-row">
          <div className="phone-prefix mono">+51</div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && onContinue()}
            placeholder="987 654 321"
            maxLength={9}
          />
        </div>
      </div>
      <button className="primary" onClick={onContinue}>
        Continuar
      </button>
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

// ---------------- Paso 2: selección múltiple ----------------

function MultiStep({
  misiones,
  onSelect,
}: {
  misiones: AsignacionMision[];
  onSelect: (m: AsignacionMision) => void;
}) {
  return (
    <div>
      <h1 className="serif" style={{ fontSize: "19px" }}>
        Tienes {misiones.length} misiones activas
      </h1>
      <p className="sub">Elige la que quieres revisar ahora.</p>
      <div className="mission-list">
        {misiones.map((m) => (
          <button key={m.id} className="mission-item" onClick={() => onSelect(m)}>
            <div>
              <div className="m-local">{m.local_asignado}</div>
              <div className="m-date mono">
                {m.fecha_mision ?? "Fecha por confirmar"}
                {m.categoria ? ` · ${m.categoria}` : ""}
              </div>
            </div>
            <div className="arrow">→</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- Paso 3: briefing ----------------

function MissionStep({
  asignacion: a,
  retryBanner,
  onContinue,
}: {
  asignacion: AsignacionMision;
  retryBanner: boolean;
  onContinue: () => void;
}) {
  const embed = toEmbedUrl(a.video_url);
  return (
    <div>
      <div className="mission-header">
        <div className="tag mono">Misión de hoy</div>
        <h2 className="serif">{a.local_asignado}</h2>
      </div>

      {retryBanner && (
        <div className="retry-banner">
          No aprobaste el quiz. Vuelve a ver el video con atención — presta especial atención a los
          detalles que debes registrar y a la regla de nunca identificarte como evaluador.
        </div>
      )}

      <div className="video-frame">
        {embed ? (
          <iframe
            src={embed}
            title={`Briefing ${a.local_asignado}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="placeholder">Video de briefing no disponible</div>
        )}
      </div>

      <label className="checklist-label">Qué debes hacer durante la visita</label>
      <ul className="checklist">
        {a.pasos_evaluacion.map((paso, i) => (
          <li key={i}>
            <span className="num">{String(i + 1).padStart(2, "0")}</span>
            {paso}
          </li>
        ))}
      </ul>

      <p className="identity-alert">{a.alerta_identidad}</p>

      <button className="btn-continue" onClick={onContinue}>
        Continuar al quiz
      </button>
    </div>
  );
}

// ---------------- Paso 4: quiz ----------------

function QuizStep({
  asignacion: a,
  onPass,
  onFail,
}: {
  asignacion: AsignacionMision;
  onPass: () => void;
  onFail: () => void;
}) {
  const registrarQuiz = useServerFn(registrarResultadoQuizFn);
  const total = a.preguntas_quiz.length;
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const q = a.preguntas_quiz[idx];

  const choose = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    const correct = i === q.correcta;
    const nextScore = correct ? score + 1 : score;
    if (correct) setScore(nextScore);
    setTimeout(async () => {
      if (idx + 1 >= total) {
        setDone(true);
        setSaving(true);
        try {
          await registrarQuiz({ data: { asignacion_id: a.id, puntaje: nextScore } });
        } finally {
          setSaving(false);
        }
      } else {
        setIdx(idx + 1);
        setSelected(null);
      }
    }, 700);
  };

  if (total === 0) {
    return (
      <div>
        <p className="sub">Esta misión no tiene quiz configurado.</p>
        <button className="btn-continue" onClick={onPass}>
          Ir al chat →
        </button>
      </div>
    );
  }

  if (done) {
    const passed = score >= 3;
    return (
      <div>
        <div className="quiz-result">
          <div className="score-num mono">
            {score}/{total}
          </div>
          <div className="score-label">
            {saving
              ? "Guardando resultado…"
              : passed
                ? "Entendiste bien tu misión"
                : "Aún no estás listo para tu misión"}
          </div>
          {passed ? (
            <button className="btn-continue" style={{ marginTop: 0 }} onClick={onPass}>
              Ir al chat de dudas
            </button>
          ) : (
            <>
              <p className="fail-msg">
                Necesitas mínimo 3 de {total} respuestas correctas para continuar. Vuelve a ver el
                video con atención antes de intentar el quiz otra vez.
              </p>
              <button className="btn-continue" style={{ marginTop: 0 }} onClick={onFail}>
                Volver a ver el video
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="quiz-progress mono">
        PREGUNTA {idx + 1} / {total}
      </div>
      <div className="quiz-q">
        <h3>{q.pregunta}</h3>
        {q.opciones.map((op, i) => {
          let cls = "quiz-opt";
          if (selected !== null) {
            if (i === q.correcta) cls += " correct";
            else if (i === selected) cls += " wrong";
          }
          return (
            <button key={i} className={cls} disabled={selected !== null} onClick={() => choose(i)}>
              {op}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Paso 5: chat ----------------

type ChatMsg = { role: "user" | "assistant"; content: string };

function ChatStep({
  asignacion: a,
  onFinish,
}: {
  asignacion: AsignacionMision;
  onFinish: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: `Hola, soy el asistente de INCOGNITTO. Vi que ya completaste el quiz de ${a.local_asignado}. Si tienes alguna duda sobre qué evaluar o cómo actuar durante la visita, pregúntame.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const reply = await callClaude({
        system: buildSystemPrompt(a),
        messages: next,
        asignacionId: a.id,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de conexión.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Hubo un problema de conexión con el asistente: ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="chat-header">
        <div className="tag mono">Antes de tu misión</div>
        <h2 className="serif" style={{ fontSize: "19px" }}>
          ¿Tienes alguna duda?
        </h2>
      </div>
      <div className="chat-log" ref={logRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "user" : "bot"}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="msg bot typing">Escribiendo…</div>}
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Escribe tu pregunta…"
        />
        <button onClick={send} disabled={loading || !input.trim()}>
          Enviar
        </button>
      </div>
      <p className="chat-hint">Este chat responde solo dudas sobre tu misión asignada.</p>
      <button className="back-link" onClick={onFinish}>
        Finalizar y volver al inicio
      </button>
    </div>
  );
}
