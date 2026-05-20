"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Play, RefreshCw, ToggleLeft, ToggleRight, ArrowRight } from "lucide-react";
import type { HandoffRule, LifecycleStage } from "@/lib/handoff-rules-engine";
import { BSLoading } from "../ui/BSLoading";

const STAGES: { value: LifecycleStage; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "MQL", label: "MQL" },
  { value: "SQL", label: "SQL" },
  { value: "opportunity", label: "Opportunity" },
  { value: "customer", label: "Cliente" },
];

const TEMP_OPTIONS = [
  { value: "", label: "Cualquiera" },
  { value: "cold", label: "Frío" },
  { value: "warm", label: "Tibio" },
  { value: "hot", label: "Caliente" },
];

const SOURCE_OPTIONS = [
  "", "web", "referido", "linkedin", "google", "evento", "cold_outreach", "otro",
];

const S = {
  card: {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 12, padding: 20,
  } as React.CSSProperties,
  label: {
    fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)",
    textTransform: "uppercase" as const, letterSpacing: "0.06em",
    marginBottom: 4, display: "block",
  },
  input: {
    width: "100%", padding: "7px 10px", background: "var(--card)",
    border: "1px solid var(--border)", borderRadius: 8, fontSize: 13,
    color: "var(--foreground)", outline: "none", boxSizing: "border-box" as const,
  },
  select: {
    width: "100%", padding: "7px 10px", background: "var(--card)",
    border: "1px solid var(--border)", borderRadius: 8, fontSize: 13,
    color: "var(--foreground)", outline: "none",
  } as React.CSSProperties,
};

function btn(variant: "primary" | "outline" | "ghost" | "danger" | "green" = "outline"): React.CSSProperties {
  return {
    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: "pointer", border: "1px solid var(--border)", display: "inline-flex",
    alignItems: "center", gap: 6, transition: "all 0.12s",
    ...(variant === "primary" ? { background: "var(--primary)", color: "var(--primary-foreground)", border: "none" } : {}),
    ...(variant === "ghost" ? { background: "transparent", color: "var(--muted-foreground)", border: "none" } : {}),
    ...(variant === "danger" ? { background: "rgba(239,68,68,0.12)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" } : {}),
    ...(variant === "green" ? { background: "rgba(34,197,94,0.12)", color: "#22c55e", borderColor: "rgba(34,197,94,0.3)" } : {}),
    ...(variant === "outline" ? { background: "transparent", color: "var(--foreground)" } : {}),
  };
}

const BLANK_RULE: Omit<HandoffRule, "id"> = {
  name: "",
  active: true,
  fromStage: "lead",
  toStage: "MQL",
  minScore: undefined,
  temperature: undefined,
  source: undefined,
  minDaysInStage: undefined,
  maxDaysInStage: undefined,
};

