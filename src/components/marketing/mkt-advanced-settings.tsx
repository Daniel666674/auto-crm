"use client";

import React, { useEffect, useState, useCallback } from "react";

const ACCENT = "var(--mkt-accent)";

const card: React.CSSProperties = {
  background: "var(--mkt-card)", border: "1px solid var(--mkt-border)",
  borderRadius: 12, padding: 20,
};
const input: React.CSSProperties = {
  width: "100%", padding: "8px 12px", background: "var(--mkt-bg)",
  border: "1px solid var(--mkt-border)", borderRadius: 8, fontSize: 13,
  color: "var(--mkt-text)", outline: "none", boxSizing: "border-box" as const,
};
const btn = (v: "primary" | "outline" | "danger" = "outline"): React.CSSProperties => ({
  padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer",
  border: "1px solid var(--mkt-border)", display: "inline-flex", alignItems: "center", gap: 5, transition: "all 0.12s",
  background: v === "primary" ? ACCENT : v === "danger" ? "rgba(239,68,68,0.12)" : "transparent",
  color: v === "primary" ? "#0a0a0a" : v === "danger" ? "#ef4444" : "var(--mkt-text-muted)",
  ...(v === "danger" ? { borderColor: "rgba(239,68,68,0.3)" } : {}),
});
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block",
};

// ─── Stale contact detector ──────────────────────────────────────────────────
function StaleContactsCard() {
  const [staleDays, setStaleDays] = useState(30);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; email: string; company: string; tier: number; daysSinceActivity: number; engagementStatus: string }>>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/marketing/stale");
    const d = await r.json();
    setStaleDays(d.staleDays ?? 30);
    setContacts(d.contacts ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/mkt-stale-days", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staleDays }),
      });
      await load();
    } finally { setSaving(false); }
  };

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 4 }}>
        Detección de contactos inactivos
      </div>
      <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Contactos sin actividad en más de N días (excluye los ya enviados a ventas, rebotados o desuscritos).
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 14 }}>
        <div style={{ width: 120 }}>
          <span style={label}>Umbral días</span>
          <input type="number" min={1} max={365} style={input} value={staleDays} onChange={(e) => setStaleDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 30)))} />
        </div>
        <button style={btn("primary")} onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>

      <div style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginBottom: 8 }}>
        {contacts.length} contacto{contacts.length !== 1 ? "s" : ""} inactivos
      </div>
      <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid var(--mkt-border)", borderRadius: 8 }}>
        {contacts.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--mkt-text-muted)" }}>
            ✓ Sin contactos inactivos
          </div>
        ) : (
          contacts.slice(0, 50).map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--mkt-border)", fontSize: 12 }}>
              <div>
                <div style={{ color: "var(--mkt-text)", fontWeight: 500 }}>{c.name}</div>
                <div style={{ color: "var(--mkt-text-muted)", fontSize: 11 }}>{c.email || "—"} · {c.company || "—"} · T{c.tier}</div>
              </div>
              <div style={{ color: c.daysSinceActivity > 90 ? "#ef4444" : c.daysSinceActivity > 60 ? "#f59e0b" : "var(--mkt-text-muted)", fontWeight: 600, fontSize: 11 }}>
                {c.daysSinceActivity}d
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Duplicate detector ──────────────────────────────────────────────────────
function DuplicatesCard() {
  const [groups, setGroups] = useState<Array<{ reason: string; contacts: Array<{ id: string; name: string; email: string; company: string; tier: number; score: number }> }>>([]);
  const [merging, setMerging] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/marketing/duplicates");
    const d = await r.json();
    setGroups(d.groups ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const merge = async (winnerId: string, group: { contacts: Array<{ id: string }> }) => {
    const losers = group.contacts.filter((c) => c.id !== winnerId);
    setMerging(winnerId);
    try {
      for (const l of losers) {
        await fetch("/api/marketing/merge", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winnerId, loserId: l.id }),
        });
      }
      await load();
    } finally { setMerging(null); }
  };

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 4 }}>
        Detección de duplicados
      </div>
      <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Contactos con mismo email o mismo nombre+empresa. Fusiona conservando el ganador.
      </p>

      {groups.length === 0 ? (
        <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: "var(--mkt-text-muted)" }}>
          ✓ Sin duplicados detectados
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map((g, i) => (
            <div key={i} style={{ padding: 12, background: "var(--mkt-surface)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 8 }}>
                {g.reason === "email" ? `Mismo email: ${g.contacts[0]?.email}` : `Mismo nombre+empresa: ${g.contacts[0]?.name} @ ${g.contacts[0]?.company}`}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {g.contacts.map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--mkt-bg)", borderRadius: 6 }}>
                    <div style={{ fontSize: 11 }}>
                      <div style={{ color: "var(--mkt-text)", fontWeight: 500 }}>{c.name}</div>
                      <div style={{ color: "var(--mkt-text-muted)" }}>{c.email} · {c.company} · T{c.tier} · {c.score}</div>
                    </div>
                    <button style={btn("outline")} onClick={() => merge(c.id, g)} disabled={!!merging}>
                      Conservar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Scoring weights ─────────────────────────────────────────────────────────
function ScoringCard({ canEdit }: { canEdit: boolean }) {
  const [w, setW] = useState({ t1: 60, t2: 35, t3: 15, engageOpen: 2, engageClick: 5, hotThreshold: 70 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings/mkt-scoring").then((r) => r.json()).then((d) => { if (!d.error) setW(d); }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/settings/mkt-scoring", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(w),
      });
      const d = await r.json();
      setMsg(d.error ? `Error: ${d.error}` : "✓ Guardado");
      setTimeout(() => setMsg(""), 3000);
    } finally { setSaving(false); }
  };

  const Row = ({ k, lbl, hint }: { k: keyof typeof w; lbl: string; hint?: string }) => (
    <div>
      <span style={label}>{lbl}</span>
      <input type="number" style={{ ...input, opacity: canEdit ? 1 : 0.5 }} value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} disabled={!canEdit} />
      {hint && <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginTop: 4 }}>{hint}</div>}
    </div>
  );

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 4 }}>
        Pesos de scoring ICP
      </div>
      <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Configuración del scoring base por tier y bonificaciones por engagement.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
        <Row k="t1" lbl="Tier 1 (base)" hint="ICP perfecto" />
        <Row k="t2" lbl="Tier 2 (base)" hint="ICP aceptable" />
        <Row k="t3" lbl="Tier 3 (base)" hint="Bajo fit" />
        <Row k="engageOpen" lbl="Pts por open" />
        <Row k="engageClick" lbl="Pts por click" />
        <Row k="hotThreshold" lbl="Umbral hot" hint="Score mínimo" />
      </div>
      {canEdit && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={btn("primary")} onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar pesos"}</button>
          {msg && <span style={{ fontSize: 11, color: ACCENT }}>{msg}</span>}
        </div>
      )}
      {!canEdit && <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>Solo superadmin/marketing puede editar.</div>}
    </div>
  );
}

