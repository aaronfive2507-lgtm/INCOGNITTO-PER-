import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from "recharts";
import "./landing.css";
import logo from "@/assets/incognitto-logo.png";
import { sendContactEmail } from "@/lib/contact.server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "INCOGNITTO — Inteligencia de experiencia del cliente" },
      {
        name: "description",
        content:
          "INCOGNITTO evalúa, mide y audita la experiencia real de tus locales a través de mystery shopping, benchmarking y auditoría operativa.",
      },
    ],
  }),
  component: LandingPage,
});

const SERVICIOS = [
  {
    id: "01",
    title: "Mystery shopping",
    desc: "Evaluadores encubiertos miden la experiencia real de tus clientes en punto de venta, taller o canal digital.",
  },
  {
    id: "02",
    title: "Benchmark de competencia",
    desc: "Comparamos tu operación frente a la competencia directa bajo los mismos parámetros de evaluación.",
  },
  {
    id: "03",
    title: "Auditoría de operaciones",
    desc: "Revisión de procesos de back office: cumplimiento, tiempos y procedimientos internos.",
  },
  {
    id: "04",
    title: "Capacitaciones",
    desc: "Formación de equipos comerciales y de servicio con base en hallazgos reales de campo.",
  },
  {
    id: "05",
    title: "Estudios de mercado",
    desc: "Investigación cuantitativa y cualitativa para decisiones comerciales informadas.",
  },
  {
    id: "06",
    title: "Encuestas",
    desc: "Levantamiento de percepción de cliente a escala, con reporte estadístico claro.",
  },
];

const SECTOR_DATA = [
  { name: "Automotriz", value: 34, color: "#3E9EFF" },
  { name: "Gastronomía", value: 22, color: "#2B6FBA" },
  { name: "Financiero", value: 16, color: "#1D6FE0" },
  { name: "Retail", value: 14, color: "#5BB0FF" },
  { name: "Salud", value: 8, color: "#274A6B" },
  { name: "Servicios", value: 6, color: "#3a3f4a" },
];

const CASOS = [
  {
    tag: "RED AUTOMOTRIZ",
    title: "KIA Import Perú",
    items: [
      { label: "Locales evaluados", value: "14 concesionarios" },
      { label: "Hallazgo principal", value: "brecha en proceso de venta" },
      { label: "Resultado", value: "plan de mejora por dealer" },
    ],
  },
  {
    tag: "GASTRONOMÍA",
    title: "La Baguette",
    items: [
      { label: "Rondas de evaluación", value: "múltiples por año" },
      { label: "Enfoque", value: "atención y tiempos de servicio" },
      { label: "Resultado", value: "seguimiento continuo de mejora" },
    ],
  },
  {
    tag: "SERVICIOS FINANCIEROS",
    title: "Core Capital SAFI",
    items: [
      { label: "Enfoque", value: "asesoría al cliente" },
      { label: "Método", value: "mystery shopping especializado" },
      { label: "Resultado", value: "informe de cumplimiento comercial" },
    ],
  },
];

const CLIENTES = [
  "KIA Import Perú",
  "La Baguette",
  "Casa Andina",
  "Core Capital SAFI",
  "El Heladero",
  "Pristine SAC",
  "Soldexa",
];

