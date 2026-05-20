"use client";

import React, { useState } from "react";
import { Download, Users, Megaphone, Filter } from "lucide-react";
import { toast } from "sonner";

const CARD: React.CSSProperties = {
  borderRadius: 10, padding: "20px 22px",
  background: "var(--mkt-card, var(--card))",
  border: "1px solid var(--mkt-border, var(--border))",
  display: "flex", flexDirection: "column", gap: 12,
};

const EXPORTS = [
  { type: "contacts", label: "Contactos de marketing", desc: "Score, tier, engagement, aperturas/clics, listo-para-ventas e industria.", icon: Users },
  { type: "campaigns", label: "Campañas", desc: "Open/click/reply rate, contactos, conversiones y canal por campaña.", icon: Megaphone },
  { type: "segments", label: "Segmentos", desc: "Definición de cada segmento inteligente con sus reglas en JSON.", icon: Filter },
] as const;

export function MktExport() {
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (type: string, label: string) => {
    setBusy(type);
    try {
      const res = await fetch(`/api/marketing/export?type=${type}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mkt-${type}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${label} exportado`);
    } catch {
      toast.error("Error al exportar");
    }
    setBusy(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--mkt-text, #e2e8f0)" }}>Exportar datos</div>
        <div style={{ width: 40, height: 3, background: "#C39A4C", borderRadius: 2, marginTop: 4 }} />
        <div style={{ fontSize: 12, color: "var(--mkt-text-muted, #718096)", marginTop: 6 }}>
          Descarga datos de marketing en CSV (UTF-8) para reportes externos o respaldo.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {EXPORTS.map(({ type, label, desc, icon: Icon }) => (
          <div key={type} style={CARD}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(195,154,76,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} style={{ color: "#C39A4C" }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text, #e2e8f0)" }}>{label}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--mkt-text-muted, #94a3b8)", lineHeight: 1.45, flex: 1 }}>{desc}</div>
            <button
              onClick={() => download(type, label)}
              disabled={busy === type}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: busy === type ? "wait" : "pointer",
                background: "var(--mkt-accent, #C39A4C)", color: "#0a0a09", border: "none",
                opacity: busy === type ? 0.7 : 1,
              }}
            >
              <Download size={14} />
              {busy === type ? "Generando…" : "Descargar CSV"}
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "var(--mkt-text-muted, #718096)", padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--mkt-border, var(--border))" }}>
        Para exportar contactos y deals de ventas, usa <a href="/api/export?type=contacts" style={{ color: "#C39A4C" }}>Exportar en el módulo de Ventas</a>.
      </div>
    </div>
  );
}
