"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string; dealId: string | null; contactId: string | null;
  company: string; name: string; contractValue: number;
  startDate: string | number; endDate: string | number;
  healthScore: number; renewalStage: string; notes: string | null;
  createdAt: string | number; updatedAt: string | number;
};

function fmt(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(cents / 100);
}

function fDate(ts: string | number) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fRelative(ts: string | number) {
  const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days}d`;
}

function rColor(endTs: string | number) {
  const days = Math.ceil((new Date(endTs).getTime() - Date.now()) / 86400000);
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
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then(data => {
      setClients(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveHealth = async (id: string, raw: number) => {
    const val = Math.max(1, Math.min(10, raw || 1));
    setClients(prev => prev.map(c => c.id === id ? { ...c, healthScore: val } : c));
    setEditingId(null);
    await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ healthScore: val }),
    });
  };

  const totalValue = clients.reduce((s, c) => s + c.contractValue, 0);
  const atRisk = clients.filter(c => c.renewalStage === "En Riesgo").length;
  const renewingSoon = clients.filter(c => Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000) < 30).length;

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
        ].map(s => (
          <div key={s.label} style={{ padding: "14px 18px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
          Cargando clientes…
        </div>
      )}

      {!loading && clients.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--border)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Sin clientes activos aún</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Los clientes se crean automáticamente cuando cierras un deal como <strong>Ganado</strong> en el Pipeline.
          </div>
        </div>
      )}

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: 16 }}>
        {clients.map(c => {
          const days = Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000);
          const rc = rColor(c.endDate);
          const hc = hColor(c.healthScore);
          return (
            <div key={c.id} style={{ borderRadius: 12, padding: 20, background: "var(--card)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{c.company}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{c.name}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{fmt(c.contractValue)}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div style={{ padding: "10px 12px", borderRadius: 8, background: `${rc}0e`, border: `1px solid ${rc}28` }}>
                  <div style={{ fontSize: 10, color: rc, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 4 }}>Renovación</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: rc }}>{days < 0 ? "Venc." : `${days}d`}</div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{fDate(c.endDate)}</div>
                </div>

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
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3, cursor: "pointer" }} onClick={() => setEditingId(c.id)}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: hc }}>{c.healthScore}</span>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>/10</span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)", marginLeft: 3 }}>✎</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: `${rc}12`, color: rc, border: `1px solid ${rc}22` }}>
                  {c.renewalStage}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted-foreground)" }}>
                <span>Inicio: {fDate(c.startDate)}</span>
                <span>Actualizado: {fRelative(c.updatedAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
