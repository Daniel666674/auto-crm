"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const S = {
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6, display: "block" },
  input: { width: "100%", padding: "8px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--foreground)", outline: "none", boxSizing: "border-box" as const },
  btn: (variant: "primary" | "outline" | "ghost" | "danger" = "outline"): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.12s",
    ...(variant === "primary" ? { background: "var(--primary)", color: "var(--primary-foreground)", border: "none" } : {}),
    ...(variant === "ghost" ? { background: "transparent", color: "var(--muted-foreground)", border: "none" } : {}),
    ...(variant === "danger" ? { background: "rgba(239,68,68,0.12)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" } : {}),
    ...(variant === "outline" ? { background: "transparent", color: "var(--foreground)" } : {}),
  }),
};

interface ScoringWeights {
  tempHot: number;
  tempWarm: number;
  tempCold: number;
  contactEmail: number;
  contactPhone: number;
  contactCompany: number;
  perActivity: number;
  maxActivityBonus: number;
  recency30d: number;
  recency14d: number;
  recency7d: number;
  hasDeals: number;
  dealValue100k: number;
  dealValue500k: number;
}

const DEFAULTS: ScoringWeights = {
  tempHot: 30,
  tempWarm: 15,
  tempCold: 0,
  contactEmail: 10,
  contactPhone: 8,
  contactCompany: 5,
  perActivity: 5,
  maxActivityBonus: 25,
  recency30d: -15,
  recency14d: -8,
  recency7d: -3,
  hasDeals: 15,
  dealValue100k: 10,
  dealValue500k: 20,
};

interface Props {
  role: string;
}

type WeightKey = keyof ScoringWeights;

interface WeightField {
  key: WeightKey;
  label: string;
  description?: string;
  negative?: boolean;
}

const GROUPS: { title: string; fields: WeightField[] }[] = [
  {
    title: "Temperatura base",
    fields: [
      { key: "tempHot", label: "Caliente" },
      { key: "tempWarm", label: "Tibio" },
      { key: "tempCold", label: "Frio" },
    ],
  },
  {
    title: "Completitud del contacto",
    fields: [
      { key: "contactEmail", label: "Email registrado" },
      { key: "contactPhone", label: "Telefono registrado" },
      { key: "contactCompany", label: "Empresa registrada" },
    ],
  },
  {
    title: "Engagement",
    fields: [
      { key: "perActivity", label: "Pts por actividad" },
      { key: "maxActivityBonus", label: "Bonus maximo de actividad" },
    ],
  },
  {
    title: "Penalizacion por inactividad",
    fields: [
      { key: "recency30d", label: "+30 dias sin contacto", negative: true },
      { key: "recency14d", label: "+14 dias sin contacto", negative: true },
      { key: "recency7d", label: "+7 dias sin contacto", negative: true },
    ],
  },
  {
    title: "Deals",
    fields: [
      { key: "hasDeals", label: "Tiene deals activos" },
      { key: "dealValue100k", label: "Deal >$1M COP" },
      { key: "dealValue500k", label: "Deal >$5M COP" },
    ],
  },
];

function calcMaxScore(w: ScoringWeights): number {
  return (
    w.tempHot +
    w.contactEmail + w.contactPhone + w.contactCompany +
    w.maxActivityBonus +
    w.hasDeals + w.dealValue100k + w.dealValue500k
    // recency penalties don't apply at max
  );
}

function calcMinScore(w: ScoringWeights): number {
  return (
    w.tempCold +
    Math.min(w.recency30d, w.recency14d, w.recency7d)
    // no deals, no activity, no contact info
  );
}

function calcSampleScore(w: ScoringWeights): number {
  // Sample: warm lead, has email+phone, 3 activities, 14d no contact, has one deal
  return (
    w.tempWarm +
    w.contactEmail + w.contactPhone +
    Math.min(w.perActivity * 3, w.maxActivityBonus) +
    w.recency14d +
    w.hasDeals
  );
}

function MagnitudeBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.abs(value));
  const isNeg = value < 0;
  return (
    <div style={{ height: 4, borderRadius: 2, background: "var(--muted)", overflow: "hidden", marginTop: 6, width: "100%" }}>
      <div style={{
        height: "100%",
        width: `${pct}%`,
        background: isNeg ? "#ef4444" : "#C39A4C",
        borderRadius: 2,
        transition: "width 0.2s",
      }} />
    </div>
  );
}

