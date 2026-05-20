"use client";

import React, { useEffect, useState, useCallback } from "react";
import { BSLoading } from "../ui/BSLoading";

interface SegmentRules {
  temperature?: string[];
  lifecycleStage?: string[];
  industry?: string[];
  source?: string[];
  scoreMin?: number;
  scoreMax?: number;
  hasEmail?: boolean;
  hasPhone?: boolean;
  excludeReturned?: boolean;
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  rules: SegmentRules;
  count: number;
  createdAt: string;
}

const TEMPS = [
  { id: "hot", label: "Caliente", color: "#ef4444" },
  { id: "warm", label: "Tibio", color: "#f59e0b" },
  { id: "cold", label: "Frío", color: "#94a3b8" },
];
const LIFECYCLES = ["subscriber", "lead", "MQL", "SQL", "opportunity", "customer", "evangelist"];

export function MktSegmentsBuilder() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<SegmentRules>({ excludeReturned: true });
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/segments");
      const d = await res.json();
      if (Array.isArray(d)) setSegments(d);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const preview = useCallback(async (r: SegmentRules) => {
    const res = await fetch("/api/marketing/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview: true, rules: r }),
    });
    const d = await res.json();
    setPreviewCount(d.count ?? 0);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => preview(rules), 350);
    return () => clearTimeout(handle);
  }, [rules, preview]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/marketing/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), rules }),
      });
      setName(""); setDescription("");
      setRules({ excludeReturned: true });
      load();
    } finally { setSaving(false); }
  }

  async function deleteSeg(id: string) {
    if (!confirm("¿Eliminar segmento?")) return;
    await fetch(`/api/marketing/segments?id=${id}`, { method: "DELETE" });
    load();
  }

  function toggleTemp(t: string) {
    setRules(r => {
      const arr = r.temperature ?? [];
      const next = arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t];
      return { ...r, temperature: next.length ? next : undefined };
    });
  }
  function toggleLifecycle(t: string) {
    setRules(r => {
      const arr = r.lifecycleStage ?? [];
      const next = arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t];
      return { ...r, lifecycleStage: next.length ? next : undefined };
    });
  }

  const pill = (active: boolean, color?: string): React.CSSProperties => ({
    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${active ? (color ?? "var(--mkt-accent)") : "var(--mkt-border)"}`,
    background: active ? `${color ?? "var(--mkt-accent)"}20` : "transparent",
    color: active ? (color ?? "var(--mkt-accent)") : "var(--mkt-text-muted)",
    transition: "all 0.1s",
  });
  const label: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 };
  const input: React.CSSProperties = { padding: "6px 10px", borderRadius: 7, border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)", color: "var(--mkt-text)", fontSize: 12, outline: "none" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 16 }}>
      {/* Left: saved segments list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--mkt-text)", margin: "0 0 4px" }}>Segmentos Inteligentes</h2>
          <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", margin: 0 }}>
            Reglas en vivo. Los conteos se actualizan automáticamente cuando los contactos cambian.
          </p>
        </div>

        {loading ? (
          <BSLoading label="Cargando segmentos…" />
        ) : segments.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "var(--mkt-text-muted)", fontSize: 13, borderRadius: 10, border: "1px dashed var(--mkt-border)" }}>
            Aún no hay segmentos. Crea uno con el panel de la derecha.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {segments.map(s => (
              <div key={s.id} style={{ padding: 14, borderRadius: 10, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ minWidth: 60, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--mkt-accent)" }}>{s.count}</div>
                  <div style={{ fontSize: 9, color: "var(--mkt-text-muted)", textTransform: "uppercase" }}>contactos</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mkt-text)" }}>{s.name}</div>
                  {s.description && <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 2 }}>{s.description}</div>}
                  <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    {s.rules.temperature?.map(t => <span key={t} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>temp:{t}</span>)}
                    {s.rules.lifecycleStage?.map(t => <span key={t} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>{t}</span>)}
                    {s.rules.scoreMin != null && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>score≥{s.rules.scoreMin}</span>}
                    {s.rules.hasEmail && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>con email</span>}
                  </div>
                </div>
                <button onClick={() => deleteSeg(s.id)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", cursor: "pointer" }}>
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: builder panel */}
      <div style={{ padding: 18, borderRadius: 12, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", display: "flex", flexDirection: "column", gap: 14, height: "fit-content", position: "sticky", top: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mkt-text)" }}>Constructor de segmento</div>

        <div>
          <div style={label}>Nombre</div>
          <input style={{ ...input, width: "100%" }} value={name} onChange={e => setName(e.target.value)} placeholder="ej. Hot leads SaaS Colombia" />
        </div>

        <div>
          <div style={label}>Descripción (opcional)</div>
          <input style={{ ...input, width: "100%" }} value={description} onChange={e => setDescription(e.target.value)} placeholder="A quién apunta este segmento" />
        </div>

        <div>
          <div style={label}>Temperatura</div>
          <div style={{ display: "flex", gap: 5 }}>
            {TEMPS.map(t => (
              <button key={t.id} style={pill(rules.temperature?.includes(t.id) ?? false, t.color)} onClick={() => toggleTemp(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={label}>Lifecycle stage</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {LIFECYCLES.map(t => (
              <button key={t} style={pill(rules.lifecycleStage?.includes(t) ?? false)} onClick={() => toggleLifecycle(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={label}>Score (rango)</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="number" style={{ ...input, width: 70 }} value={rules.scoreMin ?? ""} placeholder="min" onChange={e => setRules(r => ({ ...r, scoreMin: e.target.value === "" ? undefined : Number(e.target.value) }))} />
            <span style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>—</span>
            <input type="number" style={{ ...input, width: 70 }} value={rules.scoreMax ?? ""} placeholder="max" onChange={e => setRules(r => ({ ...r, scoreMax: e.target.value === "" ? undefined : Number(e.target.value) }))} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            ["hasEmail", "Solo con email"],
            ["hasPhone", "Solo con teléfono"],
            ["excludeReturned", "Excluir devueltos a marketing"],
          ].map(([k, lbl]) => {
            const key = k as keyof SegmentRules;
            return (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--mkt-text)", cursor: "pointer" }}>
                <input type="checkbox" checked={Boolean(rules[key])} onChange={e => setRules(r => ({ ...r, [key]: e.target.checked ? true : undefined }))} style={{ accentColor: "var(--mkt-accent)" }} />
                {lbl}
              </label>
            );
          })}
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: "var(--mkt-bg)", border: "1px solid var(--mkt-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>Vista previa en vivo:</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--mkt-accent)" }}>{previewCount ?? "—"}</span>
        </div>

        <button
          disabled={!name.trim() || saving}
          onClick={save}
          style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: name.trim() && !saving ? "var(--mkt-accent)" : "var(--mkt-border)", color: name.trim() && !saving ? "#0a0a0a" : "var(--mkt-text-muted)", cursor: name.trim() && !saving ? "pointer" : "not-allowed" }}
        >
          {saving ? "Guardando…" : "Guardar segmento"}
        </button>
      </div>
    </div>
  );
}
