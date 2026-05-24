"use client";

import React, { useEffect, useState } from "react";
import { Copy, CheckCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  role: string;
}

export function DaptaSettings({ role }: Props) {
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"url" | "secret" | null>(null);
  const [unmatched, setUnmatched] = useState<number>(0);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/dapta`
    : "/api/webhooks/dapta";

  useEffect(() => {
    fetch("/api/webhooks/dapta")
      .then(r => r.json())
      .then(d => {
        setSecret(d.secret ?? null);
        setUnmatched(d.unmatched ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copy = (text: string, key: "url" | "secret") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const rotateSecret = async () => {
    if (!confirm("¿Rotar el secreto? Necesitarás actualizar el webhook en Dapta Flow Studio.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/webhooks/dapta/rotate", { method: "POST" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setSecret(d.secret);
      toast.success("Secreto rotado — actualiza Dapta Flow Studio");
    } catch {
      toast.error("No se pudo rotar el secreto");
    } finally {
      setLoading(false);
    }
  };

  if (!["superadmin", "marketing"].includes(role)) return null;

  const row: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 12px", borderRadius: 8,
    background: "var(--background, #0a0a0a)",
    border: "1px solid var(--border, #1e1e1e)",
    fontFamily: "monospace", fontSize: 12,
    color: "var(--foreground, #e2e8f0)",
    overflow: "hidden",
  };
  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--muted-foreground, #718096)",
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6,
  };
  const copyBtn = (key: "url" | "secret"): React.CSSProperties => ({
    flexShrink: 0, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
    fontSize: 11, fontWeight: 600, border: "1px solid var(--border, #1e1e1e)",
    background: copied === key ? "rgba(34,197,94,0.12)" : "transparent",
    color: copied === key ? "#22c55e" : "var(--muted-foreground, #718096)",
    display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
  });

  return (
    <div style={{
      borderRadius: 12, border: "1px solid var(--border, #1e1e1e)",
      overflow: "hidden", background: "var(--card, #111111)",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px", borderBottom: "1px solid var(--border, #1e1e1e)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, color: "#a78bfa",
        }}>D</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground, #e2e8f0)" }}>
            Dapta AI — Notetaker de Reuniones
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground, #718096)", marginTop: 1 }}>
            Graba, transcribe y extrae action items de cada reunión en Google Meet · Sincroniza automáticamente con el CRM
          </div>
        </div>
        <a
          href="https://dapta.ai"
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted-foreground, #718096)", textDecoration: "none" }}
        >
          dapta.ai <ExternalLink size={11} />
        </a>
      </div>

      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Setup steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { n: 1, text: "Crea una cuenta en dapta.ai con julian.vallejo@blackscale.consulting" },
            { n: 2, text: "Conecta Google Calendar en Dapta SIG — Dapta se unirá automáticamente a cada reunión con Meet" },
            { n: 3, text: "En Dapta Flow Studio, crea un flow con trigger \"meeting_ended\" y un nodo HTTP Request al webhook URL de abajo" },
            { n: 4, text: "Agrega el header X-Dapta-Secret con el secreto de abajo en el nodo HTTP Request" },
          ].map(({ n, text }) => (
            <div key={n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#a78bfa",
              }}>{n}</div>
              <div style={{ fontSize: 12, color: "var(--foreground, #e2e8f0)", lineHeight: 1.5 }}>{text}</div>
            </div>
          ))}
        </div>

        {/* Webhook URL */}
        <div>
          <div style={label}>Webhook URL</div>
          <div style={row}>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {webhookUrl}
            </span>
            <button style={copyBtn("url")} onClick={() => copy(webhookUrl, "url")}>
              {copied === "url" ? <CheckCheck size={11} /> : <Copy size={11} />}
              {copied === "url" ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>

        {/* Shared secret */}
        <div>
          <div style={label}>Secreto (X-Dapta-Secret header)</div>
          <div style={row}>
            {loading ? (
              <span style={{ flex: 1, color: "var(--muted-foreground, #718096)" }}>Cargando…</span>
            ) : (
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#a78bfa" }}>
                {secret ?? "—"}
              </span>
            )}
            <button
              style={copyBtn("secret")}
              onClick={() => secret && copy(secret, "secret")}
              disabled={!secret}
            >
              {copied === "secret" ? <CheckCheck size={11} /> : <Copy size={11} />}
              {copied === "secret" ? "Copiado" : "Copiar"}
            </button>
            {role === "superadmin" && (
              <button
                style={{ ...copyBtn("secret"), color: "#f59e0b", borderColor: "#f59e0b44" }}
                onClick={rotateSecret}
                disabled={loading}
              >
                Rotar
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground, #718096)", marginTop: 4 }}>
            Pégalo en Dapta Flow Studio como header de la petición HTTP al webhook.
          </div>
        </div>

        {/* Payload reference */}
        <details style={{ cursor: "pointer" }}>
          <summary style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground, #718096)", listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <span>▶</span> Ver formato del payload que debe enviar Dapta
          </summary>
          <pre style={{
            marginTop: 10, padding: 14, borderRadius: 8, fontSize: 11, lineHeight: 1.6,
            background: "var(--background, #0a0a0a)", border: "1px solid var(--border, #1e1e1e)",
            color: "#a78bfa", overflowX: "auto", whiteSpace: "pre-wrap",
          }}>{`{
  "meetingId": "abc123",           // único por reunión (idempotente)
  "meetLink": "https://meet.google.com/xxx-yyy-zzz",
  "title": "Demo — Empresa XYZ",
  "startedAt": "2026-05-24T15:00:00Z",
  "endedAt": "2026-05-24T15:45:00Z",
  "durationMin": 45,
  "participants": ["contact@empresa.com", "julian.vallejo@blackscale.consulting"],
  "transcript": "...(texto completo)...",
  "summary": "Julian demostró la plataforma. El cliente mostró interés.",
  "sentiment": "positive",         // "positive" | "neutral" | "negative"
  "actionItems": ["Enviar propuesta", "Agendar seguimiento con CFO"],
  "topics": ["pricing", "SEO"],
  "nextSteps": "Enviar propuesta antes del viernes"
}`}</pre>
        </details>

        {/* What happens automatically */}
        <div style={{
          padding: 14, borderRadius: 10,
          background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.18)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>
            Qué pasa automáticamente cuando Dapta envía el webhook
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              "Se crea una actividad de tipo Reunión con el resumen en el timeline del contacto",
              "La transcripción completa queda guardada en esa actividad",
              "Se crean follow-ups automáticos por cada action item",
              "Si el sentimiento es positivo → temperatura → Caliente + promoción a SQL",
              "Si es neutral/negativo → temperatura → Tibio (si estaba frío)",
              "Se dispara el trigger meeting_booked para tus automatizaciones",
              "Si fue positivo, también dispara became_sql para el workflow de handoff",
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--foreground, #e2e8f0)" }}>
                <span style={{ color: "#a78bfa", flexShrink: 0 }}>✓</span>
                {t}
              </div>
            ))}
          </div>
        </div>

        {unmatched > 0 && (
          <div style={{
            padding: 12, borderRadius: 8,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
            fontSize: 12, color: "#f59e0b",
          }}>
            ⚠ Hay {unmatched} reunión{unmatched !== 1 ? "es" : ""} recibida{unmatched !== 1 ? "s" : ""} de Dapta sin contacto coincidente. Revisa que los emails de los participantes estén registrados en el CRM.
          </div>
        )}
      </div>
    </div>
  );
}
