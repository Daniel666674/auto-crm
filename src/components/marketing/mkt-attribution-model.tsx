"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/constants";

type AttrModel = "first" | "last" | "linear" | "u-shaped" | "w-shaped";

interface CampaignAttr {
  campaignId: string;
  credit: number;
  wonRevenue: number;
  openRevenue: number;
  dealsAttributed: number;
}

const MODELS: { id: AttrModel; label: string }[] = [
  { id: "first", label: "First Touch" },
  { id: "last", label: "Last Touch" },
  { id: "linear", label: "Lineal" },
  { id: "u-shaped", label: "U-Shape" },
  { id: "w-shaped", label: "W-Shape" },
];

export function MktAttributionModel() {
  const [model, setModel] = useState<AttrModel>("first");
  const [data, setData] = useState<CampaignAttr[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/marketing/attribution-model?model=${model}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setData)
      .catch(() => setError("Error al cargar atribución"))
      .finally(() => setLoading(false));
  }, [model]);

  const card = {
    borderRadius: 10, padding: "18px 20px",
    background: "var(--mkt-card, var(--card))",
    border: "1px solid var(--mkt-border, var(--border))",
    color: "var(--mkt-text, var(--foreground))",
  } as React.CSSProperties;

  const totalRevenue = data.reduce((s, d) => s + d.wonRevenue, 0);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Atribución Multi-Touch</div>
        <div style={{ fontSize: 12, color: "var(--mkt-text-muted, var(--muted-foreground))", marginTop: 3 }}>
          Distribución de crédito de revenue por modelo de atribución
        </div>
      </div>

      {/* Model toggle */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {MODELS.map(m => (
          <button
            key={m.id}
            onClick={() => setModel(m.id)}
            style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: "1px solid",
              borderColor: model === m.id ? "var(--mkt-accent, var(--primary))" : "var(--mkt-border, var(--border))",
              background: model === m.id ? "rgba(209,156,21,0.12)" : "transparent",
              color: model === m.id ? "var(--mkt-accent, var(--primary))" : "var(--mkt-text-muted, var(--muted-foreground))",
              transition: "all 0.15s ease",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map(i => <div key={i} className="bs-skeleton" style={{ height: 52, borderRadius: 8 }} />)}
        </div>
      ) : error || data.length === 0 ? (
        <div style={card}>
          <div style={{ fontSize: 14, color: "var(--mkt-text-muted, var(--muted-foreground))", textAlign: "center", padding: "24px 0" }}>
            {error || "No hay datos de atribución. Asegúrate de que los contactos tengan campañas asignadas."}
          </div>
        </div>
      ) : (
        <div style={card}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--mkt-border, var(--border))" }}>
                {["Campaña", "Crédito", "Revenue ganado", "Pipeline abierto", "Deals"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: h === "Campaña" ? "left" : "right", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--mkt-text-muted, var(--muted-foreground))" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const creditPct = totalRevenue > 0 ? (row.wonRevenue / totalRevenue) * 100 : row.credit;
                return (
                  <tr key={row.campaignId} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--mkt-border, var(--border))" : "none" }}>
                    <td style={{ padding: "12px 12px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{row.campaignId || "—"}</div>
                      <div style={{ marginTop: 4, background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 4, width: "100%", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(100, creditPct)}%`, background: "var(--mkt-accent, var(--primary))", transition: "width 0.3s ease" }} />
                      </div>
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 700, color: "var(--mkt-accent, var(--primary))" }}>
                      {creditPct.toFixed(1)}%
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 600, color: "#22c55e" }}>
                      {formatCurrency(row.wonRevenue)}
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: "var(--mkt-text-muted, var(--muted-foreground))" }}>
                      {formatCurrency(row.openRevenue)}
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "right" }}>
                      {row.dealsAttributed}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--mkt-border, var(--border))", display: "flex", justifyContent: "flex-end", fontSize: 12, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>
            Total revenue atribuido: <strong style={{ color: "#22c55e", marginLeft: 6 }}>{formatCurrency(totalRevenue)}</strong>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>
        <strong>First/Last:</strong> 100% al primer o último toque. <strong>Lineal:</strong> partes iguales. <strong>U-Shape:</strong> 40% primer + 40% último + 20% medio. <strong>W-Shape:</strong> 30% primer + 30% creación + 30% último + 10% medio.
      </div>
    </div>
  );
}
