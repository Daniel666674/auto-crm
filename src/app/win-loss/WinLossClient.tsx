"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/constants";

type DealRow = {
  id: string;
  title: string;
  value: number;
  industry: string;
  source: string;
  stageName: string;
  won: boolean;
  days: number;
};

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ borderRadius: 10, padding: "16px 20px", background: "var(--card)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || "var(--foreground)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SVGBar({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 500, H = 130, PAD = 22;
  const segW = W / data.length;
  const bw = Math.max(8, segW * 0.55);
  const bx = (segW - bw) / 2;
  if (!data.length) return null;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = Math.max(3, (d.value / max) * (H - PAD));
        const x = i * segW + bx;
        const y = H - PAD - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx={3} fill={d.color} opacity={0.82} />
            <text x={x + bw / 2} y={H - 4} textAnchor="middle" fontSize={8}
              fill="var(--muted-foreground)">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function WinLossClient({ wonDeals, lostDeals }: { wonDeals: DealRow[]; lostDeals: DealRow[] }) {
  const [search, setSearch] = useState("");

  const allData = [...wonDeals, ...lostDeals];
  const winRate = allData.length ? Math.round((wonDeals.length / allData.length) * 100) : 0;
  const avgDays = allData.length
    ? Math.round(allData.reduce((s, d) => s + d.days, 0) / allData.length)
    : 0;

  const industries = [...new Set(allData.map(d => d.industry))];
  const byIndustry = industries.map(ind => {
    const g = allData.filter(d => d.industry === ind);
    const w = g.filter(d => d.won).length;
    return { label: ind, rate: Math.round((w / g.length) * 100) };
  }).sort((a, b) => b.rate - a.rate);

  const filteredLost = lostDeals.filter(d =>
    !search || d.title.toLowerCase().includes(search.toLowerCase())
  );

  const lostBySource = [
    { label: "Web", value: lostDeals.filter(d => d.source === "website").length, color: "var(--primary)" },
    { label: "Ref", value: lostDeals.filter(d => d.source === "referido").length, color: "var(--primary)" },
    { label: "RRSS", value: lostDeals.filter(d => d.source === "redes_sociales").length, color: "var(--primary)" },
    { label: "Llamada", value: lostDeals.filter(d => d.source === "llamada_fria").length, color: "var(--primary)" },
    { label: "Evento", value: lostDeals.filter(d => d.source === "evento").length, color: "var(--primary)" },
    { label: "Otro", value: lostDeals.filter(d => !["website","referido","redes_sociales","llamada_fria","evento"].includes(d.source)).length, color: "var(--primary)" },
  ].filter(d => d.value > 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Win / Loss Analysis</h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Análisis de deals ganados y perdidos</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Win Rate" value={`${winRate}%`} accent="var(--primary)" />
        <StatCard
          label="Ganados"
          value={String(wonDeals.length)}
          accent="#22c55e"
          sub={formatCurrency(wonDeals.reduce((s, d) => s + d.value, 0))}
        />
        <StatCard
          label="Perdidos"
          value={String(lostDeals.length)}
          accent="#ef4444"
          sub={formatCurrency(lostDeals.reduce((s, d) => s + d.value, 0))}
        />
        <StatCard label="Avg días a cierre" value={`${avgDays}d`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Win rate by industry */}
        <div style={{ borderRadius: 10, padding: 16, background: "var(--card)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Win rate por industria</div>
          {byIndustry.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Sin datos suficientes</div>
          ) : byIndustry.slice(0, 6).map(row => (
            <div key={row.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span>{row.label}</span>
                <span style={{ fontWeight: 600, color: row.rate >= 50 ? "#22c55e" : "#ef4444" }}>{row.rate}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "var(--border)" }}>
                <div style={{ width: `${row.rate}%`, height: "100%", borderRadius: 2, background: row.rate >= 50 ? "#22c55e" : "#ef4444", transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Lost by source */}
        <div style={{ borderRadius: 10, padding: 16, background: "var(--card)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Deals perdidos por fuente</div>
          {lostBySource.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Sin deals perdidos</div>
          ) : (
            <SVGBar data={lostBySource} />
          )}
        </div>
      </div>

      {/* Lost deals table */}
      <div style={{ borderRadius: 10, padding: 16, background: "var(--card)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Deals perdidos</div>
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)",
              background: "var(--background)", color: "var(--foreground)", fontSize: 12, outline: "none",
            }}
          />
        </div>

        {filteredLost.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted-foreground)", fontSize: 13 }}>
            {lostDeals.length === 0 ? "No hay deals perdidos registrados" : "Sin resultados"}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Deal", "Valor", "Etapa perdida", "Fuente", "Días"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLost.map(d => (
                <tr key={d.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 10px", fontSize: 13 }}>{d.title}</td>
                  <td style={{ padding: "10px 10px", fontSize: 13, color: "var(--primary)" }}>{formatCurrency(d.value)}</td>
                  <td style={{ padding: "10px 10px", fontSize: 12, color: "var(--muted-foreground)" }}>{d.stageName}</td>
                  <td style={{ padding: "10px 10px", fontSize: 12, color: "var(--muted-foreground)" }}>{d.source}</td>
                  <td style={{ padding: "10px 10px", fontSize: 13 }}>{d.days}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