function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const [spot, setSpot] = useState({ x: 50, y: 40 });

  const onHeroMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSpot({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div className="incognitto-landing">
      <nav>
        <div className="wrap">
          <img className="logo-img" src={logo} alt="INCOGNITTO" />
          <div className="nav-links">
            <a href="#servicios">Servicios</a>
            <a href="#proceso">Metodología</a>
            <a href="#casos">Casos</a>
            <a href="#contacto">Contacto</a>
            <Link to="/capacitacion">Portal evaluador</Link>
          </div>
          <a href="#contacto" className="nav-cta">
            Solicitar evaluación
          </a>
        </div>
      </nav>

      <section
        className="hero"
        id="hero"
        ref={heroRef}
        onMouseMove={onHeroMove}
        style={{ ["--mx" as string]: `${spot.x}%`, ["--my" as string]: `${spot.y}%` }}
      >
        <div className="spotlight" />
        <div className="hero-grain" />
        <div className="wrap hero-content">
          <div className="eyebrow">Inteligencia de experiencia del cliente</div>
          <h1>
            Vemos tu operación <em>como la ve</em> tu cliente — sin que nadie lo note.
          </h1>
          <p className="hero-sub">
            INCOGNITTO evalúa, mide y audita la experiencia real de tus locales a través de mystery
            shopping, benchmarking y auditoría operativa. Datos verificados, sin filtros internos.
          </p>
          <div className="hero-actions">
            <a href="#contacto" className="btn-primary">
              Solicitar una evaluación
            </a>
            <a href="#servicios" className="btn-ghost">
              Ver servicios
            </a>
          </div>
          <div className="hero-stats">
            <div>
              <div className="num mono">14+</div>
              <div className="label">Locales evaluados en una sola red</div>
            </div>
            <div>
              <div className="num mono">6</div>
              <div className="label">Líneas de servicio</div>
            </div>
            <div>
              <div className="num mono">100%</div>
              <div className="label">Evaluadores anónimos verificados</div>
            </div>
            <div>
              <div className="num mono">Perú</div>
              <div className="label">Cobertura nacional</div>
            </div>
          </div>
        </div>
      </section>

      <section className="impact" id="impacto">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Impacto</div>
            <h2>La operación, medida con evidencia</h2>
            <p>
              Números acumulados de campañas activas de mystery shopping, auditoría y estudios de
              mercado a nivel nacional.
            </p>
          </div>
        </div>
        <div className="impact-grid">
          <div className="impact-card">
            <div className="num mono">500+</div>
            <div className="label">Evaluaciones realizadas al mes</div>
          </div>
          <div className="impact-card">
            <div className="num mono">6</div>
            <div className="label">
              Sectores atendidos: automotriz, gastronomía, retail, financiero, salud, servicios
            </div>
          </div>
          <div className="impact-card">
            <div className="num mono">14+</div>
            <div className="label">Locales evaluados en una sola red de campaña</div>
          </div>
          <div className="impact-card">
            <div className="num mono">100%</div>
            <div className="label">Evaluadores anónimos verificados y capacitados</div>
          </div>
        </div>
      </section>

      <section className="services" id="servicios">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Lo que hacemos</div>
            <h2>Seis formas de ver lo que tu equipo no ve</h2>
            <p>
              Cada servicio funciona como un expediente independiente: metodología propia,
              evaluadores capacitados y un informe accionable al cierre.
            </p>
          </div>
        </div>
        <div className="service-grid">
          {SERVICIOS.map((s) => (
            <div className="service-card" key={s.id}>
              <div className="service-id mono">CASO / {s.id}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="process" id="proceso">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Metodología</div>
            <h2>De la observación al informe</h2>
          </div>
          <div className="process-steps">
            <div className="process-step">
              <div className="process-num">01</div>
              <h3>Diseño del protocolo</h3>
              <p>
                Definimos junto a tu equipo los parámetros exactos a evaluar según el objetivo de la
                campaña.
              </p>
            </div>
            <div className="process-step">
              <div className="process-num">02</div>
              <h3>Observación encubierta</h3>
              <p>
                Evaluadores capacitados visitan tus puntos de contacto sin ser identificados como
                tales.
              </p>
            </div>
            <div className="process-step">
              <div className="process-num">03</div>
              <h3>Informe accionable</h3>
              <p>
                Entregamos hallazgos con datos verificados y recomendaciones concretas de mejora.
              </p>
            </div>
          </div>

          <div className="method-numbers">
            <div className="method-card">
              <div className="score mono">0</div>
              <div className="tag">No cumple</div>
              <p>El parámetro evaluado no se cumplió en absoluto durante la visita.</p>
            </div>
            <div className="method-card">
              <div className="score mono">50</div>
              <div className="tag">Cumple parcial</div>
              <p>El parámetro se cumplió de forma incompleta o inconsistente.</p>
            </div>
            <div className="method-card">
              <div className="score mono">100</div>
              <div className="tag">Cumple total</div>
              <p>El parámetro se ejecutó de acuerdo al estándar esperado.</p>
            </div>
          </div>
          <p className="method-explain">
            Cada <strong>momento de verdad</strong> agrupa varios parámetros con esta escala. El
            puntaje final no es un promedio plano: es el{" "}
            <strong>promedio de los promedios por momento</strong>, para que ningún parámetro
            aislado distorsione el resultado real de la visita.
          </p>

          <div className="chart-block">
            <div className="chart-text">
              <h3>Dónde miramos con más frecuencia</h3>
              <p>
                Distribución de campañas activas por sector durante los últimos meses. El sector
                automotriz concentra la mayor parte de la operación, seguido de gastronomía y
                servicios financieros.
              </p>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SECTOR_DATA}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    stroke="#07080A"
                    strokeWidth={2}
                  >
                    {SECTOR_DATA.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value) => (
                      <span style={{ color: "#8D97A8", fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <section className="cases" id="casos">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Casos de éxito</div>
            <h2>Hallazgos que se convirtieron en acción</h2>
            <p>
              Un vistazo a cómo la evaluación se traduce en decisiones concretas dentro de la
              operación del cliente.
            </p>
          </div>
          <div className="case-grid">
            {CASOS.map((c) => (
              <div className="case-card" key={c.title}>
                <div className="case-tag mono">{c.tag}</div>
                <h3>{c.title}</h3>
                <ul>
                  {c.items.map((it) => (
                    <li key={it.label}>
                      {it.label}: <strong>{it.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonials" id="testimonios">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Lo que dicen de nosotros</div>
            <h2>Testimonios</h2>
          </div>
          <div className="testi-grid">
            <div className="testi-card">
              <p className="quote">
                "Espacio reservado para una cita real de un cliente sobre el impacto de la
                evaluación en su operación."
              </p>
              <div className="who">— Nombre, cargo, empresa</div>
            </div>
            <div className="testi-card">
              <p className="quote">
                "Espacio reservado para una segunda cita real, idealmente enfocada en resultados
                medibles."
              </p>
              <div className="who">— Nombre, cargo, empresa</div>
            </div>
          </div>
          <p className="testi-placeholder">
            Estos son textos de ejemplo — reemplázalos con citas reales de clientes antes de
            publicar.
          </p>
        </div>
      </section>

      <section id="clientes">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Confían en INCOGNITTO</div>
            <h2>Marcas que ya evaluamos</h2>
          </div>
          <div className="clients-list">
            {CLIENTES.map((c) => (
              <div className="client-tag" key={c}>
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      <ContactSection />

      <footer>
        <div className="wrap">
          <img className="footer-logo" src={logo} alt="INCOGNITTO" />
          <p className="mono">Lima, Perú</p>
        </div>
      </footer>
    </div>
  );
}

function ContactSection() {
  const send = useServerFn(sendContactEmail);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("sending");
    setErrorMsg("");
    try {
      await send({
        data: {
          nombre: String(form.get("nombre") ?? ""),
          empresa: String(form.get("empresa") ?? ""),
          correo: String(form.get("correo") ?? ""),
          mensaje: String(form.get("mensaje") ?? ""),
        },
      });
      setStatus("ok");
      e.currentTarget.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "No se pudo enviar.");
    }
  };

  return (
    <section className="contact" id="contacto">
      <div className="wrap contact-grid">
        <div className="contact-info">
          <div className="eyebrow">Hablemos</div>
          <h2>Empieza tu primera evaluación</h2>
          <p>Cuéntanos qué necesitas medir y armamos un protocolo a la medida de tu operación.</p>
          <div className="contact-detail">
            <span className="dot" /> hola@incognitto.com
          </div>
          <div className="contact-detail">
            <span className="dot" /> Lima, Perú
          </div>
          <div className="contact-detail">
            <span className="dot" /> incognitto.com
          </div>
        </div>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Nombre</label>
            <input type="text" name="nombre" placeholder="Tu nombre completo" required />
          </div>
          <div className="field">
            <label>Empresa</label>
            <input type="text" name="empresa" placeholder="Nombre de tu empresa" required />
          </div>
          <div className="field">
            <label>Correo</label>
            <input type="email" name="correo" placeholder="nombre@empresa.com" required />
          </div>
          <div className="field">
            <label>Cuéntanos qué necesitas evaluar</label>
            <textarea
              name="mensaje"
              placeholder="Ej: mystery shopping para 8 locales de retail en Lima"
            />
          </div>
          <button type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Enviando…" : "Enviar solicitud"}
          </button>
          {status === "ok" && (
            <p className="form-status ok">Solicitud enviada. Te contactaremos pronto.</p>
          )}
          {status === "error" && <p className="form-status error">{errorMsg}</p>}
        </form>
      </div>
    </section>
  );
}
