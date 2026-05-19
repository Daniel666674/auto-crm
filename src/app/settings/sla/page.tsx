"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SLAConfig {
  version: number;
  mqlResponseHours: number;
  formQualificationHours: number;
  maxReturnsPerMonth: number;
  allowedReturnReasons: string[];
  lastAcceptedBySalesAt: string | null;
  lastAcceptedByMarketingAt: string | null;
  updatedAt: string;
}

const DEFAULT_REASONS = [
  "No es buen fit", "Mal timing", "Necesita educación",
  "Duplicado", "Sin presupuesto",
];

function fmt(iso: string | null) {
  if (!iso) return "Pendiente";
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

export default function SLAPage() {
  const router = useRouter();
  const [sla, setSla] = useState<SLAConfig | null>(null);
  const [history, setHistory] = useState<SLAConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState<"sales" | "marketing" | null>(null);
  const [newReason, setNewReason] = useState("");

  useEffect(() => {
    fetch("/api/sla").then(r => r.json()).then(d => {
      setSla(d.sla);
      setHistory(d.history ?? []);
    });
  }, []);

  const save = async () => {
    if (!sla) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sla", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sla),
      });
      const d = await res.json();
      setSla(d.sla);
      toast.success(`SLA guardado — versión ${d.sla.version}`);
    } catch { toast.error("Error al guardar"); }
    setSaving(false);
  };

  const accept = async (role: "sales" | "marketing") => {
    setAccepting(role);
    try {
      const res = await fetch("/api/sla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const d = await res.json();
      setSla(d.sla);
      toast.success(role === "sales" ? "Ventas aceptó el SLA" : "Marketing aceptó el SLA");
    } catch { toast.error("Error"); }
    setAccepting(null);
  };

  const card: React.CSSProperties = {
    borderRadius: 12, padding: "20px 24px",
    background: "var(--card)", border: "1px solid var(--border)",
    marginBottom: 20,
  };
  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 8, display: "block",
  };
  const input: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid var(--border)", background: "var(--input)",
    color: "var(--foreground)", fontSize: 13, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
  };

  if (!sla) return (
    <div style={{ padding: 32, color: "var(--muted-foreground)" }}>Cargando SLA…</div>
  );

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
      <button
        onClick={() => router.push("/settings")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8, marginBottom: 20,
          border: "1px solid var(--border)", background: "var(--card)",
          fontSize: 12, color: "var(--muted-foreground)", cursor: "pointer",
        }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Ajustes
      </button>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Acuerdo de Nivel de Servicio M+S
        </h1>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          Versión {sla.version} · Actualizado {fmt(sla.updatedAt)}
        </div>
      </div>

      {/* Acceptance status */}
      <div style={{ ...card, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <AcceptCard
          role="Ventas"
          acceptedAt={sla.lastAcceptedBySalesAt}
          loading={accepting === "sales"}
          onAccept={() => accept("sales")}
        />
        <AcceptCard
          role="Marketing"
          acceptedAt={sla.lastAcceptedByMarketingAt}
          loading={accepting === "marketing"}
          onAccept={() => accept("marketing")}
        />
      </div>

      {/* SLA fields */}
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>Tiempos de respuesta</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <span style={label}>Respuesta a MQL (horas)</span>
            <input style={input} type="number" min={1} value={sla.mqlResponseHours}
              onChange={e => setSla({ ...sla, mqlResponseHours: Number(e.target.value) })} />
          </div>
          <div>
            <span style={label}>Calificación formulario (horas)</span>
            <input style={input} type="number" min={1} value={sla.formQualificationHours}
              onChange={e => setSla({ ...sla, formQualificationHours: Number(e.target.value) })} />
          </div>
          <div>
            <span style={label}>Máx. retornos por mes</span>
            <input style={input} type="number" min={1} value={sla.maxReturnsPerMonth}
              onChange={e => setSla({ ...sla, maxReturnsPerMonth: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      {/* Return reasons */}
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Razones permitidas de retorno</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {sla.allowedReturnReasons.map(r => (
            <span key={r} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(209,156,21,0.1)", border: "1px solid rgba(209,156,21,0.25)",
              fontSize: 12, color: "var(--foreground)",
            }}>
              {r}
              <button
                onClick={() => setSla({ ...sla, allowedReturnReasons: sla.allowedReturnReasons.filter(x => x !== r) })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0, fontSize: 14, lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...input, flex: 1 }} placeholder="Agregar razón…"
            value={newReason} onChange={e => setNewReason(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && newReason.trim()) {
                setSla({ ...sla, allowedReturnReasons: [...sla.allowedReturnReasons, newReason.trim()] });
                setNewReason("");
              }
            }}
          />
          <button
            onClick={() => {
              if (!newReason.trim()) return;
              setSla({ ...sla, allowedReturnReasons: [...sla.allowedReturnReasons, newReason.trim()] });
              setNewReason("");
            }}
            style={{
              padding: "9px 16px", borderRadius: 8, cursor: "pointer",
              background: "var(--primary)", color: "var(--primary-foreground)",
              border: "none", fontSize: 13, fontWeight: 600,
            }}
          >
            Agregar
          </button>
        </div>
      </div>

      <button
        onClick={save} disabled={saving}
        style={{
          padding: "11px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700,
          cursor: saving ? "not-allowed" : "pointer",
          background: "var(--primary)", color: "var(--primary-foreground)",
          border: "none", opacity: saving ? 0.7 : 1, marginBottom: 32,
        }}
      >
        {saving ? "Guardando…" : "Guardar SLA"}
      </button>

      {/* History */}
      {history.length > 0 && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Historial de versiones</h3>
          {history.map((h, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none",
              fontSize: 12,
            }}>
              <span style={{ fontWeight: 600 }}>v{h.version}</span>
              <span style={{ color: "var(--muted-foreground)" }}>
                MQL {h.mqlResponseHours}h · Form {h.formQualificationHours}h · Máx retornos {h.maxReturnsPerMonth}
              </span>
              <span style={{ color: "var(--muted-foreground)" }}>{fmt(h.updatedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AcceptCard({ role, acceptedAt, loading, onAccept }: {
  role: string; acceptedAt: string | null; loading: boolean; onAccept: () => void;
}) {
  const accepted = !!acceptedAt;
  return (
    <div style={{
      borderRadius: 10, padding: "16px 18px",
      border: `1px solid ${accepted ? "#22c55e44" : "var(--border)"}`,
      background: accepted ? "rgba(34,197,94,0.06)" : "transparent",
      display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start",
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{role}</div>
        <div style={{ fontSize: 11, color: accepted ? "#22c55e" : "var(--muted-foreground)", marginTop: 2 }}>
          {accepted ? `Aceptado ${new Date(acceptedAt!).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}` : "Pendiente de aceptación"}
        </div>
      </div>
      <button
        onClick={onAccept} disabled={loading}
        style={{
          padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          background: accepted ? "rgba(34,197,94,0.1)" : "var(--primary)",
          color: accepted ? "#22c55e" : "var(--primary-foreground)",
          border: `1px solid ${accepted ? "#22c55e44" : "transparent"}`,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "…" : accepted ? "Re-aceptar" : "Acepto este SLA"}
      </button>
    </div>
  );
}
