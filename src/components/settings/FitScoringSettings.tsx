"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { BSLoading } from "../ui/BSLoading";

interface FitWeights {
  linkedinAds: number; postsWeekly: number; postsMonthly: number; dmActiveLinkedin: number;
  metaAds: number; googleAds: number; mgrNoHead: number; vacancy: number;
  size1to10: number; size11to50: number; size51to200: number;
  industryTech: number; industryOther: number;
  roleCeo: number; roleCmo: number; roleMktMgr: number; roleCsuite: number; roleOther: number;
}
interface Tiers { a: number; b: number; c: number; }

const DEFAULTS: FitWeights = {
  linkedinAds: 12, postsWeekly: 12, postsMonthly: 4, dmActiveLinkedin: 12,
  metaAds: 4, googleAds: 8, mgrNoHead: 8, vacancy: 8,
  size1to10: 12, size11to50: 4, size51to200: 0,
  industryTech: 12, industryOther: 4,
  roleCeo: 12, roleCmo: 12, roleMktMgr: 8, roleCsuite: 4, roleOther: 0,
};
const DEFAULT_TIERS: Tiers = { a: 60, b: 40, c: 24 };

const GROUPS: Array<{ title: string; note: string; rows: Array<{ key: keyof FitWeights; label: string; note: string }> }> = [
  {
    title: "Señales de Marketing (enriquecidas por el VA)",
    note: "Hasta 64 pts — las señales de mayor intención de compra.",
    rows: [
      { key: "linkedinAds", label: "Pauta activa en LinkedIn Ads", note: "Señal más fuerte. Ya invierte en plataforma." },
      { key: "postsWeekly", label: "Posts empresa: Semanal", note: "Frecuencia de posts = Semanal" },
      { key: "postsMonthly", label: "Posts empresa: Mensual", note: "Frecuencia de posts = Mensual" },
      { key: "dmActiveLinkedin", label: "Decision maker activo en LinkedIn (30d)", note: "Publicó o comentó el último mes" },
      { key: "metaAds", label: "Pauta activa en Meta Ads", note: "facebook.com/ads/library" },
      { key: "googleAds", label: "Pauta activa en Google Ads", note: "adstransparency.google.com" },
      { key: "mgrNoHead", label: "Marketing Manager sin Head/Director", note: "Equipo sub-estructurado, listo para tercerizar" },
      { key: "vacancy", label: "Vacante abierta en Marketing", note: "Ya intenta resolver el dolor" },
    ],
  },
  {
    title: "Tamaño de empresa (Apollo)",
    note: "Empleados — micro empresas tercerizan marketing con más frecuencia.",
    rows: [
      { key: "size1to10", label: "1-10 empleados", note: "Startup / micro — alta probabilidad de tercerizar" },
      { key: "size11to50", label: "11-50 empleados", note: "Pequeña — buen fit para BlackScale" },
      { key: "size51to200", label: "51-200 empleados", note: "Mediana — ciclo de venta más largo" },
    ],
  },
  {
    title: "Industria (Apollo)",
    note: "",
    rows: [
      { key: "industryTech", label: "Tech / SaaS / IT / Fintech", note: "Mayor presupuesto para marketing digital" },
      { key: "industryOther", label: "Otras industrias", note: "Prioridad estándar" },
    ],
  },
  {
    title: "Cargo del decisor (Apollo)",
    note: "",
    rows: [
      { key: "roleCeo", label: "CEO / Founder / Owner / Director General", note: "Máxima autoridad en empresas pequeñas/medianas" },
      { key: "roleCmo", label: "CMO / VP / Director / Head of Marketing", note: "Comprador directo del servicio" },
      { key: "roleMktMgr", label: "Marketing Manager / Growth / Demand Gen", note: "Influenciador clave en la decisión" },
      { key: "roleCsuite", label: "COO / CFO / CTO / Gerente General", note: "Aprueba presupuesto, no es su área" },
      { key: "roleOther", label: "Otro (Ventas, Ops, Técnico…)", note: "Bajo poder de decisión sobre marketing" },
    ],
  },
];

