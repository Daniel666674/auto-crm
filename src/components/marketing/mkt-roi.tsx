"use client";

import React, { useMemo } from "react";
import { useMkt } from "./mkt-provider";

const REVENUE_PER_HANDOFF = 22_000_000;

function formatCOP(n: number) {
  return "$ " + n.toLocaleString("es-CO");
}

const card: React.CSSProperties = { background: "#111111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 18px" };
const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap" };
const td = (gold = false): React.CSSProperties => ({ padding: "12px 14px", fontSize: 12, color: gold ? "#C39A4C" : "#e2e8f0", borderBottom: "1px solid #1e1e1e", verticalAlign: "middle" });

export function MktROI() {
  const { campaigns, contacts, loading } = useMkt();

  const rows = useMemo(() => {
    return campaigns.map(c => {
      const handoffs = contacts.filter(ct =>
        ct.readyForSales && ct.brevoCadence?.toLowerCase().includes(c.name.toLowerCase().slice(0, 6))
      ).length;
      const deals = c.conversions || 0;
      const revenue = handoffs * REVENUE_PER_HANDOFF;
      return { ...c, handoffs, deals, revenue, costPerLead: 0 };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [campaigns, contacts]);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalHandoffs = rows.reduce((s, r) => s + r.handoffs, 0);
  const totalDeals = rows.reduce((s, r) => s + r.deals, 0);
  const bestRow = rows[0];
  const topId = bestRow?.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        {[
          { label: "Revenue total atribuido", value: formatCOP(totalRevenue), accent: true },
          { label: "Total handoffs", value: totalHandoffs },
          { label: "Deals generados", value: totalDeals },
          { label: "Mejor campaña", value: bestRow?.name ?? "—", small: true },
        ].map(({ label, value, accent, small }) => (
          <div key={label} style={card}>
            <div style={{ fontSize: small ? 14 : 22, fontWeight: 700, color: accent ? "#C39A4C" : "#e2e8f0", lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: 11, color: "#718096", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ fontSize: 13, color: "#718096" }}>Cargando…</div>
      ) : campaigns.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px 0", color: "#718096", fontSize: 13 }}>Sin campañas registradas.</div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Campaña", "Contactos", "Handoffs", "Deals", "Revenue COP", "Costo/Lead"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isTop = row.id === topId && row.revenue > 0;
                  const isLast = i === rows.length - 1;
                  const base = td(isTop);
                  const cell = { ...base, borderBottom: isLast ? "none" : "1px solid #1e1e1e", background: isTop ? "rgba(195,154,76,0.06)" : "transparent" };
                  return (
                    <tr key={row.id}>
                      <td style={{ ...cell, fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isTop && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#C39A4C", color: "#0a0a0a", marginRight: 6 }}>TOP</span>}
                        {row.name}
                      </td>
                      <td style={cell}>{row.totalContacts.toLocaleString("es-CO")}</td>
                      <td style={cell}>{row.handoffs}</td>
                      <td style={cell}>{row.deals}</td>
                      <td style={{ ...cell, fontWeight: 700 }}>{formatCOP(row.revenue)}</td>
                      <td style={{ ...cell, color: "#718096" }}>—</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  <td style={{ ...th, borderBottom: "none", borderTop: "1px solid #1e1e1e", color: "#e2e8f0" }}>Totales</td>
                  <td style={{ ...th, borderBottom: "none", borderTop: "1px solid #1e1e1e", color: "#e2e8f0" }}>{rows.reduce((s, r) => s + r.totalContacts, 0).toLocaleString("es-CO")}</td>
                  <td style={{ ...th, borderBottom: "none", borderTop: "1px solid #1e1e1e", color: "#e2e8f0" }}>{totalHandoffs}</td>
                  <td style={{ ...th, borderBottom: "none", borderTop: "1px solid #1e1e1e", color: "#e2e8f0" }}>{totalDeals}</td>
                  <td style={{ ...th, borderBottom: "none", borderTop: "1px solid #1e1e1e", color: "#C39A4C" }}>{formatCOP(totalRevenue)}</td>
                  <td style={{ ...th, borderBottom: "none", borderTop: "1px solid #1e1e1e" }}>—</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ padding: "8px 14px", fontSize: 10, color: "#718096", borderTop: "1px solid #1e1e1e" }}>
            Revenue calculado como Handoffs × $ {REVENUE_PER_HANDOFF.toLocaleString("es-CO")} COP por deal
          </div>
        </div>
      )}
    </div>
  );
}
