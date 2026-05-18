"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string; company: string; name: string; contractValue: number;
  endDate: string | number; healthScore: number; renewalStage: string;
};

const STAGES = ["Saludable", "Check-in Pendiente", "Conversación de Renovación", "Renovado", "Expandido", "En Riesgo"];

const STAGE_COLOR: Record<string, string> = {
  "Saludable": "#22c55e",
  "Check-in Pendiente": "#f59e0b",
  "Conversación de Renovación": "#3b82f6",
  "Renovado": "#22c55e",
  "Expandido": "#a855f7",
  "En Riesgo": "#ef4444",
};

function fmt(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(cents / 100);
}

export default function RenewalsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then(data => {
      setClients(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverStage(stage);
  };

  const handleDrop = async (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (!dragId) return;
    setClients(prev => prev.map(c => c.id === dragId ? { ...c, renewalStage: stage } : c));
    setDragId(null);
    setOverStage(null);
    await fetch(`/api/clients/${dragId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renewalStage: stage }),
    });
  };

  const handleDragEnd = () => { setDragId(null); setOverStage(null); };

  const totalByStage = (stage: string) =>
    clients.filter(c => c.renewalStage === stage).reduce((s, c) => s + c.contractValue, 0);

  return (
    <div style={{ padding: "28px 32px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Renovaciones</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
          Kanban de renovaciones · arrastra las tarjetas entre etapas
        </p>
      </div>

      {loading && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
          Cargando…
        </div>
      )}

      {!loading && clients.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--border)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Sin clientes aún</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Los clientes aparecen aquí al cerrar deals como <strong>Ganado</strong> en el Pipeline.
          </div>
        </div>
      )}

      {!loading && clients.length > 0 && (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
          {STAGES.map(stage => {
            const items = clients.filter(c => c.renewalStage === stage);
            const color = STAGE_COLOR[stage] || "var(--muted-foreground)";
            const isOver = overStage === stage;

            return (
              <div
                key={stage}
                style={{ minWidth: 220, maxWidth: 240, flexShrink: 0 }}
                onDragOver={e => handleDragOver(e, stage)}
                onDrop={e => handleDrop(e, stage)}
              >
                <div style={{
                  borderRadius: "10px 10px 0 0", padding: "10px 14px",
                  borderBottom: `2px solid ${color}`,
                  background: `${color}0a`, marginBottom: 8,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {stage}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {items.length} cliente{items.length !== 1 ? "s" : ""}
                    </span>
                    {items.length > 0 && (
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        {fmt(totalByStage(stage))}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{
                  minHeight: 140, padding: "4px 0", borderRadius: 8,
                  background: isOver ? "rgba(209,156,21,0.04)" : "transparent",
                  border: isOver ? "1px dashed rgba(209,156,21,0.35)" : "1px dashed transparent",
                  transition: "all 0.12s",
                }}>
                  {items.length === 0 && (
                    <div style={{ textAlign: "center", padding: "28px 12px", fontSize: 12, color: "var(--muted-foreground)", opacity: 0.4 }}>
                      Arrastra aquí
                    </div>
                  )}

                  {items.map(c => {
                    const days = Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000);
                    const dColor = days < 30 ? "#ef4444" : days < 60 ? "#f59e0b" : "#22c55e";
                    const hc = c.healthScore >= 7 ? "#22c55e" : c.healthScore >= 4 ? "#f59e0b" : "#ef4444";

                    return (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={e => handleDragStart(e, c.id)}
                        onDragEnd={handleDragEnd}
                        style={{
                          borderRadius: 8, padding: 12, marginBottom: 8,
                          background: "var(--card)", border: "1px solid var(--border)",
                          cursor: "grab", opacity: dragId === c.id ? 0.4 : 1,
                          transition: "opacity 0.15s", userSelect: "none",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{c.company}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 10 }}>
                          {fmt(c.contractValue)}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: dColor, fontWeight: 600 }}>
                            {days < 0 ? "Vencido" : `${days}d`}
                          </span>
                          <span style={{ fontSize: 11, color: hc, fontWeight: 600 }}>
                            ♥ {c.healthScore}/10
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