export function FitScoringSettings({ role }: { role: string }) {
  const canEdit = role === "superadmin" || role === "marketing";
  const [weights, setWeights] = useState<FitWeights>(DEFAULTS);
  const [tiers, setTiers] = useState<Tiers>(DEFAULT_TIERS);
  const [dist, setDist] = useState<Record<string, number>>({ A: 0, B: 0, C: 0, D: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, d] = await Promise.all([
        fetch("/api/settings/fit-scoring").then(r => r.json()),
        fetch("/api/scoring/fit").then(r => r.json()),
      ]);
      if (w.weights) setWeights({ ...DEFAULTS, ...w.weights });
      if (w.tiers) setTiers({ ...DEFAULT_TIERS, ...w.tiers });
      if (d.distribution) setDist(d.distribution);
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const maxScore =
    weights.linkedinAds + Math.max(weights.postsWeekly, weights.postsMonthly) + weights.dmActiveLinkedin +
    weights.metaAds + weights.googleAds + weights.mgrNoHead + weights.vacancy +
    Math.max(weights.size1to10, weights.size11to50, weights.size51to200) +
    Math.max(weights.industryTech, weights.industryOther) +
    Math.max(weights.roleCeo, weights.roleCmo, weights.roleMktMgr, weights.roleCsuite, weights.roleOther);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/fit-scoring", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights, tiers }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success("Pesos guardados. Recalcula para aplicar a los contactos.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const recompute = async () => {
    setRecomputing(true);
    try {
      const res = await fetch("/api/scoring/fit", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      toast.success(`${data.updated} contactos recalculados`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al recalcular");
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) return <BSLoading />;

  const card: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 };
  const num: React.CSSProperties = { width: 64, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, textAlign: "center" };
  const btn = (primary?: boolean): React.CSSProperties => ({
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: canEdit ? "pointer" : "not-allowed", opacity: canEdit ? 1 : 0.5,
    border: primary ? "none" : "1px solid var(--border)",
    background: primary ? "var(--primary)" : "transparent",
    color: primary ? "var(--primary-foreground)" : "var(--foreground)",
    display: "inline-flex", alignItems: "center", gap: 6,
  });

  const set = (k: keyof FitWeights, v: string) => setWeights(w => ({ ...w, [k]: Math.max(0, parseInt(v) || 0) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Scoring de Fit (ICP)</h3>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Score firmográfico 0-100 desde Apollo + señales del VA. MQL desde {tiers.a} pts. Máximo posible: <strong>{maxScore}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setWeights(DEFAULTS); setTiers(DEFAULT_TIERS); }} disabled={!canEdit} style={btn()}>
            <RotateCcw size={14} /> Restablecer
          </button>
          <button onClick={save} disabled={!canEdit || saving} style={btn(true)}>
            <Save size={14} /> {saving ? "Guardando…" : "Guardar"}
          </button>
          <button onClick={recompute} disabled={!canEdit || recomputing} style={btn(true)}>
            <RefreshCw size={14} className={recomputing ? "animate-spin" : ""} /> {recomputing ? "Recalculando…" : "Recalcular todos"}
          </button>
        </div>
      </div>

      {/* Tier distribution */}
      <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 12 }}>
        {([["A", "Tier A · MQL", "#16a34a"], ["B", "Tier B", "#C39A4C"], ["C", "Tier C", "#4299e1"], ["D", "Tier D", "#64748b"]] as const).map(([k, label, color]) => (
          <div key={k} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{dist[k] ?? 0}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tier thresholds */}
      <div style={card}>
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Umbrales de Tier</h4>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {([["a", "Tier A (mínimo) · MQL"], ["b", "Tier B (mínimo)"], ["c", "Tier C (mínimo)"]] as const).map(([k, label]) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              {label}
              <input type="number" disabled={!canEdit} value={tiers[k]} onChange={e => setTiers(t => ({ ...t, [k]: Math.max(0, parseInt(e.target.value) || 0) }))} style={num} />
            </label>
          ))}
        </div>
      </div>

      {/* Weight groups */}
      {GROUPS.map(g => (
        <div key={g.title} style={card}>
          <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>{g.title}</h4>
          {g.note && <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 14px" }}>{g.note}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {g.rows.map(r => (
              <div key={r.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{r.note}</div>
                </div>
                <input type="number" disabled={!canEdit} value={weights[r.key]} onChange={e => set(r.key, e.target.value)} style={num} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
