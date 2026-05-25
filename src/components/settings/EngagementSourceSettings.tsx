"use client";

import { useEffect, useState } from "react";

type Counts = { hot: number; warm: number; cold: number; dead: number; total: number };

const card: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20,
};

export function EngagementSourceSettings({ role: _role }: { role: string }) {
  const [parity, setParity] = useState<{ local: Counts } | null>(null);

  useEffect(() => {
    fetch("/api/marketing/engagement-parity").then(r => r.json()).then(d => { if (!d.error) setParity(d); }).catch(() => {});
  }, []);

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
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
          BlackScale (local)
        </span>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>
        Las señales de engagement (aperturas, clics, temperatura) se derivan del registro local de eventos de email
        de BlackScale (secuencias, campañas).
      </p>

      {parity && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Distribución de engagement</div>
          <Row label="BlackScale" c={parity.local} accent="#22c55e" />
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>
            La distribución crecerá a medida que envíes por BlackScale (secuencias, campañas) y se registren aperturas/clics/respuestas.
          </p>
        </div>
      )}
    </div>
  );
}