export function ScoringWeightsSettings({ role }: Props) {
  const canEdit = role === "superadmin" || role === "marketing";
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchWeights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/scoring");
      if (!res.ok) throw new Error();
      const data: ScoringWeights = await res.json();
      setWeights(data);
    } catch {
      toast.error("No se pudieron cargar los pesos de scoring");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWeights(); }, [fetchWeights]);

  const handleChange = (key: WeightKey, raw: string) => {
    const val = parseInt(raw, 10);
    if (!isNaN(val)) {
      setWeights(prev => ({ ...prev, [key]: val }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/scoring", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weights),
      });
      if (!res.ok) throw new Error();
      toast.success("Pesos de scoring guardados");
    } catch {
      toast.error("Error al guardar los pesos");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("¿Restaurar todos los pesos a los valores por defecto?")) return;
    setWeights(DEFAULTS);
    toast.success("Valores restaurados — guarda para aplicar");
  };

  const maxScore = calcMaxScore(weights);
  const minScore = calcMinScore(weights);
  const sampleScore = calcSampleScore(weights);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Pesos de Scoring</h3>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Configura como se calcula el score de cada lead (0-100 pts)
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchWeights} style={S.btn("ghost")} disabled={loading} title="Recargar">
            <RefreshCw size={14} style={{ ...(loading ? { animation: "spin 1s linear infinite" } : {}) }} />
          </button>
          {canEdit && (
            <>
              <button onClick={handleReset} style={S.btn("outline")} title="Restaurar defaults">
                <RotateCcw size={13} /> Restaurar
              </button>
              <button onClick={handleSave} disabled={saving} style={S.btn("primary")}>
                {saving
                  ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
                  : <Save size={13} />
                }
                Guardar
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ ...S.card, textAlign: "center", padding: 48, color: "var(--muted-foreground)" }}>
          <RefreshCw size={22} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <>
          {/* Weight groups */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {GROUPS.map(group => (
              <div key={group.title} style={S.card}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>
                  {group.title}
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {group.fields.map(field => {
                    const val = weights[field.key];
                    const isNeg = val < 0 || field.negative;
                    return (
                      <div key={field.key}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "var(--foreground)", fontWeight: 500 }}>
                            {field.label}
                          </span>
                          <span style={{
                            fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                            background: isNeg ? "rgba(239,68,68,0.1)" : "rgba(195,154,76,0.12)",
                            color: isNeg ? "#ef4444" : "#C39A4C",
                          }}>
                            {val > 0 ? `+${val}` : val} pts
                          </span>
                        </div>
                        <input
                          type="number"
                          min={-100}
                          max={100}
                          value={val}
                          onChange={e => handleChange(field.key, e.target.value)}
                          disabled={!canEdit}
                          style={{
                            ...S.input,
                            opacity: canEdit ? 1 : 0.7,
                            cursor: canEdit ? "text" : "not-allowed",
                          }}
                        />
                        <MagnitudeBar value={val} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Live preview card */}
            <div style={{ ...S.card, background: "rgba(195,154,76,0.04)", borderColor: "rgba(195,154,76,0.2)", display: "flex", flexDirection: "column", gap: 0 }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#C39A4C", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>
                Vista previa (ejemplo)
              </h4>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 16px", lineHeight: 1.5 }}>
                Lead tibio · email + telefono · 3 actividades · 14 dias sin contacto · 1 deal activo
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {[
                  { label: "Temperatura (tibio)", val: weights.tempWarm },
                  { label: "Email + telefono", val: weights.contactEmail + weights.contactPhone },
                  { label: "3 actividades", val: Math.min(weights.perActivity * 3, weights.maxActivityBonus) },
                  { label: "Inactividad 14d", val: weights.recency14d },
                  { label: "1 deal activo", val: weights.hasDeals },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: val < 0 ? "#ef4444" : "var(--foreground)" }}>
                      {val >= 0 ? `+${val}` : val}
                    </span>
                  </div>
                ))}
                <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Score estimado</span>
                  <span style={{
                    fontSize: 18, fontWeight: 800,
                    color: sampleScore >= 50 ? "#C39A4C" : sampleScore >= 25 ? "#f59e0b" : "#ef4444",
                  }}>
                    {sampleScore}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Score range summary */}
          <div style={{ ...S.card, display: "flex", gap: 0 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>
              Rango de scores con esta configuracion
            </h4>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ flex: 1 }}>
                <span style={S.label}>Score maximo posible</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: "#22c55e" }}>{maxScore}</span>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>puntos</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                  Lead caliente, datos completos, muy activo, deals de alto valor
                </p>
              </div>
              <div style={{ width: 1, background: "var(--border)" }} />
              <div style={{ flex: 1 }}>
                <span style={S.label}>Score minimo posible</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: "#ef4444" }}>{minScore}</span>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>puntos</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                  Lead frio, sin datos, sin actividad reciente, sin deals
                </p>
              </div>
              <div style={{ width: 1, background: "var(--border)" }} />
              <div style={{ flex: 1 }}>
                <span style={S.label}>Score de ejemplo</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: "#C39A4C" }}>{sampleScore}</span>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>puntos</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                  Lead tipico con actividad moderada
                </p>
              </div>
            </div>
          </div>

          {!canEdit && (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", padding: "8px 0" }}>
              Solo superadmin y marketing pueden editar los pesos de scoring
            </p>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
