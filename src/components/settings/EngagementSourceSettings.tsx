"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Counts = { hot: number; warm: number; cold: number; dead: number; total: number };
type Source = "brevo" | "local";

const card: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20,
};

export function EngagementSourceSettings({ role }: { role: string }) {
  const isSuperadmin = role === "superadmin";
  const [source, setSource] = useState<Source | null>(null);
  const [parity, setParity] = useState<{ brevo: Counts; local: Counts } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/marketing/engagement-source").then(r => r.json()).then(d => setSource(d.source)).catch(() => {});
    fetch("/api/marketing/engagement-parity").then(r => r.json()).then(d => { if (!d.error) setParity(d); }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const setTo = async (v: Source) => {
    if (v === source || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/marketing/engagement-source", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: v }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || "No se pudo cambiar la fuente"); return; }
      setSource(v);
      toast.success(v === "local" ? "Engagement: BlackScale (eventos locales)" : "Engagement: Brevo");
    } catch { toast.error("Error de red"); }
    finally { setSaving(false); }
  };

  const Row = ({ label, c, accent }: { label: string; c: Counts; accent: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
      <span style={{ width: 90, color: "var(--muted-foreground)" }}>{label}</span>
      <span style={{ color: "#ef4444" }}>🔥 {c.hot}</span>
      <span style={{ color: "#f59e0b" }}>● {c.warm}</span>
      <span style={{ color: "var(--muted-foreground)" }}>● {c.cold}</span>
      <span style={{ color: "#6b7280" }}>✝ {c.dead}</span>
      <span style={{ marginLeft: "auto", fontWeight: 600, color: accent }}>{c.total}</span>
    </div>
  );

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Motor de engagement</span>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: source === "local" ? "rgba(34,197,94,0.12)" : "rgba(0,112,243,0.12)", color: source === "local" ? "#22c55e" : "#0070f3" }}>
          {source === "local" ? "BlackScale (local)" : source === "brevo" ? "Brevo" : "…"}
        </span>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>
        Fuente de las señales de engagement (aperturas, clics, temperatura). &quot;BlackScale&quot; las deriva del
        registro local de eventos de email; &quot;Brevo&quot; usa la sincronización actual. Compara la paridad antes de cambiar.
      </p>

      {isSuperadmin && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["brevo", "local"] as Source[]).map(v => (
            <button key={v} onClick={() => setTo(v)} disabled={saving}
              style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: saving ? "wait" : "pointer",
                border: `1px solid ${source === v ? "var(--primary)" : "var(--border)"}`,
                background: source === v ? "rgba(209,156,21,0.12)" : "transparent",
                color: source === v ? "var(--primary)" : "var(--muted-foreground)" }}>
              {v === "brevo" ? "Brevo" : "BlackScale (local)"}
            </button>
          ))}
        </div>
      )}

      {parity && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Paridad (misma audiencia)</div>
          <Row label="Brevo" c={parity.brevo} accent="#0070f3" />
          <Row label="BlackScale" c={parity.local} accent="#22c55e" />
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>
            La fuente local crecerá a medida que envíes por BlackScale (secuencias, campañas) y se registren aperturas/clics/respuestas.
          </p>
        </div>
      )}
    </div>
  );
}
