"use client";

import { useState } from "react";

type Client = {
  id: string; dealId: string | null; name: string; company: string;
  contractValue: number; startDate: number; endDate: number;
  healthScore: number; renewalStage: string; openDeliverables: number;
  lastInteraction: number;
};

const CLIENTS_SEED: Client[] = [
  { id: "cl1", dealId: "d3", name: "Laura Hernández", company: "Agencia Creativa", contractValue: 45000000, startDate: Date.now() - 60*86400000, endDate: Date.now() + 305*86400000, healthScore: 8, renewalStage: "Saludable", openDeliverables: 2, lastInteraction: Date.now() - 3*86400000 },
  { id: "cl2", dealId: "d2", name: "Carlos Rodríguez", company: "Inmobiliaria Rodríguez", contractValue: 18000000, startDate: Date.now() - 200*86400000, endDate: Date.now() + 25*86400000, healthScore: 5, renewalStage: "Conversación de Renovación", openDeliverables: 4, lastInteraction: Date.now() - 10*86400000 },
  { id: "cl3", dealId: "d1", name: "María García", company: "TechStartup MX", contractValue: 25000000, startDate: Date.now() - 120*86400000, endDate: Date.now() + 50*86400000, healthScore: 7, renewalStage: "Check-in Pendiente", openDeliverables: 1, lastInteraction: Date.now() - 7*86400000 },
  { id: "cl4", dealId: "d5", name: "Ana Martínez", company: "Martínez Consultores", contractValue: 32000000, startDate: Date.now() - 30*86400000, endDate: Date.now() + 335*86400000, healthScore: 9, renewalStage: "Renovado", openDeliverables: 0, lastInteraction: Date.now() - 1*86400000 },
  { id: "cl5", dealId: null, name: "FoodTech CO", company: "FoodTech CO", contractValue: 19000000, startDate: Date.now() - 150*86400000, endDate: Date.now() + 10*86400000, healthScore: 4, renewalStage: "En Riesgo", openDeliverables: 6, lastInteraction: Date.now() - 20*86400000 },
];

function fmt(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(cents / 100);
}

function fDate(ts: number) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fRelative(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days}d`;
}

function rColor(endTs: number) {
  const days = Math.ceil((endTs - Date.now()) / 86400000);
  if (days < 30) return "#ef4444";
  if (days < 60) return "#f59e0b";
  return "#22c55e";
}

function hColor(score: number) {
  if (score >= 7) return "#22c55e";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const saveHealth = (id: string, raw: number) => {
    const val = Math.max(1, Math.min(10, raw || 1));
    setClients(prev => prev.map(c => c.id === id ? { ...c, healthScore: val } : c));
    setEditingId(null);
  };

  const totalValue = clients.reduce((s, c) => s + c.contractValue, 0);
  const atRisk = clients.filter(c => c.renewalStage === "En Riesgo").length;
  const renewingSoon = clients.filter(c => Math.ceil((c.endDate - Date.now()) / 86400000) < 30).length;
  const openDelivs = clients.reduce((s, c) => s + c.openDeliverables, 0);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Clientes Activos</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
          Contratos ganados · salud, renovación y entregables
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Contratos activos", value: clients.length, color: "var(--primary)" },
          { label: "Valor total", value: fmt(totalValue), color: "var(--primary)" },
          { label: "En riesgo", value: atRisk, color: "#ef4444" },
          { label: "Renuevan <30d", value: renewingSoon, color: "#f59e0b" },
          { label: "Entregables abiertos", value: openDelivs, color: "#3b82f6" },
        ].slice(0, 4).map(s => (
          <div key={s.label} style={{ padding: "14px 18px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: 16 }}>
        {clients.map(c => {
          const days = Math.ceil((c.endDate - Date.now()) / 86400000);
          const rc = rColor(c.endDate);
          const hc = hColor(c.healthScore);
          return (
            <div key={c.id} style={{ borderRadius: 12, padding: 20, background: "var(--card)", border: "1px solid var(--border)" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{c.company}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{c.name}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{fmt(c.contractValue)}</div>
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {/* Renewal */}
                <div style={{ padding: "10px 12px", borderRadius: 8, background: `${rc}0e`, border: `1px solid ${rc}28` }}>
                  <div style={{ fontSize: 10, color: rc, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 4 }}>Renovación</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: rc }}>
                    {days < 0 ? `Venc.` : `${days}d`}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{fDate(c.endDate)}</div>
                </div>

                {/* Health */}
                <div style={{ padding: "10px 12px", borderRadius: 8, background: `${hc}0e`, border: `1px solid ${hc}28` }}>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 4 }}>Health Score</div>
                  {editingId === c.id ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input
                        type="number" min={1} max={10} defaultValue={c.healthScore} autoFocus
                        style={{ width: 48, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 14 }}
                        onKeyDown={e => {
                          if (e.key === "Enter") saveHealth(c.id, +(e.target as HTMLInputElement).value);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={e => saveHealth(c.id, +e.target.value)}
                      />
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>/10</span>
                    </div>
                  ) : (
                    <div
                      style={{ display: "flex", alignItems: "baseline", gap: 3, cursor: "pointer" }}
                      onClick={() => setEditingId(c.id)}
                    >
                      <span style={{ fontSize: 18, fontWeight: 700, color: hc }}>{c.healthScore}</span>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>/10</span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)", marginLeft: 3 }}>✎</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stage badge */}
              <div style={{ marginBottom: 12 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                  background: `${rc}12`, color: rc, border: `1px solid ${rc}22`,
                }}>
                  {c.renewalStage}
                </span>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted-foreground)" }}>
                <span>
                  <span style={{ fontWeight: 600, color: c.openDeliverables > 0 ? "#f59e0b" : "#22c55e" }}>{c.openDeliverables}</span>
                  {" "}entregable{c.openDeliverables !== 1 ? "s" : ""}
                </span>
                <span>Contacto: {fRelative(c.lastInteraction)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
