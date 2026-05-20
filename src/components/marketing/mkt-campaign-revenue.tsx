"use client";

import React, { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/constants";
import { BSLoading } from "../ui/BSLoading";

interface CampaignRevenue {
  campaignId: string;
  campaignName: string;
  contacts: number;
  mqls: number;
  sqls: number;
  wonDeals: number;
  wonRevenue: number;
  openRevenue: number;
  pipelineTouched: number;
  sqlRate: number;
  winRate: number;
}

type SortKey = "campaignName" | "contacts" | "mqls" | "sqls" | "wonDeals" | "wonRevenue" | "openRevenue";
type SortDir = "asc" | "desc";

const card: React.CSSProperties = { background: "#111111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 18px" };

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: 10, color: active ? "#C39A4C" : "#718096" }}>
      {active && dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

export function MktCampaignRevenue() {
  const [data, setData] = useState<CampaignRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("wonRevenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/marketing/campaign-revenue")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: CampaignRevenue[]) => setData(Array.isArray(d) ? d : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let r = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(row => row.campaignName.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
  }, [data, search, sortKey, sortDir]);

  const totalWon = filtered.reduce((s, r) => s + r.wonRevenue, 0);
  const totalOpen = filtered.reduce((s, r) => s + r.openRevenue, 0);
  const totalDeals = filtered.reduce((s, r) => s + r.wonDeals, 0);
  const totalContacts = filtered.reduce((s, r) => s + r.contacts, 0);
  const totalMqls = filtered.reduce((s, r) => s + r.mqls, 0);
  const totalSqls = filtered.reduce((s, r) => s + r.sqls, 0);
  const bestRow = [...data].sort((a, b) => b.wonRevenue - a.wonRevenue)[0];
  const topId = bestRow && bestRow.wonRevenue > 0 ? bestRow.campaignId : null;

  const th: React.CSSProperties = {
    padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#718096",
    textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left",
    borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
  };
  const td = (gold = false): React.CSSProperties => ({
    padding: "12px 14px", fontSize: 12,
    color: gold ? "#C39A4C" : "#e2e8f0",
    borderBottom: "1px solid #1e1e1e", verticalAlign: "middle",
  });

  const cols: { key: SortKey; label: string }[] = [
    { key: "campaignName", label: "Campaña" },
    { key: "contacts", label: "Contactos" },
    { key: "mqls", label: "MQL" },
    { key: "sqls", label: "SQL" },
    { key: "wonDeals", label: "Ganados" },
    { key: "wonRevenue", label: "Revenue Ganado" },
    { key: "openRevenue", label: "Pipeline Abierto" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>Revenue por Campaña</div>
        <div style={{ width: 40, height: 3, background: "#C39A4C", borderRadius: 2, marginTop: 4 }} />
        <div style={{ fontSize: 12, color: "#718096", marginTop: 6 }}>
          Revenue real de deals atribuidos al primer toque de cada campaña — sin estimaciones.
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
        {[
          { label: "REVENUE GANADO", value: formatCurrency(totalWon), accent: true },
          { label: "PIPELINE ABIERTO ATRIBUIDO", value: formatCurrency(totalOpen) },
          { label: "DEALS GANADOS", value: String(totalDeals) },
          { label: "MEJOR CAMPAÑA", value: bestRow?.campaignName ?? "—", small: true },
        ].map(({ label, value, accent, small }) => (
          <div key={label} style={card}>
            <div style={{ fontSize: small ? 13 : 22, fontWeight: 700, color: accent ? "#C39A4C" : "#e2e8f0", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: small ? "nowrap" : "normal" }}>{value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#718096", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 280 }}>
        <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} width={13} height={13} fill="none" stroke="#e2e8f0" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx={11} cy={11} r={8} /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar campaña…"
          style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: 8, border: "1px solid #1e1e1e", background: "#111111", color: "#e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <BSLoading label="Cargando revenue…" />
      ) : error ? (
        <div style={{ ...card, textAlign: "center", padding: "40px 0", color: "#718096", fontSize: 13 }}>No se pudo cargar el revenue por campaña.</div>
      ) : data.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px 0", color: "#718096", fontSize: 13 }}>
          Aún no hay contactos atribuidos a campañas. La atribución se captura cuando un contacto abre/clickea un email de campaña (webhook de Brevo).
        </div>
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
                  <th style={{ ...th, cursor: "default" }}>Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "30px 14px", textAlign: "center", fontSize: 13, color: "#718096" }}>Sin resultados.</td></tr>
                ) : filtered.map((row, i) => {
                  const isTop = row.campaignId === topId;
                  const isLast = i === filtered.length - 1;
                  const base = td(isTop);
                  const cell: React.CSSProperties = { ...base, borderBottom: isLast ? "none" : "1px solid #1e1e1e", background: isTop ? "rgba(195,154,76,0.06)" : "transparent" };
                  return (
                    <tr key={row.campaignId}>
                      <td style={{ ...cell, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isTop && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#C39A4C", color: "#0a0a0a", marginRight: 6 }}>TOP</span>
                        )}
                        <span style={{ fontWeight: 600 }}>{row.campaignName}</span>
                      </td>
                      <td style={cell}>{row.contacts.toLocaleString("es-CO")}</td>
                      <td style={cell}>{row.mqls}</td>
                      <td style={cell}>{row.sqls}</td>
                      <td style={cell}>{row.wonDeals}</td>
                      <td style={{ ...cell, fontWeight: 700 }}>{formatCurrency(row.wonRevenue)}</td>
                      <td style={cell}>{formatCurrency(row.openRevenue)}</td>
                      <td style={{ ...cell, color: "#718096" }}>{(row.winRate * 100).toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#e2e8f0", borderTop: "1px solid #1e1e1e", textTransform: "uppercase", letterSpacing: "0.04em" }}>Totales</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#e2e8f0", borderTop: "1px solid #1e1e1e" }}>{totalContacts.toLocaleString("es-CO")}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#e2e8f0", borderTop: "1px solid #1e1e1e" }}>{totalMqls}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#e2e8f0", borderTop: "1px solid #1e1e1e" }}>{totalSqls}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#e2e8f0", borderTop: "1px solid #1e1e1e" }}>{totalDeals}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#C39A4C", borderTop: "1px solid #1e1e1e" }}>{formatCurrency(totalWon)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#e2e8f0", borderTop: "1px solid #1e1e1e" }}>{formatCurrency(totalOpen)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, borderTop: "1px solid #1e1e1e", color: "#718096" }}>—</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ padding: "8px 14px", fontSize: 10, color: "#718096", borderTop: "1px solid #1e1e1e" }}>
            Atribución por primer toque (firstTouchCampaignId) · revenue tomado de los valores reales de cada deal · {filtered.length} campaña{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
