"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  company: string;
  contactCount: number;
  industry: string | null;
  pipelineValue: number;
  wonValue: number;
  openDealsCount: number;
  lastActivityAt: number | null;
  pipelineLabel: string;
  wonLabel: string;
};

interface AccountsTableProps {
  rows: Row[];
}

function fmtRelative(ts: number | null): string {
  if (!ts || !Number.isFinite(ts)) return "—";
  const diff = Date.now() - ts;
  if (diff < 0) return "Hoy";
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem`;
  if (days < 365) return `Hace ${Math.floor(days / 30)} m`;
  return `Hace ${Math.floor(days / 365)} a`;
}

export function AccountsTable({ rows }: AccountsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"pipeline" | "contacts" | "company" | "won">("pipeline");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const filtered = rows
    .filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return r.company.toLowerCase().includes(q)
        || (r.industry?.toLowerCase().includes(q) ?? false);
    })
    .sort((a, b) => {
      let diff = 0;
      if (sortBy === "pipeline") diff = a.pipelineValue - b.pipelineValue;
      else if (sortBy === "contacts") diff = a.contactCount - b.contactCount;
      else if (sortBy === "won") diff = a.wonValue - b.wonValue;
      else if (sortBy === "company") diff = a.company.localeCompare(b.company);
      return sortDir === "desc" ? -diff : diff;
    });

  const cell: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: 12,
    borderBottom: "1px solid var(--border)",
    verticalAlign: "middle",
  };
  const hcell: React.CSSProperties = {
    ...cell,
    fontSize: 11,
    color: "var(--muted-foreground)",
    fontWeight: 600,
    background: "var(--card)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    textAlign: "left",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar empresa o industria…"
          style={{
            flex: "1 1 240px",
            padding: "6px 10px",
            borderRadius: 7,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--foreground)",
            fontSize: 12,
            outline: "none",
          }}
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{
            padding: "6px 10px",
            borderRadius: 7,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--foreground)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <option value="pipeline">Pipeline</option>
          <option value="contacts">Contactos</option>
          <option value="company">Empresa</option>
          <option value="won">Ganado</option>
        </select>
        <button
          onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
          style={{
            padding: "6px 12px",
            borderRadius: 7,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--muted-foreground)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {sortDir === "desc" ? "↓" : "↑"}
        </button>
      </div>

      <div style={{
        borderRadius: 10,
        border: "1px solid var(--border)",
        overflow: "auto",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead>
            <tr>
              <th style={hcell}>Empresa</th>
              <th style={hcell}>Contactos</th>
              <th style={hcell}>Industria</th>
              <th style={{ ...hcell, textAlign: "right" }}>Pipeline</th>
              <th style={{ ...hcell, textAlign: "right" }}>Cerrado</th>
              <th style={hcell}>Última actividad</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{
                  ...cell,
                  textAlign: "center",
                  color: "var(--muted-foreground)",
                  padding: "32px 0",
                }}>
                  Sin resultados
                </td>
              </tr>
            ) : filtered.map((r, i) => (
              <tr
                key={r.company}
                style={{
                  background: i % 2 === 0 ? "transparent" : "var(--card)",
                  cursor: "pointer",
                  transition: "filter 0.1s",
                }}
                onClick={() => router.push(`/accounts/${encodeURIComponent(r.company)}`)}
                onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.08)")}
                onMouseLeave={e => (e.currentTarget.style.filter = "")}
              >
                <td style={cell}>
                  <div style={{ fontWeight: 600 }}>{r.company}</div>
                  {r.openDealsCount > 0 && (
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {r.openDealsCount} deal{r.openDealsCount !== 1 ? "s" : ""} abierto{r.openDealsCount !== 1 ? "s" : ""}
                    </div>
                  )}
                </td>
                <td style={cell}>
                  <span style={{
                    padding: "3px 9px",
                    borderRadius: 12,
                    background: "rgba(96,165,250,0.12)",
                    color: "#60a5fa",
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    {r.contactCount}
                  </span>
                </td>
                <td style={cell}>{r.industry ?? "—"}</td>
                <td style={{ ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--primary)", fontWeight: 600 }}>
                  {r.pipelineLabel}
                </td>
                <td style={{ ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.wonValue > 0 ? "#22c55e" : "var(--muted-foreground)" }}>
                  {r.wonLabel}
                </td>
                <td style={{ ...cell, color: "var(--muted-foreground)" }}>
                  {fmtRelative(r.lastActivityAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>
        {filtered.length} de {rows.length} cuenta{rows.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
