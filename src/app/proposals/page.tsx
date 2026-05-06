"use client";

import { useState } from "react";

const GOLD = "#D19C15";
const GOLD_TEXT = "#0a0a09";

interface Proposal {
  id: string;
  dealTitle: string;
  contact: string;
  value: number;
  status: ProposalStatus;
  sentDate: number | null;
  notes: string;
}

type ProposalStatus = "Borrador" | "Enviada" | "Vista" | "Aceptada" | "Rechazada";

const STAGES: ProposalStatus[] = ["Borrador", "Enviada", "Vista", "Aceptada", "Rechazada"];

const STAGE_COLOR: Record<ProposalStatus, string> = {
  Borrador: "#7a756e",
  Enviada: "#3b82f6",
  Vista: "#f59e0b",
  Aceptada: "#22c55e",
  Rechazada: "#ef4444",
};

const SEED: Proposal[] = [
  { id: "p1", dealTitle: "Plan Empresarial - TechStartup", contact: "María García", value: 25000000, status: "Vista", sentDate: Date.now() - 3 * 86400000, notes: "Revisando con su equipo técnico" },
  { id: "p2", dealTitle: "CRM Inmobiliaria Rodríguez", contact: "Carlos Rodríguez", value: 18000000, status: "Enviada", sentDate: Date.now() - 6 * 86400000, notes: "Esperando respuesta" },
  { id: "p3", dealTitle: "Suite Premium - Agencia Creativa", contact: "Laura Hernández", value: 45000000, status: "Aceptada", sentDate: Date.now() - 12 * 86400000, notes: "Contrato en proceso de firma" },
  { id: "p4", dealTitle: "Paquete Básico - Dental Premium", contact: "Sofía Ramírez", value: 7500000, status: "Borrador", sentDate: null, notes: "Pendiente de ajustar precios" },
  { id: "p5", dealTitle: "Consultoría RRHH - Martínez", contact: "Ana Martínez", value: 32000000, status: "Rechazada", sentDate: Date.now() - 20 * 86400000, notes: "Precio fuera de presupuesto. Seguir en nurturing." },
];

function fmtCOP(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

const EMPTY_FORM = { dealTitle: "", contact: "", value: "", notes: "" };

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>(SEED);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<ProposalStatus | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const byStage = (stage: ProposalStatus) => proposals.filter(p => p.status === stage);
  const totalAccepted = proposals.filter(p => p.status === "Aceptada").reduce((s, p) => s + p.value, 0);
  const acceptedCount = proposals.filter(p => p.status === "Aceptada").length;

  const handleDrop = (stage: ProposalStatus) => {
    if (!dragId) return;
    setProposals(prev => prev.map(p => {
      if (p.id !== dragId) return p;
      const sentDate = stage !== "Borrador" && !p.sentDate ? Date.now() : p.sentDate;
      return { ...p, status: stage, sentDate };
    }));
    setDragId(null);
    setDragOverStage(null);
  };

  const addProposal = () => {
    if (!form.dealTitle || !form.contact) return;
    const newProp: Proposal = {
      id: `p${Date.now()}`,
      dealTitle: form.dealTitle,
      contact: form.contact,
      value: parseInt(form.value.replace(/\D/g, "")) || 0,
      status: "Borrador",
      sentDate: null,
      notes: form.notes,
    };
    setProposals(prev => [newProp, ...prev]);
    setForm(EMPTY_FORM);
    setShowNew(false);
  };

  const daysOpen = (p: Proposal) =>
    p.sentDate ? Math.floor((Date.now() - p.sentDate) / 86400000) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Propuestas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {acceptedCount} aceptadas · {fmtCOP(totalAccepted)} en contratos firmados
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="text-sm font-semibold px-4 py-2 rounded-lg"
          style={{ background: GOLD, color: GOLD_TEXT, border: "none", cursor: "pointer" }}
        >
          + Nueva propuesta
        </button>
      </div>

      {/* New proposal modal */}
      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}
        >
          <div className="w-[460px] rounded-2xl border p-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="text-base font-bold mb-5">Nueva Propuesta</div>
            {(["dealTitle", "contact"] as const).map(key => (
              <div key={key} className="mb-4">
                <label className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                  {key === "dealTitle" ? "Nombre del deal / proyecto" : "Contacto"}
                </label>
                <input
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                />
              </div>
            ))}
            <div className="mb-4">
              <label className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>Valor COP</label>
              <input
                type="number"
                value={form.value}
                onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                placeholder="ej. 25000000"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
            </div>
            <div className="mb-5">
              <label className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>Notas</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowNew(false)}
                className="flex-1 py-2.5 rounded-lg text-sm"
                style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted-foreground)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={addProposal}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: GOLD, color: GOLD_TEXT, border: "none", cursor: "pointer" }}
              >
                Crear Propuesta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {STAGES.map(stage => {
          const items = byStage(stage);
          const color = STAGE_COLOR[stage];
          const isOver = dragOverStage === stage;
          return (
            <div
              key={stage}
              className="flex-shrink-0"
              style={{ minWidth: 220 }}
              onDragOver={e => { e.preventDefault(); setDragOverStage(stage); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={() => handleDrop(stage)}
            >
              {/* Column header */}
              <div
                className="rounded-t-xl px-3.5 py-2.5 mb-2"
                style={{ borderBottom: `2px solid ${color}`, background: `${color}10` }}
              >
                <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                  {stage}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {items.length} propuesta{items.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Drop zone */}
              <div
                className="min-h-24 rounded-lg p-1 transition-all duration-150"
                style={{
                  background: isOver ? "rgba(209,156,21,0.04)" : "transparent",
                  border: isOver ? "1px dashed rgba(209,156,21,0.3)" : "1px dashed transparent",
                }}
              >
                {items.length === 0 && (
                  <div className="text-center py-6 text-[11px] opacity-40" style={{ color: "var(--muted-foreground)" }}>
                    Arrastra aquí
                  </div>
                )}
                {items.map(prop => {
                  const open = daysOpen(prop);
                  return (
                    <div
                      key={prop.id}
                      draggable
                      onDragStart={e => { setDragId(prop.id); e.dataTransfer.effectAllowed = "move"; }}
                      onDragEnd={() => { setDragId(null); setDragOverStage(null); }}
                      className="rounded-lg p-3 mb-2 border"
                      style={{
                        background: "var(--card)",
                        borderColor: "var(--border)",
                        cursor: "grab",
                        opacity: dragId === prop.id ? 0.35 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      <div className="text-xs font-bold mb-0.5 leading-snug">{prop.dealTitle}</div>
                      <div className="text-[11px] mb-2" style={{ color: "var(--muted-foreground)" }}>{prop.contact}</div>
                      <div className="text-sm font-bold" style={{ color: GOLD }}>
                        {fmtCOP(prop.value)}
                      </div>
                      {prop.notes && (
                        <div
                          className="text-[11px] mt-2 pt-2 leading-snug"
                          style={{ color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}
                        >
                          {prop.notes}
                        </div>
                      )}
                      {open !== null && (
                        <div
                          className="mt-2 text-[10px]"
                          style={{ color: open > 14 ? "#ef4444" : "var(--muted-foreground)" }}
                        >
                          {open === 0 ? "Enviada hoy" : `${open}d abierta`}
                        </div>
                      )}
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
