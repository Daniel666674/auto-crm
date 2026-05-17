"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle, AlertTriangle, Clock, ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";

const S = {
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6, display: "block" },
  input: { width: "100%", padding: "8px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--foreground)", outline: "none", boxSizing: "border-box" as const },
  btn: (variant: "primary" | "outline" | "ghost" | "danger" = "outline"): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.12s",
    ...(variant === "primary" ? { background: "var(--primary)", color: "var(--primary-foreground)", border: "none" } : {}),
    ...(variant === "ghost" ? { background: "transparent", color: "var(--muted-foreground)", border: "none" } : {}),
    ...(variant === "danger" ? { background: "rgba(239,68,68,0.12)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" } : {}),
    ...(variant === "outline" ? { background: "transparent", color: "var(--foreground)" } : {}),
  }),
};

interface AgingDeal {
  id: string;
  title: string;
  contactName?: string;
  stageName?: string;
  stageColor?: string;
  daysSinceUpdate: number;
}

interface AgingData {
  agingDays: number;
  deals: AgingDeal[];
}

function ageBadgeStyle(days: number): React.CSSProperties {
  if (days > 14) return { background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" };
  if (days >= 7) return { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" };
  return { background: "rgba(234,179,8,0.12)", color: "#ca8a04", border: "1px solid rgba(234,179,8,0.25)" };
}

function ageDotColor(days: number): string {
  if (days > 14) return "#ef4444";
  if (days >= 7) return "#f59e0b";
  return "#ca8a04";
}

export function DealAgingSettings() {
  const [agingDays, setAgingDays] = useState(14);
  const [inputDays, setInputDays] = useState("14");
  const [stuckDeals, setStuckDeals] = useState<AgingDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [agingRes, dealsRes] = await Promise.all([
        fetch("/api/settings/deal-aging"),
        fetch("/api/deals/aging"),
      ]);

      if (agingRes.ok) {
        const agingData: { agingDays: number } = await agingRes.json();
        setAgingDays(agingData.agingDays);
        setInputDays(String(agingData.agingDays));
      }

      if (dealsRes.ok) {
        const data: AgingData = await dealsRes.json();
        setStuckDeals(data.deals || []);
        // If the aging endpoint also returns agingDays, prefer it
        if (data.agingDays && !agingRes.ok) {
          setAgingDays(data.agingDays);
          setInputDays(String(data.agingDays));
        }
      }
    } catch {
      toast.error("Error al cargar datos de estancamiento");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    const days = parseInt(inputDays, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error("Ingresa un numero de dias valido (1-365)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/deal-aging", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agingDays: days }),
      });
      if (!res.ok) throw new Error();
      setAgingDays(days);
      toast.success(`Umbral actualizado: ${days} dias sin movimiento`);
      // Re-fetch the stale deals list with new threshold
      await fetchData();
    } catch {
      toast.error("Error al guardar el umbral");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = parseInt(inputDays, 10) !== agingDays;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Deals Estancados</h3>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Detecta oportunidades sin movimiento y configura el umbral de alerta
          </p>
        </div>
        <button onClick={fetchData} style={S.btn("ghost")} disabled={loading} title="Actualizar">
          <RefreshCw size={14} style={{ ...(loading ? { animation: "spin 1s linear infinite" } : {}) }} />
        </button>
      </div>

      {/* Threshold config */}
      <div style={S.card}>
        <h4 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 16px", color: "var(--foreground)" }}>
          Umbral de estancamiento
        </h4>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
          <div style={{ flex: "0 0 160px" }}>
            <span style={S.label}>Dias sin movimiento</span>
            <input
              type="number"
              min={1}
              max={365}
              value={inputDays}
              onChange={e => setInputDays(e.target.value)}
              style={S.input}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            style={{
              ...S.btn("primary"),
              opacity: (!hasChanges || saving) ? 0.6 : 1,
            }}
          >
            {saving
              ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
              : <Save size={13} />
            }
            Guardar
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "12px 0 0" }}>
          Un deal se considera estancado si no tiene actividad en los ultimos{" "}
          <strong style={{ color: "var(--foreground)" }}>{agingDays} dias</strong>.
          Actualmente hay{" "}
          <strong style={{ color: stuckDeals.length > 0 ? "#f59e0b" : "#22c55e" }}>
            {stuckDeals.length} deal{stuckDeals.length !== 1 ? "s" : ""} estancado{stuckDeals.length !== 1 ? "s" : ""}
          </strong>.
        </p>
      </div>

      {/* Stuck deals list */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
            Deals sin movimiento
          </h4>
          <a
            href="/pipeline"
            style={{
              ...S.btn("outline"),
              textDecoration: "none",
              fontSize: 12,
            }}
          >
            Ver pipeline <ExternalLink size={12} />
          </a>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted-foreground)" }}>
            <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : stuckDeals.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <CheckCircle size={36} style={{ color: "#22c55e", opacity: 0.8 }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground)", margin: "0 0 4px" }}>
              Todos los deals estan activos
            </p>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
              No hay oportunidades sin movimiento en los ultimos {agingDays} dias
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Legend */}
            <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
              {[
                { label: `>14 dias`, color: "#ef4444" },
                { label: "7-14 dias", color: "#f59e0b" },
                { label: "<7 dias", color: "#ca8a04" },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{label}</span>
                </div>
              ))}
            </div>

            {stuckDeals.map((deal, idx) => (
              <div
                key={deal.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: idx < stuckDeals.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                {/* Stage color dot or age dot */}
                <span style={{
                  width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                  background: deal.stageColor || ageDotColor(deal.daysSinceUpdate),
                  border: `2px solid ${ageDotColor(deal.daysSinceUpdate)}`,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {deal.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, display: "flex", gap: 8 }}>
                    {deal.contactName && <span>{deal.contactName}</span>}
                    {deal.stageName && (
                      <>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span>{deal.stageName}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Age badge */}
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                  ...ageBadgeStyle(deal.daysSinceUpdate),
                }}>
                  <Clock size={11} />
                  {deal.daysSinceUpdate}d sin movimiento
                </span>
              </div>
            ))}

            {stuckDeals.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <AlertTriangle size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
                  Estos deals requieren atencion. Considera registrar una actividad o moverlos a otra etapa.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
