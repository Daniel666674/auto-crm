"use client";

import { useState } from "react";

type RadarItem = { id: string; name: string; company: string; tier: number; reengageDate: number; reason: string; trigger: string };

const SEED: RadarItem[] = [
  { id: "r1", name: "Roberto Sánchez", company: "Tienda en Línea SA", tier: 3, reengageDate: Date.now() - 2 * 86400000, reason: "Sin presupuesto Q1", trigger: "Inicio de Q2 / nuevo presupuesto" },
  { id: "r2", name: "Diego Flores", company: "LogiMex", tier: 3, reengageDate: Date.now() + 5 * 86400000, reason: "No tiene autorización interna", trigger: "Cambio de directivo o aprobación de junta" },
  { id: "r3", name: "Sofía Ramírez", company: "Dental Premium", tier: 2, reengageDate: Date.now(), reason: "Esperando resultado de otra solución", trigger: "Vencimiento de contrato con competidor" },
  { id: "r4", name: "Carlos Rodríguez", company: "Inmobiliaria Rodríguez", tier: 1, reengageDate: Date.now() + 15 * 86400000, reason: "Timing: cierre de mes muy ocupado", trigger: "Inicio de mes / apertura de nuevas sucursales" },
];

function fDate(ts: number) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: `${color}18`, color }}>{text}</span>;
}

const emptyForm = { name: "", company: "", tier: 2, reason: "", trigger: "", reengageDate: "" };

export default function RadarPage() {
  const [items, setItems] = useState<RadarItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const now = Date.now();
  const isAlert = (ts: number) => ts <= now + 86400000;

  const sorted = [...items].sort((a, b) => a.reengageDate - b.reengageDate);
  const alertItems = sorted.filter(i => isAlert(i.reengageDate));
  const upcoming = sorted.filter(i => !isAlert(i.reengageDate));

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const addItem = () => {
    if (!form.name.trim()) return;
    const ts = form.reengageDate ? new Date(form.reengageDate).getTime() : now + 30 * 86400000;
    setItems(prev => [{ ...form, id: `r${Date.now()}`, tier: Number(form.tier), reengageDate: ts }, ...prev]);
    setForm(emptyForm);
    setShowAdd(false);
  };

  const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13 };

  function ItemCard({ item }: { item: RadarItem }) {
    const alert = isAlert(item.reengageDate);
    const daysUntil = Math.ceil((item.reengageDate - now) / 86400000);
    return (
      <div style={{ borderRadius: 10, padding: 16, background: "var(--card)", border: "1px solid var(--border)", borderLeft: `3px solid ${alert ? "#ef4444" : "var(--border)"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" as const }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "rgba(209,156,21,0.1)", color: "var(--primary)" }}>T{item.tier}</span>
              {alert && <Badge text={daysUntil <= 0 ? "⚡ Vencido" : "Hoy"} color="#ef4444" />}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 10 }}>{item.company}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 3 }}>Razón no listo</div>
                <div style={{ fontSize: 12 }}>{item.reason}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 3 }}>Disparador</div>
                <div style={{ fontSize: 12 }}>{item.trigger}</div>
              </div>
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Radar — Watchlist</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Tier 1 no listos todavía · Alertas automáticas por fecha de re-enganche</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Agregar al radar
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 480, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Agregar al Radar</div>
            {([["Nombre del contacto", "name"], ["Empresa", "company"], ["Razón por la que no está listo", "reason"], ["Disparador para re-enganchar", "trigger"]] as const).map(([label, key]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>{label}</label>
                <input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Fecha de re-enganche</label>
              <input type="date" value={form.reengageDate} onChange={e => setForm(p => ({ ...p, reengageDate: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowAdd(false)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={addItem}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert items */}
      {alertItems.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 12 }}>
            ⚡ Requieren atención hoy ({alertItems.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alertItems.map(i => <ItemCard key={i.id} item={i} />)}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 12 }}>
            Próximos ({upcoming.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map(i => <ItemCard key={i.id} item={i} />)}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted-foreground)" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📡</div>
          <div style={{ fontSize: 13 }}>El radar está vacío. Agrega contactos que no estén listos todavía.</div>
        </div>
      )}
    </div>
  );
}