// ─── Campaign outcomes ───────────────────────────────────────────────────────
function OutcomesCard({ canEdit }: { canEdit: boolean }) {
  const [outcomes, setOutcomes] = useState<Array<{ id: string; type: string; label: string; order: number; active: boolean }>>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("success");

  const load = useCallback(async () => {
    const r = await fetch("/api/settings/campaign-outcomes");
    setOutcomes(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!newLabel.trim()) return;
    await fetch("/api/settings/campaign-outcomes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newType, label: newLabel.trim() }),
    });
    setNewLabel("");
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este outcome?")) return;
    await fetch(`/api/settings/campaign-outcomes/${id}`, { method: "DELETE" });
    await load();
  };

  const cols = ["success", "underperformed", "cancelled"];
  const colors: Record<string, string> = { success: "#22c55e", underperformed: "#f59e0b", cancelled: "#ef4444" };
  const colLabels: Record<string, string> = { success: "Éxito", underperformed: "Bajo rendimiento", cancelled: "Cancelada" };

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 4 }}>
        Razones de outcome de campañas
      </div>
      <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Configura las razones disponibles al cerrar una campaña.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
        {cols.map((type) => (
          <div key={type}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors[type], marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {colLabels[type]}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {outcomes.filter((o) => o.type === type).map((o) => (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--mkt-surface)", borderRadius: 6, fontSize: 11 }}>
                  <span style={{ color: "var(--mkt-text)" }}>{o.label}</span>
                  {canEdit && (
                    <button onClick={() => remove(o.id)} style={{ background: "transparent", border: "none", color: "var(--mkt-text-muted)", cursor: "pointer", fontSize: 11 }}>✕</button>
                  )}
                </div>
              ))}
              {outcomes.filter((o) => o.type === type).length === 0 && (
                <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", padding: "6px 10px" }}>—</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {canEdit && (
        <div style={{ display: "flex", gap: 8 }}>
          <select style={{ ...input, width: 180 }} value={newType} onChange={(e) => setNewType(e.target.value)}>
            {cols.map((t) => <option key={t} value={t}>{colLabels[t]}</option>)}
          </select>
          <input style={input} placeholder="Razón (ej: Lista de baja calidad)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <button style={btn("primary")} onClick={create}>Agregar</button>
        </div>
      )}
    </div>
  );
}

