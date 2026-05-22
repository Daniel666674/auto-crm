"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

interface Blast {
  id: string;
  name: string;
  subject: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  lastError: string | null;
  createdAt: number | string;
  sentAt: number | string | null;
  opens: number;
  uniqueOpens: number;
  clicks: number;
}

const TEMPS: { value: string; label: string }[] = [
  { value: "hot", label: "Caliente" },
  { value: "warm", label: "Tibio" },
  { value: "cold", label: "Frío" },
];

const card: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20,
};
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6,
};
const input: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

function statusColor(s: string): { bg: string; color: string } {
  switch (s) {
    case "sent": return { bg: "rgba(34,197,94,0.12)", color: "#22c55e" };
    case "sending": return { bg: "rgba(209,156,21,0.12)", color: "#D19C15" };
    case "failed": return { bg: "rgba(239,68,68,0.12)", color: "#ef4444" };
    default: return { bg: "rgba(113,128,150,0.12)", color: "#718096" };
  }
}

export default function CampaignsPage() {
  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [temps, setTemps] = useState<string[]>([]);
  const [scoreMin, setScoreMin] = useState<string>("");
  const [preview, setPreview] = useState<{ matched: number; eligible: number; max: number } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  const audience = useCallback(() => {
    const rules: Record<string, unknown> = {};
    if (temps.length) rules.temperature = temps;
    if (scoreMin.trim() !== "") rules.scoreMin = Number(scoreMin);
    return rules;
  }, [temps, scoreMin]);

  const load = useCallback(() => {
    fetch("/api/campaigns/blast")
      .then(r => r.ok ? r.json() : [])
      .then((d: Blast[]) => setBlasts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll while any blast is still sending.
  useEffect(() => {
    if (!blasts.some(b => b.status === "sending")) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [blasts, load]);

  const toggleTemp = (v: string) =>
    setTemps(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const runPreview = async () => {
    setPreviewing(true);
    try {
      const res = await fetch("/api/campaigns/blast", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview: true, audience: audience() }),
      });
      const d = await res.json();
      setPreview({ matched: d.matched, eligible: d.eligible, max: d.max });
    } catch { toast.error("No se pudo calcular la audiencia"); }
    finally { setPreviewing(false); }
  };

  const send = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast.error("Completa nombre, asunto y mensaje");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/campaigns/blast", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, body, audience: audience() }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || "Error al enviar"); return; }
      toast.success(`Campaña iniciada · ${d.recipients} destinatarios`);
      setName(""); setSubject(""); setBody(""); setTemps([]); setScoreMin(""); setPreview(null);
      load();
    } catch { toast.error("Error de red"); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-6" style={{ maxWidth: 980, margin: "0 auto" }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campañas Email</h1>
        <p className="text-muted-foreground">Envíos masivos cortos e impactantes vía BlackScale · seguimiento de aperturas y clics</p>
      </div>

      <div style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={label}>Nombre interno</label>
            <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Reactivación Q2" />
          </div>
          <div>
            <label style={label}>Asunto</label>
            <input style={input} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Asunto del email" />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={label}>Mensaje</label>
          <textarea style={{ ...input, height: 180, resize: "vertical", lineHeight: 1.6 }} value={body} onChange={e => setBody(e.target.value)}
            placeholder={"Hola {{firstName}},\n\n…\n\n— {{senderName}}"} />
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>
            Variables: <code>{"{{firstName}}"}</code> <code>{"{{name}}"}</code> <code>{"{{company}}"}</code> <code>{"{{senderName}}"}</code>
          </p>
        </div>

        <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, alignItems: "end" }}>
          <div>
            <label style={label}>Audiencia · temperatura</label>
            <div style={{ display: "flex", gap: 6 }}>
              {TEMPS.map(t => (
                <button key={t.value} type="button" onClick={() => toggleTemp(t.value)}
                  style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
                    border: `1px solid ${temps.includes(t.value) ? "var(--primary)" : "var(--border)"}`,
                    background: temps.includes(t.value) ? "rgba(209,156,21,0.12)" : "transparent",
                    color: temps.includes(t.value) ? "var(--primary)" : "var(--muted-foreground)" }}>
                  {t.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>Sin selección = todas las temperaturas. Se excluyen exclusiones y contactos devueltos a marketing.</p>
          </div>
          <div>
            <label style={label}>Score mínimo</label>
            <input style={input} type="number" min={0} value={scoreMin} onChange={e => setScoreMin(e.target.value)} placeholder="0" />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
          <button onClick={runPreview} disabled={previewing}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: previewing ? "wait" : "pointer" }}>
            {previewing ? "Calculando…" : "Previsualizar audiencia"}
          </button>
          {preview && (
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              <strong style={{ color: "var(--foreground)" }}>{preview.eligible}</strong> destinatarios elegibles
              {preview.matched !== preview.eligible && <> (de {preview.matched} en audiencia)</>}
              {preview.eligible > preview.max && <span style={{ color: "#ef4444" }}> · supera el máximo de {preview.max}</span>}
            </span>
          )}
          <button onClick={send} disabled={sending}
            style={{ marginLeft: "auto", padding: "9px 22px", borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 700, cursor: sending ? "wait" : "pointer" }}>
            {sending ? "Enviando…" : "Enviar campaña"}
          </button>
        </div>
      </div>

      {/* History */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Historial</h2>
        {blasts.length === 0 ? (
          <div style={{ ...card, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Aún no hay campañas enviadas.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {blasts.map(b => {
              const sc = statusColor(b.status);
              return (
                <div key={b.id} style={{ ...card, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.subject}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color, textTransform: "uppercase", flexShrink: 0 }}>{b.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 12, color: "var(--muted-foreground)", flexWrap: "wrap" }}>
                    <span>Enviados <strong style={{ color: "var(--foreground)" }}>{b.sentCount}</strong>/{b.totalRecipients}</span>
                    <span>Aperturas <strong style={{ color: "var(--foreground)" }}>{b.uniqueOpens}</strong>{b.opens > b.uniqueOpens ? ` (${b.opens})` : ""}</span>
                    <span>Clics <strong style={{ color: "var(--foreground)" }}>{b.clicks}</strong></span>
                    {b.skippedCount > 0 && <span>Omitidos {b.skippedCount}</span>}
                    {b.failedCount > 0 && <span style={{ color: "#ef4444" }}>Fallidos {b.failedCount}</span>}
                  </div>
                  {b.lastError && <div style={{ fontSize: 11, color: "#D19C15", marginTop: 8 }}>⚠ {b.lastError}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
