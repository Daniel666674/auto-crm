"use client";

import { useEffect, useState } from "react";

const GOLD = "#D19C15";
const GOLD_TEXT = "#0a0a09";

type ProposalStatus = "Borrador" | "Enviada" | "Vista" | "Aceptada" | "Rechazada";

interface Proposal {
  id: string; dealId: string | null;
  contactName: string; dealTitle: string;
  value: number; status: ProposalStatus;
  sentDate: string | number | null; notes: string | null;
  createdAt: string | number;
}

const STAGES: ProposalStatus[] = ["Borrador", "Enviada", "Vista", "Aceptada", "Rechazada"];

const STAGE_COLOR: Record<ProposalStatus, string> = {
  Borrador: "#7a756e", Enviada: "#3b82f6", Vista: "#f59e0b",
  Aceptada: "#22c55e", Rechazada: "#ef4444",
};

function fmtVal(v: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v / 100);
}

const EMPTY_FORM = { dealTitle: "", contactName: "", value: "", notes: "" };

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<ProposalStatus | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    fetch("/api/proposals").then(r => r.json()).then(data => {
      setProposals(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const byStage = (stage: ProposalStatus) => proposals.filter(p => p.status === stage);
  const totalAccepted = proposals.filter(p => p.status === "Aceptada").reduce((s, p) => s + p.value, 0);
  const acceptedCount = proposals.filter(p => p.status === "Aceptada").length;

  const handleDrop = async (stage: ProposalStatus) => {
    if (!dragId) return;
    const prev = proposals.find(p => p.id === dragId);
    const sentDate = prev && stage !== "Borrador" && !prev.sentDate ? new Date().toISOString() : prev?.sentDate ?? null;
    setProposals(all => all.map(p => p.id !== dragId ? p : { ...p, status: stage, sentDate }));
    setDragId(null);
    setDragOverStage(null);
    await fetch(`/api/proposals/${dragId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: stage, sentDate }),
    });
  };

  const addProposal = async () => {
    if (!form.dealTitle) return;
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealTitle: form.dealTitle,
        contactName: form.contactName,
        value: parseInt(form.value.replace(/\D/g, "")) || 0,
        notes: form.notes || null,
        status: "Borrador",
      }),
    });
    if (res.ok) {
      const newProp = await res.json();
      setProposals(prev => [newProp, ...prev]);
      setForm(EMPTY_FORM);
      setShowNew(false);
    }
  };

  const deleteProposal = async (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
    await fetch(`/api/proposals/${id}`, { method: "DELETE" });
  };

  const daysOpen = (p: Proposal) =>
    p.sentDate ? Math.floor((Date.now() - new Date(p.sentDate).getTime()) / 86400000) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Propuestas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {acceptedCount} aceptadas · {fmtVal(totalAccepted)} en contratos firmados
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

      {loading && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Cargando…</div>}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div className="w-[460px] rounded-2xl border p-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="text-base font-bold mb-5">Nueva Propuesta</div>
            {(["dealTitle", "contactName"] as const).map(key => (
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
              <label className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>Valor (centavos MXN)</label>
              <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                placeholder="ej. 2500000 = $25,000"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
            </div>
            <div className="mb-5">
              <label className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>Notas</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 rounded-lg text-sm"
                style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted-foreground)", cursor: "pointer" }}>Cancelar</button>
              <button onClick={addProposal} className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: GOLD, color: GOLD_TEXT, border: "none", cursor: "pointer" }}>Crear Propuesta</button>
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {STAGES.map(stage => {
            const stageItems = byStage(stage);
            const color = STAGE_COLOR[stage];
            const isOver = dragOverStage === stage;
            return (
              <div key={stage} className="flex-shrink-0" style={{ minWidth: 220 }}
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => handleDrop(stage)}>
                <div className="rounded-t-xl px-3.5 py-2.5 mb-2"
                  style={{ borderBottom: `2px solid ${color}`, background: `${color}10` }}>
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{stage}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {stageItems.length} propuesta{stageItems.length !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="min-h-24 rounded-lg p-1 transition-all duration-150"
                  style={{ background: isOver ? "rgba(209,156,21,0.04)" : "transparent", border: isOver ? "1px dashed rgba(209,156,21,0.3)" : "1px dashed transparent" }}>
                  {stageItems.length === 0 && (
                    <div className="text-center py-6 text-[11px] opacity-40" style={{ color: "var(--muted-foreground)" }}>Arrastra aquí</div>
                  )}
                  {stageItems.map(prop => {
                    const open = daysOpen(prop);
                    return (
                      <div key={prop.id} draggable
                        onDragStart={e => { setDragId(prop.id); e.dataTransfer.effectAllowed = "move"; }}
                        onDragEnd={() => { setDragId(null); setDragOverStage(null); }}
                        className="rounded-lg p-3 mb-2 border"
                        style={{ background: "var(--card)", borderColor: "var(--border)", cursor: "grab", opacity: dragId === prop.id ? 0.35 : 1, transition: "opacity 0.15s" }}>
                        <div className="text-xs font-bold mb-0.5 leading-snug">{prop.dealTitle}</div>
                        <div className="text-[11px] mb-2" style={{ color: "var(--muted-foreground)" }}>{prop.contactName}</div>
                        <div className="text-sm font-bold" style={{ color: GOLD }}>{fmtVal(prop.value)}</div>
                        {prop.notes && (
                          <div className="text-[11px] mt-2 pt-2 leading-snug"
                            style={{ color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}>
                            {prop.notes}
                          </div>
                        )}
                        {open !== null && (
                          <div className="mt-2 text-[10px]" style={{ color: open > 14 ? "#ef4444" : "var(--muted-foreground)" }}>
                            {open === 0 ? "Enviada hoy" : `${open}d abierta`}
                          </div>
                        )}
                        <button onClick={() => deleteProposal(prop.id)}
                          style={{ marginTop: 8, fontSize: 10, color: "var(--muted-foreground)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                          Eliminar
                        </button>
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
