"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const GOLD = "#D19C15";

interface RadarItem {
  id: string;
  contactName: string;
  company: string;
  tier: number;
  reason: string;
  trigger: string;
  estimatedValue: number | null;
  bantBlocking: string | null;
  nextAction: string | null;
  priority: string;
  reengageDate: number;
}

const BANT_OPTIONS = ["Budget", "Authority", "Need", "Timing"];
const PRIORITY_OPTIONS = ["high", "medium", "low"];
const PRIORITY_COLORS: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#6b7280" };

function fDate(ts: number) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtCOP(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

const emptyForm = {
  contactName: "", company: "", tier: 2, reason: "", trigger: "",
  estimatedValue: "", bantBlocking: "", nextAction: "", priority: "medium", reengageDate: "",
};

export default function RadarPage() {
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetch("/api/radar")
      .then(r => r.json())
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const isAlert = (ts: number) => ts <= now + 86400000;

  const sorted = [...items].sort((a, b) => {
    const pa = a.priority === "high" ? 0 : a.priority === "medium" ? 1 : 2;
    const pb = b.priority === "high" ? 0 : b.priority === "medium" ? 1 : 2;
    if (pa !== pb) return pa - pb;
    return a.reengageDate - b.reengageDate;
  });

  const alertItems = sorted.filter(i => isAlert(i.reengageDate));
  const upcoming = sorted.filter(i => !isAlert(i.reengageDate));

  const removeItem = async (id: string) => {
    await fetch("/api/radar", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const addItem = async () => {
    if (!form.contactName.trim() || !form.company.trim() || !form.reason.trim() || !form.trigger.trim()) return;
    setSaving(true);
    const ts = form.reengageDate ? new Date(form.reengageDate).getTime() : now + 30 * 86400000;
    const body = {
      contactName: form.contactName,
      company: form.company,
      tier: Number(form.tier),
      reason: form.reason,
      trigger: form.trigger,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue.toString().replace(/\D/g, "")) : null,
      bantBlocking: form.bantBlocking || null,
      nextAction: form.nextAction || null,
      priority: form.priority,
      reengageDate: ts,
    };
    const res = await fetch("/api/radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const row = await res.json();
      setItems(prev => [row, ...prev]);
      setForm(emptyForm);
      setShowAdd(false);
    }
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: "1px solid var(--border)", background: "var(--background)",
    color: "var(--foreground)", fontSize: 13,
  };

  function ItemCard({ item }: { item: RadarItem }) {
    const alert = isAlert(item.reengageDate);
    const daysUntil = Math.ceil((item.reengageDate - now) / 86400000);
    const pColor = PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.medium;
    return (
      <div style={{
        borderRadius: 10, padding: 16,
        background: "var(--card)", border: "1px solid var(--border)",
        borderLeft: `3px solid ${alert ? "#ef4444" : pColor}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{item.contactName}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "rgba(209,156,21,0.1)", color: GOLD }}>T{item.tier}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: `${pColor}18`, color: pColor }}>
                {item.priority.toUpperCase()}
              </span>
              {alert && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                  {daysUntil <= 0 ? "VENCIDO" : "HOY"}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 10 }}>{item.company}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Razón no listo</div>
                <div style={{ fontSize: 12 }}>{item.reason}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Disparador</div>
                <div style={{ fontSize: 12 }}>{item.trigger}</div>
              </div>
              {item.bantBlocking && (
                <div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>BANT bloqueador</div>
                  <div style={{ fontSize: 12 }}>{item.bantBlocking}</div>
                </div>
              )}
              {item.nextAction && (
                <div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Próxima acción</div>
                  <div style={{ fontSize: 12 }}>{item.nextAction}</div>
                </div>
              )}
              {item.estimatedValue && (
                <div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Valor estimado</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>{fmtCOP(item.estimatedValue)}</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 4 }}>Re-enganchar</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: alert ? "#ef4444" : "var(--foreground)" }}>{fDate(item.reengageDate)}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {daysUntil <= 0 ? `Hace ${Math.abs(daysUntil)}d` : `En ${daysUntil}d`}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => removeItem(item.id)}
            style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", fontSize: 12, cursor: "pointer" }}>
            Remover del radar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={24} style={{ color: GOLD }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Radar — Watchlist</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Prospects no listos todavía · Ordenados por prioridad y fecha de re-enganche</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Agregar al radar
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 520, maxHeight: "90vh", overflowY: "auto", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Agregar al Radar</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {([["Nombre del contacto", "contactName"], ["Empresa", "company"]] as const).map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>{label}</label>
                  <input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Tier</label>
                <select value={form.tier} onChange={e => setForm(p => ({ ...p, tier: Number(e.target.value) }))} style={inputStyle}>
                  {[1, 2, 3].map(t => <option key={t} value={t}>Tier {t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Prioridad</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} style={inputStyle}>
                  {PRIORITY_OPTIONS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
              </div>
            </div>
            {([["Razón por la que no está listo", "reason"], ["Disparador para re-enganchar", "trigger"]] as const).map(([label, key]) => (
              <div key={key} style={{ marginTop: 14 }}>
                <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>{label}</label>
                <input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>BANT bloqueador</label>
                <select value={form.bantBlocking} onChange={e => setForm(p => ({ ...p, bantBlocking: e.target.value }))} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {BANT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Valor estimado (COP)</label>
                <input type="number" value={form.estimatedValue} onChange={e => setForm(p => ({ ...p, estimatedValue: e.target.value }))} style={inputStyle} placeholder="0" />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Próxima acción</label>
              <input value={form.nextAction} onChange={e => setForm(p => ({ ...p, nextAction: e.target.value }))} style={inputStyle} placeholder="Ej: Llamar en Q2, enviar propuesta..." />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Fecha de re-enganche</label>
              <input type="date" value={form.reengageDate} onChange={e => setForm(p => ({ ...p, reengageDate: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowAdd(false)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={addItem} disabled={saving}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertItems.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Requieren atención hoy ({alertItems.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alertItems.map(i => <ItemCard key={i.id} item={i} />)}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Próximos ({upcoming.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map(i => <ItemCard key={i.id} item={i} />)}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted-foreground)" }}>
          <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.5 }}>&#x25c9;</div>
          <div style={{ fontSize: 13 }}>El radar está vacío. Agrega prospects que no estén listos todavía.</div>
        </div>
      )}
    </div>
  );
}