export function HandoffRulesSettings() {
  const [rules, setRules] = useState<HandoffRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<HandoffRule, "id">>({ ...BLANK_RULE });
  const [lastRun, setLastRun] = useState<{ applied: number; results: Array<{ contactName: string; fromStage: string; toStage: string }> } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/handoff-rules");
      if (res.ok) {
        const d = await res.json() as { rules: HandoffRule[] };
        setRules(d.rules);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (updated: HandoffRule[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/handoff-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: updated }),
      });
      if (res.ok) {
        const d = await res.json() as { rules: HandoffRule[] };
        setRules(d.rules);
        toast.success("Reglas guardadas");
      } else {
        toast.error("Error al guardar");
      }
    } catch { toast.error("Error de red"); }
    setSaving(false);
  };

  const addRule = async () => {
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return; }
    if (form.fromStage === form.toStage) { toast.error("La etapa origen y destino deben ser distintas"); return; }

    const newRule: HandoffRule = {
      ...form,
      id: `rule-${Date.now()}`,
      minScore: form.minScore || undefined,
      temperature: (form.temperature as HandoffRule["temperature"]) || undefined,
      source: form.source || undefined,
      minDaysInStage: form.minDaysInStage || undefined,
      maxDaysInStage: form.maxDaysInStage || undefined,
    };
    const updated = [...rules, newRule];
    await save(updated);
    setForm({ ...BLANK_RULE });
    setShowForm(false);
  };

  const toggleRule = async (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, active: !r.active } : r);
    await save(updated);
  };

  const deleteRule = async (id: string) => {
    if (!confirm("¿Eliminar esta regla?")) return;
    const updated = rules.filter(r => r.id !== id);
    await save(updated);
  };

  const runNow = async () => {
    setRunning(true);
    setLastRun(null);
    try {
      const res = await fetch("/api/handoff-rules", { method: "POST" });
      if (res.ok) {
        const d = await res.json() as { applied: number; results: Array<{ contactName: string; fromStage: string; toStage: string }> };
        setLastRun(d);
        toast.success(`${d.applied} contacto(s) avanzado(s)`);
      } else {
        toast.error("Error al ejecutar reglas");
      }
    } catch { toast.error("Error de red"); }
    setRunning(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Reglas de auto-handoff</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
            Avanza contactos automáticamente entre etapas del ciclo de vida según condiciones.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn("green")} onClick={runNow} disabled={running}>
            {running ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            Ejecutar ahora
          </button>
          <button style={btn("primary")} onClick={() => setShowForm(v => !v)}>
            <Plus size={13} />
            Nueva regla
          </button>
        </div>
      </div>

      {/* Last run result */}
      {lastRun && (
        <div style={{
          padding: "12px 16px", borderRadius: 10,
          background: lastRun.applied > 0 ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${lastRun.applied > 0 ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: lastRun.applied > 0 ? "#22c55e" : "var(--muted-foreground)", marginBottom: lastRun.results.length > 0 ? 8 : 0 }}>
            {lastRun.applied > 0 ? `${lastRun.applied} contacto(s) avanzado(s)` : "Sin cambios — ningún contacto cumple las condiciones activas"}
          </div>
          {lastRun.results.map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{r.contactName}</span>
              <ArrowRight size={11} style={{ color: "var(--muted-foreground)" }} />
              <span style={{ color: "#22c55e" }}>{r.toStage}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add rule form */}
      {showForm && (
        <div style={{ ...S.card, border: "1px solid rgba(195,154,76,0.3)", background: "rgba(195,154,76,0.04)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Nueva regla</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={S.label}>Nombre de la regla</span>
              <input
                style={S.input} placeholder="Ej: Lead caliente con score alto → MQL"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <span style={S.label}>Etapa origen</span>
              <select style={S.select} value={form.fromStage} onChange={e => setForm({ ...form, fromStage: e.target.value as LifecycleStage })}>
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <span style={S.label}>Etapa destino</span>
              <select style={S.select} value={form.toStage} onChange={e => setForm({ ...form, toStage: e.target.value as LifecycleStage })}>
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <span style={S.label}>Score mínimo (opcional)</span>
              <input
                style={S.input} type="number" min={0} max={100} placeholder="60"
                value={form.minScore ?? ""}
                onChange={e => setForm({ ...form, minScore: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <span style={S.label}>Temperatura</span>
              <select style={S.select} value={form.temperature ?? ""} onChange={e => setForm({ ...form, temperature: (e.target.value as HandoffRule["temperature"]) || undefined })}>
                {TEMP_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <span style={S.label}>Días mínimos en etapa</span>
              <input
                style={S.input} type="number" min={0} placeholder="0"
                value={form.minDaysInStage ?? ""}
                onChange={e => setForm({ ...form, minDaysInStage: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <span style={S.label}>Fuente (opcional)</span>
              <select style={S.select} value={form.source ?? ""} onChange={e => setForm({ ...form, source: e.target.value || undefined })}>
                {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s || "Cualquiera"}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button style={btn("ghost")} onClick={() => { setShowForm(false); setForm({ ...BLANK_RULE }); }}>
              Cancelar
            </button>
            <button style={btn("primary")} onClick={addRule} disabled={saving}>
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
              Agregar regla
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <BSLoading label="Cargando reglas…" />
      ) : rules.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, padding: 32 }}>
          Sin reglas configuradas. Crea una para automatizar la progresión de leads.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rules.map(rule => (
            <div key={rule.id} style={{
              ...S.card,
              display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
              opacity: rule.active ? 1 : 0.55,
              transition: "opacity 0.2s",
            }}>
              {/* Toggle */}
              <button onClick={() => toggleRule(rule.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: rule.active ? "#C39A4C" : "var(--muted-foreground)", flexShrink: 0 }}>
                {rule.active
                  ? <ToggleRight size={22} style={{ color: "#C39A4C" }} />
                  : <ToggleLeft size={22} />}
              </button>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{rule.name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  <StagePill label={rule.fromStage} />
                  <ArrowRight size={12} style={{ color: "var(--muted-foreground)" }} />
                  <StagePill label={rule.toStage} highlight />
                  {rule.minScore !== undefined && <Chip label={`Score ≥ ${rule.minScore}`} />}
                  {rule.temperature && <Chip label={rule.temperature} />}
                  {rule.source && <Chip label={`Fuente: ${rule.source}`} />}
                  {rule.minDaysInStage !== undefined && <Chip label={`≥ ${rule.minDaysInStage}d en etapa`} />}
                  {rule.maxDaysInStage !== undefined && <Chip label={`≤ ${rule.maxDaysInStage}d en etapa`} />}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteRule(rule.id)}
                style={{ ...btn("danger"), padding: "5px 8px", flexShrink: 0 }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StagePill({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: highlight ? "rgba(195,154,76,0.12)" : "rgba(255,255,255,0.06)",
      color: highlight ? "#C39A4C" : "var(--foreground)",
      border: `1px solid ${highlight ? "rgba(195,154,76,0.3)" : "var(--border)"}`,
    }}>
      {label}
    </span>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 20, fontSize: 11,
      background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
      color: "var(--muted-foreground)",
    }}>
      {label}
    </span>
  );
}
