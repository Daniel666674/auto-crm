"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, RefreshCw, Pencil, Check, X } from "lucide-react";
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

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

type Period = "mensual" | "trimestral" | "anual";

interface Target {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  period: Period;
  year: number;
  month?: number;
  quarter?: number;
  targetValue: number;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface Deal {
  id: string;
  value: number;
  status: string;
  assignedUserId?: string;
  closedAt?: number;
}

interface Props {
  currentUserId: string;
}

const PERIOD_LABELS: Record<Period, string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
};

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function periodLabel(t: Target): string {
  if (t.period === "mensual" && t.month) return `${MONTHS[t.month - 1]} ${t.year}`;
  if (t.period === "trimestral" && t.quarter) return `Q${t.quarter} ${t.year}`;
  return `${t.year}`;
}

function getActual(t: Target, deals: Deal[]): number {
  const wonDeals = deals.filter(d => {
    if (d.status !== "won") return false;
    if (d.assignedUserId && d.assignedUserId !== t.userId) return false;
    if (!d.closedAt) return false;
    const dt = new Date(d.closedAt * 1000);
    const year = dt.getFullYear();
    if (year !== t.year) return false;
    if (t.period === "mensual" && t.month) {
      return dt.getMonth() + 1 === t.month;
    }
    if (t.period === "trimestral" && t.quarter) {
      const q = Math.ceil((dt.getMonth() + 1) / 3);
      return q === t.quarter;
    }
    return true;
  });
  return wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
}

export function SalesTargetsSettings({ currentUserId }: Props) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // New target form state
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    userId: "",
    period: "mensual" as Period,
    year: currentYear,
    month: new Date().getMonth() + 1,
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    targetValue: "",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, uRes, dRes] = await Promise.all([
        fetch("/api/settings/targets"),
        fetch("/api/settings/users"),
        fetch("/api/deals"),
      ]);
      if (tRes.ok) setTargets(await tRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (dRes.ok) {
        const d = await dRes.json();
        setDeals(Array.isArray(d) ? d : (d.deals || []));
      }
    } catch {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId) { toast.error("Selecciona un usuario"); return; }
    if (!form.targetValue || isNaN(Number(form.targetValue))) { toast.error("Ingresa un objetivo valido"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        userId: form.userId,
        period: form.period,
        year: form.year,
        targetValue: Math.round(Number(form.targetValue) * 100),
      };
      if (form.period === "mensual") body.month = form.month;
      if (form.period === "trimestral") body.quarter = form.quarter;

      const res = await fetch("/api/settings/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const created: Target = await res.json();
      setTargets(prev => [...prev, created]);
      setShowForm(false);
      setForm({ userId: "", period: "mensual", year: currentYear, month: new Date().getMonth() + 1, quarter: Math.ceil((new Date().getMonth() + 1) / 3), targetValue: "" });
      toast.success("Objetivo creado");
    } catch {
      toast.error("Error al crear objetivo");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (t: Target) => {
    if (!editValue || isNaN(Number(editValue))) { toast.error("Valor invalido"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/targets/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetValue: Math.round(Number(editValue) * 100) }),
      });
      if (!res.ok) throw new Error();
      setTargets(prev => prev.map(x => x.id === t.id ? { ...x, targetValue: Math.round(Number(editValue) * 100) } : x));
      setEditingId(null);
      toast.success("Objetivo actualizado");
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: Target) => {
    if (!confirm(`¿Eliminar objetivo de ${t.userName}?`)) return;
    setDeleting(t.id);
    try {
      const res = await fetch(`/api/settings/targets/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTargets(prev => prev.filter(x => x.id !== t.id));
      toast.success("Objetivo eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Objetivos de Venta</h3>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            {targets.length} objetivo{targets.length !== 1 ? "s" : ""} configurado{targets.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchAll} style={S.btn("ghost")} disabled={loading}>
            <RefreshCw size={14} style={{ ...(loading ? { animation: "spin 1s linear infinite" } : {}) }} />
          </button>
          <button onClick={() => setShowForm(v => !v)} style={S.btn("primary")}>
            <Plus size={14} /> Agregar objetivo
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ ...S.card, background: "rgba(195,154,76,0.04)", borderColor: "rgba(195,154,76,0.2)" }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 16px" }}>Nuevo objetivo</h4>
          <form onSubmit={handleAdd}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <span style={S.label}>Usuario</span>
                <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} style={S.input}>
                  <option value="">Seleccionar...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <span style={S.label}>Periodo</span>
                <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value as Period }))} style={S.input}>
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div>
                <span style={S.label}>Año</span>
                <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} style={S.input} min={2020} max={2099} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {form.period === "mensual" && (
                <div>
                  <span style={S.label}>Mes</span>
                  <select value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))} style={S.input}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              )}
              {form.period === "trimestral" && (
                <div>
                  <span style={S.label}>Trimestre</span>
                  <select value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: Number(e.target.value) }))} style={S.input}>
                    <option value={1}>Q1</option><option value={2}>Q2</option>
                    <option value={3}>Q3</option><option value={4}>Q4</option>
                  </select>
                </div>
              )}
              <div style={{ gridColumn: form.period === "anual" ? "1" : undefined }}>
                <span style={S.label}>Objetivo (COP)</span>
                <input type="number" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))} style={S.input} placeholder="Ej: 5000000" min={0} step={1000} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving} style={S.btn("primary")}>
                {saving ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
                Guardar
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={S.btn("ghost")}>
                <X size={13} /> Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={S.card}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 32, color: "var(--muted-foreground)" }}>
            <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : targets.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "var(--muted-foreground)" }}>
            <p style={{ fontSize: 14, margin: 0 }}>Sin objetivos configurados</p>
            <p style={{ fontSize: 12, margin: "8px 0 0" }}>Agrega un objetivo para empezar a medir el desempeno del equipo</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Usuario", "Periodo", "Objetivo", "Progreso", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {targets.map(t => {
                  const actual = getActual(t, deals);
                  const pct = t.targetValue > 0 ? Math.min(100, Math.round((actual / t.targetValue) * 100)) : 0;
                  const isEditing = editingId === t.id;
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 500 }}>{t.userName}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{t.userEmail}</div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: "var(--muted)", color: "var(--muted-foreground)" }}>
                          {PERIOD_LABELS[t.period]}
                        </span>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{periodLabel(t)}</div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              style={{ ...S.input, width: 120 }}
                              autoFocus
                              min={0}
                            />
                            <button onClick={() => handleEditSave(t)} disabled={saving} style={{ ...S.btn("ghost"), padding: "4px 6px" }}>
                              <Check size={13} style={{ color: "#22c55e" }} />
                            </button>
                            <button onClick={() => setEditingId(null)} style={{ ...S.btn("ghost"), padding: "4px 6px" }}>
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 600 }}>{fmt(t.targetValue)}</span>
                            <button
                              onClick={() => { setEditingId(t.id); setEditValue(String(t.targetValue / 100)); }}
                              style={{ ...S.btn("ghost"), padding: "2px 4px" }}
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", minWidth: 140 }}>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>
                          {fmt(actual)} / {fmt(t.targetValue)} ({pct}%)
                        </div>
                        <div style={{ height: 6, background: "var(--muted)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#22c55e" : "#C39A4C", borderRadius: 3, transition: "width 0.3s" }} />
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          onClick={() => handleDelete(t)}
                          disabled={deleting === t.id}
                          style={{ ...S.btn("danger"), padding: "4px 8px" }}
                        >
                          {deleting === t.id ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
