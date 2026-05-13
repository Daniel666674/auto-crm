"use client";

import React, { useMemo, useState } from "react";
import { useMkt } from "./mkt-provider";

const REVENUE_PER_HANDOFF = 22_000_000;

function formatCOP(n: number) {
  return "$ " + n.toLocaleString("es-CO");
}

const card: React.CSSProperties = { background: "#111111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 18px" };

type SortKey = "name" | "totalContacts" | "handoffs" | "deals" | "revenue" | "openRate";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: 10, color: active ? "#C39A4C" : "#718096" }}>
      {active && dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

export function MktROI() {
  const { campaigns, contacts, loading } = useMkt();

  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const rows = useMemo(() => {
    return campaigns.map(c => {
      const handoffs = contacts.filter(ct =>
        ct.readyForSales && ct.brevoCadence?.toLowerCase().includes(c.name.toLowerCase().slice(0, 6))
      ).length;
      const deals = c.conversions || 0;
      const revenue = handoffs * REVENUE_PER_HANDOFF;
      const openRate = c.openRate || 0;
      return { ...c, handoffs, deals, revenue, openRate };
    });
  }, [campaigns, contacts]);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(row => row.name.toLowerCase().includes(q));
    }
    if (dateFrom) r = r.filter(row => !row.scheduledAt || row.scheduledAt >= new Date(dateFrom).getTime());
    if (dateTo)   r = r.filter(row => !row.scheduledAt || row.scheduledAt <= new Date(dateTo).getTime() + 86400000);
    return [...r].sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
  }, [rows, search, dateFrom, dateTo, sortKey, sortDir]);

  const totalRevenue = filtered.reduce((s, r) => s + r.revenue, 0);
  const totalHandoffs = filtered.reduce((s, r) => s + r.handoffs, 0);
  const totalDeals = filtered.reduce((s, r) => s + r.deals, 0);
  const totalContacts = filtered.reduce((s, r) => s + r.totalContacts, 0);
  const bestRow = [...rows].sort((a, b) => b.revenue - a.revenue)[0];
  const topId = bestRow?.id;

  const th: React.CSSProperties = {
    padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#718096",
    textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left",
    borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap", cursor: "pointer",
    userSelect: "none",
  };
  const td = (gold = false): React.CSSProperties => ({
    padding: "12px 14px", fontSize: 12,
    color: gold ? "#C39A4C" : "#e2e8f0",
    borderBottom: "1px solid #1e1e1e", verticalAlign: "middle",
  });

  const cols: { key: SortKey; label: string }[] = [
    { key: "name", label: "Campaña" },
    { key: "totalContacts", label: "Contactos" },
    { key: "handoffs", label: "Handoffs" },
    { key: "deals", label: "Deals" },
    { key: "openRate", label: "Open Rate" },
    { key: "revenue", label: "Revenue COP" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Page header */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>ROI de Marketing</div>
        <div style={{ width: 40, height: 3, background: "#C39A4C", borderRadius: 2, marginTop: 4 }} />
        <div style={{ fontSize: 12, color: "#718096", marginTop: 6 }}>
          Atribución de revenue por campaña · {formatCOP(REVENUE_PER_HANDOFF)} COP por handoff
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
        {[
          { label: "REVENUE TOTAL ATRIBUIDO", value: formatCOP(totalRevenue), accent: true },
          { label: "TOTAL HANDOFFS", value: totalHandoffs },
          { label: "DEALS GENERADOS", value: totalDeals },
          { label: "MEJOR CAMPAÑA", value: bestRow?.name ?? "—", small: true },
        ].map(({ label, value, accent, small }) => (
          <div key={label} style={card}>
            <div style={{ fontSize: small ? 13 : 22, fontWeight: 700, color: accent ? "#C39A4C" : "#e2e8f0", lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#718096", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} width={13} height={13} fill="none" stroke="#e2e8f0" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx={11} cy={11} r={8} /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar campaña…"
            style={{ width: "100%", paddingLeft: 30, padding: "8px 12px 8px 30px", borderRadius: 8, border: "1px solid #1e1e1e", background: "#111111", color: "#e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#718096", whiteSpace: "nowrap" }}>Desde</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #1e1e1e", background: "#111111", color: "#e2e8f0", fontSize: 12, outline: "none" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#718096", whiteSpace: "nowrap" }}>Hasta</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #1e1e1e", background: "#111111", color: "#e2e8f0", fontSize: 12, outline: "none" }} />
        </div>
        {(search || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #1e1e1e", background: "transparent", color: "#718096", fontSize: 11, cursor: "pointer" }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ fontSize: 13, color: "#718096" }}>Cargando…</div>
      ) : campaigns.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px 0", color: "#718096", fontSize: 13 }}>Sin campañas registradas.</div>
      ) : (
        <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {cols.map(col => (
                    <th key={col.key} style={th} onClick={() => handleSort(col.key)}>
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </th>
                  ))}
                  <th style={{ ...th, cursor: "default" }}>Costo/Lead</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "30px 14px", textAlign: "center", fontSize: 13, color: "#718096" }}>Sin resultados.</td></tr>
                ) : filtered.map((row, i) => {
                  const isTop = row.id === topId && row.revenue > 0;
                  const isLast = i === filtered.length - 1;
                  const base = td(isTop);
                  const cell: React.CSSProperties = { ...base, borderBottom: isLast ? "none" : "1px solid #1e1e1e", background: isTop ? "rgba(195,154,76,0.06)" : "transparent" };
                  return (
                    <tr key={row.id}>
                      <td style={{ ...cell, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isTop && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#C39A4C", color: "#0a0a0a", marginRight: 6 }}>TOP</span>
                        )}
                        <span style={{ fontWeight: 600, borderBottom: isTop ? "2px solid rgba(195,154,76,0.5)" : "none", paddingBottom: isTop ? 1 : 0 }}>{row.name}</span>
                      </td>
                      <td style={cell}>{row.totalContacts.toLocaleString("es-CO")}</td>
                      <td style={cell}>{row.handoffs}</td>
                      <td style={cell}>{row.deals}</td>
                      <td style={cell}>{(row.openRate || 0).toFixed(1)}%</td>
                      <td style={{ ...cell, fontWeight: 700 }}>{formatCOP(row.revenue)}</td>
                      <td style={{ ...cell, color: "#718096" }}>—</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#e2e8f0", borderTop: "1px solid #1e1e1e", textTransform: "uppercase", letterSpacing: "0.04em" }}>Totales</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#e2e8f0", borderTop: "1px solid #1e1e1e" }}>{totalContacts.toLocaleString("es-CO")}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#e2e8f0", borderTop: "1px solid #1e1e1e" }}>{totalHandoffs}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#e2e8f0", borderTop: "1px solid #1e1e1e" }}>{totalDeals}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#718096", borderTop: "1px solid #1e1e1e" }}>—</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#C39A4C", borderTop: "1px solid #1e1e1e" }}>{formatCOP(totalRevenue)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, borderTop: "1px solid #1e1e1e", color: "#718096" }}>—</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ padding: "8px 14px", fontSize: 10, color: "#718096", borderTop: "1px solid #1e1e1e" }}>
            Revenue calculado como Handoffs × {formatCOP(REVENUE_PER_HANDOFF)} COP por deal · {filtered.length} campaña{filtered.length !== 1 ? "s" : ""} mostrada{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
