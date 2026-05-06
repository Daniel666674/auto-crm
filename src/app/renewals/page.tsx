"use client";

import { useState } from "react";

type Client = {
  id: string; name: string; company: string; contractValue: number;
  endDate: number; healthScore: number; renewalStage: string;
};

const CLIENTS_SEED: Client[] = [
  { id: "cl1", name: "Laura Hernández", company: "Agencia Creativa", contractValue: 45000000, endDate: Date.now() + 305*86400000, healthScore: 8, renewalStage: "Saludable" },
  { id: "cl2", name: "Carlos Rodríguez", company: "Inmobiliaria Rodríguez", contractValue: 18000000, endDate: Date.now() + 25*86400000, healthScore: 5, renewalStage: "Conversación de Renovación" },
  { id: "cl3", name: "María García", company: "TechStartup MX", contractValue: 25000000, endDate: Date.now() + 50*86400000, healthScore: 7, renewalStage: "Check-in Pendiente" },
  { id: "cl4", name: "Ana Martínez", company: "Martínez Consultores", contractValue: 32000000, endDate: Date.now() + 335*86400000, healthScore: 9, renewalStage: "Renovado" },
  { id: "cl5", name: "FoodTech CO", company: "FoodTech CO", contractValue: 19000000, endDate: Date.now() + 10*86400000, healthScore: 4, renewalStage: "En Riesgo" },
];

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
  const [clients, setClients] = useState<Client[]>(CLIENTS_SEED);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverStage(stage);
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (dragId) setClients(prev => prev.map(c => c.id === dragId ? { ...c, renewalStage: stage } : c));
    setDragId(null);
    setOverStage(null);
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
              {/* Column header */}
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
                      {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(totalByStage(stage) / 100)}
                    </span>
                  )}
                </div>
              </div>

              {/* Drop zone */}
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
                  const days = Math.ceil((c.endDate - Date.now()) / 86400000);
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
                        transition: "opacity 0.15s",
                        userSelect: "none",
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
    </div>
  );
}