// ─── Marketing targets ───────────────────────────────────────────────────────
function TargetsCard({ canEdit }: { canEdit: boolean }) {
  const [targets, setTargets] = useState<Array<{ id: string; userId: string; userName: string | null; userEmail: string | null; metric: string; period: string; year: number; month: number | null; quarter: number | null; targetValue: number }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name?: string; email: string }>>([]);
  const [form, setForm] = useState({ userId: "", metric: "leads", period: "monthly", year: new Date().getFullYear(), month: new Date().getMonth() + 1, targetValue: 0 });

  const load = useCallback(async () => {
    const [tRes, uRes] = await Promise.all([
      fetch("/api/settings/marketing-targets").then((r) => r.json()),
      fetch("/api/settings/users").then((r) => r.json()).catch(() => []),
    ]);
    setTargets(tRes ?? []);
    setUsers(uRes ?? []);
    if (uRes?.[0]?.id && !form.userId) setForm((f) => ({ ...f, userId: uRes[0].id }));
  }, [form.userId]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.userId || !form.targetValue) return;
    await fetch("/api/settings/marketing-targets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm((f) => ({ ...f, targetValue: 0 }));
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este target?")) return;
    await fetch(`/api/settings/marketing-targets/${id}`, { method: "DELETE" });
    await load();
  };

  const metricLabels: Record<string, string> = {
    leads: "Leads", handoffs: "Handoffs", qualified: "Calificados", engagement_rate: "Engagement %",
  };
  const periodLabels: Record<string, string> = {
    monthly: "Mensual", quarterly: "Trimestral", annual: "Anual",
  };

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 4 }}>
        Metas de marketing por usuario
      </div>
      <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Objetivos cuantitativos (leads, handoffs, etc.) por periodo.
      </p>

      {targets.length > 0 && (
        <div style={{ marginBottom: 14, border: "1px solid var(--mkt-border)", borderRadius: 8, overflow: "hidden" }}>
          {targets.map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid var(--mkt-border)", fontSize: 12 }}>
              <div>
                <span style={{ color: "var(--mkt-text)", fontWeight: 500 }}>{t.userName || t.userEmail}</span>
                <span style={{ color: "var(--mkt-text-muted)", marginLeft: 8 }}>
                  {metricLabels[t.metric] ?? t.metric} · {periodLabels[t.period] ?? t.period} {t.year}
                  {t.month ? `/${String(t.month).padStart(2, "0")}` : t.quarter ? ` Q${t.quarter}` : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: ACCENT, fontWeight: 600 }}>{t.targetValue}</span>
                {canEdit && (
                  <button onClick={() => remove(t.id)} style={{ background: "transparent", border: "none", color: "var(--mkt-text-muted)", cursor: "pointer" }}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 0.7fr 0.7fr auto", gap: 8, alignItems: "end" }}>
          <div>
            <span style={label}>Usuario</span>
            <select style={input} value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>Métrica</span>
            <select style={input} value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
              {Object.entries(metricLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>Periodo</span>
            <select style={input} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
              {Object.entries(periodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>Año</span>
            <input type="number" style={input} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
          </div>
          <div>
            <span style={label}>Valor</span>
            <input type="number" style={input} value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: Number(e.target.value) })} />
          </div>
          <button style={btn("primary")} onClick={create}>Agregar</button>
        </div>
      )}
    </div>
  );
}

// ─── Main exported component ─────────────────────────────────────────────────
export function MktAdvancedSettings({ role }: { role: string }) {
  const canEdit = role === "superadmin" || role === "marketing";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <StaleContactsCard />
      <DuplicatesCard />
      <ScoringCard canEdit={canEdit} />
      <OutcomesCard canEdit={canEdit} />
      <TargetsCard canEdit={canEdit} />
    </div>
  );
}
