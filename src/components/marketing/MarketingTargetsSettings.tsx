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
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block",
};

interface Target {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  metric: string;
  period: string;
  year: number;
  month: number | null;
  quarter: number | null;
  targetValue: number;
}

interface UserOption { id: string; name?: string; email: string; }

const METRIC_LABELS: Record<string, string> = {
  leads: "Leads",
  handoffs: "Handoffs",
  qualified: "Calificados",
  engagement_rate: "Engagement %",
};

const PERIOD_LABELS: Record<string, string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  annual: "Anual",
};

export function MarketingTargetsSettings({ role }: { role: string }) {
  const canEdit = role === "superadmin" || role === "marketing";
  const [targets, setTargets] = useState<Target[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [form, setForm] = useState({
    userId: "",
    metric: "leads",
    period: "monthly",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    targetValue: 0,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tRes, uRes] = await Promise.all([
        fetch("/api/settings/marketing-targets").then((r) => r.json()).catch(() => []),
        fetch("/api/settings/users").then((r) => r.json()).catch(() => []),
      ]);
      const tList = Array.isArray(tRes) ? tRes : [];
      const uList = Array.isArray(uRes) ? uRes : [];
      setTargets(tList);
      setUsers(uList);
      setForm((f) => f.userId || !uList[0]?.id ? f : { ...f, userId: uList[0].id });
    } catch { setTargets([]); setUsers([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.userId || !form.targetValue) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        userId: form.userId,
        metric: form.metric,
        period: form.period,
        year: form.year,
        targetValue: form.targetValue,
      };
      if (form.period === "monthly") body.month = form.month;
      if (form.period === "quarterly") body.quarter = form.quarter;
      await fetch("/api/settings/marketing-targets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setForm((f) => ({ ...f, targetValue: 0 }));
      await load();
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este objetivo?")) return;
    await fetch(`/api/settings/marketing-targets/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 4 }}>
        Objetivos de Marketing
      </div>
      <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Metas cuantitativas para el equipo de marketing: leads generados, handoffs a ventas, contactos calificados y % de engagement por periodo.
      </p>

      {targets.length > 0 && (
        <div style={{ marginBottom: 14, border: "1px solid var(--mkt-border)", borderRadius: 8, overflow: "hidden" }}>
          {targets.map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid var(--mkt-border)", fontSize: 12 }}>
              <div>
                <span style={{ color: "var(--mkt-text)", fontWeight: 500 }}>{t.userName || t.userEmail}</span>
                <span style={{ color: "var(--mkt-text-muted)", marginLeft: 8 }}>
                  {METRIC_LABELS[t.metric] ?? t.metric} · {PERIOD_LABELS[t.period] ?? t.period} {t.year}
                  {t.month ? `/${String(t.month).padStart(2, "0")}` : t.quarter ? ` Q${t.quarter}` : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: ACCENT, fontWeight: 600 }}>
                  {t.targetValue}{t.metric === "engagement_rate" ? "%" : ""}
                </span>
                {canEdit && (
                  <button onClick={() => remove(t.id)} style={{ background: "transparent", border: "none", color: "var(--mkt-text-muted)", cursor: "pointer", fontSize: 14 }}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {targets.length === 0 && (
        <div style={{ padding: "16px 12px", background: "var(--mkt-bg)", borderRadius: 8, marginBottom: 14, fontSize: 12, color: "var(--mkt-text-muted)", textAlign: "center" }}>
          Sin objetivos configurados. Agrega tu primera meta debajo.
        </div>
      )}

      {canEdit && (
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 0.7fr 0.7fr auto", gap: 8, alignItems: "end" }}>
          <div>
            <span style={labelStyle}>Usuario</span>
            <select style={input} value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
          </div>
          <div>
            <span style={labelStyle}>Métrica</span>
            <select style={input} value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
              {Object.entries(METRIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <span style={labelStyle}>Periodo</span>
            <select style={input} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
              {Object.entries(PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <span style={labelStyle}>Año</span>
            <input type="number" style={input} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
          </div>
          <div>
            <span style={labelStyle}>Valor</span>
            <input type="number" style={input} value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: Number(e.target.value) })} />
          </div>
          <button style={btn("primary")} onClick={create} disabled={saving || !form.userId || !form.targetValue}>
            {saving ? "Guardando…" : "Agregar"}
          </button>
        </div>
      )}
    </div>
  );
}
