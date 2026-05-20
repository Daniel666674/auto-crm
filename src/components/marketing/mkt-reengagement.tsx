"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BSLoading } from "../ui/BSLoading";

interface ReengagementContact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  score: number;
  temperature: string;
  lifecycleStage?: string | null;
  returnedToMarketingAt: string | null;
  returnedToMarketingReason: string | null;
  updatedAt: string;
}

const TEMP_LABEL: Record<string, { label: string; color: string }> = {
  hot:  { label: "Caliente", color: "#ef4444" },
  warm: { label: "Tibio",    color: "#f59e0b" },
  cold: { label: "Frío",     color: "#94a3b8" },
};

const LIFECYCLE_COLOR: Record<string, string> = {
  subscriber: "#94a3b8", lead: "#60a5fa", MQL: "#a78bfa",
  SQL: "#f59e0b", opportunity: "#f97316", customer: "#22c55e", evangelist: "#ec4899",
};

export function MktReengagement() {
  const [contacts, setContacts] = useState<ReengagementContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts?includeReturned=true");
      const data = await res.json();
      const returned: ReengagementContact[] = Array.isArray(data)
        ? data.filter((c: ReengagementContact) => c.returnedToMarketingAt)
        : [];
      returned.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      setContacts(returned);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function reHandoff(c: ReengagementContact) {
    setActionId(c.id);
    await fetch("/api/handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: c.name, email: c.email, company: c.company, score: c.score }),
    });
    setActionId(null);
    load();
  }

  async function dismissContact(id: string) {
    if (!confirm("¿Marcar como descartado? Se eliminará de la cola.")) return;
    setActionId(id);
    await fetch(`/api/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lifecycleStage: "subscriber" }),
    });
    setActionId(null);
    load();
  }

  const filtered = filter === "all" ? contacts : contacts.filter(c => c.temperature === filter);

  const cell: React.CSSProperties = {
    padding: "10px 12px", fontSize: 12, borderBottom: "1px solid var(--mkt-border)", verticalAlign: "middle",
  };
  const hcell: React.CSSProperties = {
    ...cell, fontSize: 10, color: "var(--mkt-text-muted)", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--mkt-surface)",
  };
  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
    border: "1px solid var(--mkt-border)",
    background: active ? "var(--mkt-accent)" : "transparent",
    color: active ? "#0a0a0a" : "var(--mkt-text-muted)",
    transition: "all 0.12s",
  });

  const daysSince = (iso: string | null): number => {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--mkt-text)", margin: "0 0 4px" }}>
            Cola de Re-engagement
          </h2>
          <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", margin: 0, lineHeight: 1.5 }}>
            Contactos devueltos desde ventas. Re-envíalos a Sales cuando estén listos, o nutre desde marketing.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>Filtrar:</span>
          {([["all", "Todos"], ["hot", "Calientes"], ["warm", "Tibios"], ["cold", "Fríos"]] as const).map(([v, l]) => (
            <button key={v} style={tabBtn(filter === v)} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { label: "En cola", value: contacts.length, color: "var(--mkt-text)" },
          { label: "Calientes", value: contacts.filter(c => c.temperature === "hot").length, color: "#ef4444" },
          { label: "Tibios",    value: contacts.filter(c => c.temperature === "warm").length, color: "#f59e0b" },
          { label: "Fríos",     value: contacts.filter(c => c.temperature === "cold").length, color: "#94a3b8" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: "8px 14px", borderRadius: 8, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", fontSize: 12 }}>
            <span style={{ color: "var(--mkt-text-muted)" }}>{label} </span>
            <span style={{ fontWeight: 700, color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <BSLoading label="Cargando contactos…" />
      ) : filtered.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--mkt-text-muted)", borderRadius: 10, border: "1px dashed var(--mkt-border)" }}>
          {contacts.length === 0 ? "No hay contactos en la cola. ¡Todo en orden!" : "Sin resultados para el filtro seleccionado."}
        </div>
      ) : (
        <div style={{ borderRadius: 10, border: "1px solid var(--mkt-border)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead>
              <tr>
                {["Nombre", "Empresa", "Score", "Temperatura", "Lifecycle", "Motivo devuelto", "Días en cola", "Acciones"].map(h => (
                  <th key={h} style={hcell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const temp = TEMP_LABEL[c.temperature] ?? TEMP_LABEL.cold;
                const days = daysSince(c.returnedToMarketingAt);
                const urgent = days > 30;
                const lcColor = LIFECYCLE_COLOR[c.lifecycleStage ?? "lead"] ?? "#60a5fa";
                return (
                  <tr
                    key={c.id}
                    style={{ background: i % 2 === 0 ? "transparent" : "var(--mkt-surface)" }}
                  >
                    <td style={cell}>
                      <div style={{ fontWeight: 600, color: "var(--mkt-text)" }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>{c.email || "—"}</div>
                    </td>
                    <td style={cell}>
                      <span style={{ color: "var(--mkt-text)" }}>{c.company || "—"}</span>
                    </td>
                    <td style={cell}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--mkt-border)", overflow: "hidden" }}>
                          <div style={{ height: "100%", background: "var(--mkt-accent)", width: `${Math.min(c.score ?? 0, 100)}%` }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--mkt-text)" }}>{c.score}</span>
                      </div>
                    </td>
                    <td style={cell}>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: `${temp.color}18`, color: temp.color }}>
                        {temp.label}
                      </span>
                    </td>
                    <td style={cell}>
                      <span style={{ padding: "2px 7px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: `${lcColor}18`, color: lcColor }}>
                        {c.lifecycleStage ?? "lead"}
                      </span>
                    </td>
                    <td style={{ ...cell, maxWidth: 220 }}>
                      <span style={{ fontSize: 11, color: "var(--mkt-text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                        {c.returnedToMarketingReason || "Sin motivo especificado"}
                      </span>
                    </td>
                    <td style={cell}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: urgent ? "#ef4444" : "var(--mkt-text-muted)" }}>
                        {days}d {urgent ? "⚠" : ""}
                      </span>
                    </td>
                    <td style={cell}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          disabled={actionId === c.id}
                          onClick={() => reHandoff(c)}
                          style={{ padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600, border: "1px solid #22c55e", background: "transparent", color: "#22c55e", cursor: actionId === c.id ? "not-allowed" : "pointer", opacity: actionId === c.id ? 0.5 : 1 }}
                        >
                          {actionId === c.id ? "…" : "→ Sales"}
                        </button>
                        <button
                          disabled={actionId === c.id}
                          onClick={() => dismissContact(c.id)}
                          style={{ padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", cursor: actionId === c.id ? "not-allowed" : "pointer" }}
                        >
                          Descartar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: 11, color: "var(--mkt-text-muted)", margin: 0 }}>
        {filtered.length} de {contacts.length} contactos en cola
      </p>
    </div>
  );
}
