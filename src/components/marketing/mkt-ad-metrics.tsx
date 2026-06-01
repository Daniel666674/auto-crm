"use client";

import React, { useEffect, useState } from "react";

// "Datos de Pauta" — manual entry for ad metrics, so the funnel shows real CPL/
// ROAS/spend before (or instead of) connecting the platform APIs. Money fields are
// entered in COP and stored as cents. Saves to /api/marketing/ad-metrics.

type PlatformKey = "meta" | "linkedin" | "google";
type Kind = "cop" | "int" | "float" | "pct";
interface Field { key: string; label: string; kind: Kind }

const FIELDS: Record<PlatformKey, Field[]> = {
  meta: [
    { key: "spendCents", label: "Inversión (COP/mes)", kind: "cop" },
    { key: "impressions", label: "Impresiones", kind: "int" },
    { key: "reach", label: "Reach", kind: "int" },
    { key: "cpmCents", label: "CPM (COP)", kind: "cop" },
    { key: "followers", label: "Seguidores nuevos", kind: "int" },
    { key: "engagementRate", label: "Engagement %", kind: "pct" },
    { key: "pixelEvents", label: "Pixel events", kind: "int" },
  ],
  linkedin: [
    { key: "spendCents", label: "Inversión (COP/mes)", kind: "cop" },
    { key: "impressions", label: "Impresiones", kind: "int" },
    { key: "reach", label: "Reach", kind: "int" },
    { key: "frequency", label: "Frecuencia", kind: "float" },
    { key: "cpmCents", label: "CPM (COP)", kind: "cop" },
    { key: "ctr", label: "CTR %", kind: "pct" },
    { key: "engagementRate", label: "Engagement %", kind: "pct" },
  ],
  google: [
    { key: "spendCents", label: "Inversión (COP/mes)", kind: "cop" },
    { key: "ctr", label: "CTR Search %", kind: "pct" },
    { key: "conversions", label: "Conversiones", kind: "int" },
    { key: "qualityScore", label: "Quality Score (0-10)", kind: "float" },
  ],
};
const LABELS: Record<PlatformKey, string> = { meta: "Meta", linkedin: "LinkedIn", google: "Google Ads" };
const COLORS: Record<PlatformKey, string> = { meta: "#0866ff", linkedin: "#0a66c2", google: "#ea4335" };

type Vals = Record<PlatformKey, Record<string, string>>;

function toInput(kind: Kind, stored: number | null | undefined): string {
  if (stored == null) return "";
  return kind === "cop" ? String(Math.round(stored / 100)) : String(stored);
}
function toStored(kind: Kind, input: string): number | null {
  if (input.trim() === "") return null;
  const n = Number(input);
  if (isNaN(n)) return null;
  return kind === "cop" ? Math.round(n * 100) : n;
}

export function MktAdMetricsPanel({ onSaved }: { onSaved?: () => void }) {
  const [vals, setVals] = useState<Vals>({ meta: {}, linkedin: {}, google: {} });
  const [clients, setClients] = useState<Record<string, { configured: boolean }>>({});
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/marketing/ad-metrics").then(r => r.json()).then(d => {
      if (!d || d.error) return;
      const next: Vals = { meta: {}, linkedin: {}, google: {} };
      for (const p of ["meta", "linkedin", "google"] as PlatformKey[]) {
        const m = d.manual?.[p] ?? {};
        for (const f of FIELDS[p]) next[p][f.key] = toInput(f.kind, m[f.key]);
      }
      setVals(next);
      setClients(d.clients ?? {});
    }).catch(() => {});
  }, []);

  const set = (p: PlatformKey, key: string, v: string) => setVals(prev => ({ ...prev, [p]: { ...prev[p], [key]: v } }));

  const save = async () => {
    setSaving(true); setMsg("Guardando…");
    const payload: Record<string, Record<string, number | null>> = {};
    for (const p of ["meta", "linkedin", "google"] as PlatformKey[]) {
      const obj: Record<string, number | null> = {};
      for (const f of FIELDS[p]) obj[f.key] = toStored(f.kind, vals[p][f.key] ?? "");
      payload[p] = obj;
    }
    try {
      const res = await fetch("/api/marketing/ad-metrics", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setMsg(res.ok ? "✓ Guardado — el funnel se actualizó" : "Error al guardar");
      if (res.ok) onSaved?.();
    } catch { setMsg("Error de red"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 4000);
  };

  return (
    <div style={{ background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--mkt-text)", margin: 0 }}>Datos de Pauta</h2>
        <button onClick={save} disabled={saving} style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "var(--mkt-accent)", color: "#1a1408", fontSize: 12, fontWeight: 600, cursor: saving ? "wait" : "pointer" }}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
      <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", margin: "0 0 16px" }}>Ingresa tu inversión y métricas por plataforma. El funnel calcula CPL, ROAS y la distribución de presupuesto automáticamente. Si conectas la API, estos valores se sobreescriben con datos en vivo.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {(["meta", "linkedin", "google"] as PlatformKey[]).map(p => (
          <div key={p} style={{ border: "1px solid var(--mkt-border)", borderRadius: 12, padding: 14, borderLeft: `3px solid ${COLORS[p]}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--mkt-text)" }}>{LABELS[p]}</span>
              <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: clients[p]?.configured ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)", color: clients[p]?.configured ? "#6ee7b7" : "var(--mkt-text-muted)" }}>
                {clients[p]?.configured ? "API conectada" : "Manual"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {FIELDS[p].map(f => (
                <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>{f.label}</span>
                  <input inputMode="decimal" value={vals[p][f.key] ?? ""} onChange={e => set(p, f.key, e.target.value)} placeholder="—"
                    style={{ background: "var(--mkt-bg)", border: "1px solid var(--mkt-border)", borderRadius: 7, padding: "6px 9px", fontSize: 12, color: "var(--mkt-text)", outline: "none" }} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {msg && <p style={{ fontSize: 11, color: "var(--mkt-accent)", marginTop: 12, marginBottom: 0 }}>{msg}</p>}
    </div>
  );
}
