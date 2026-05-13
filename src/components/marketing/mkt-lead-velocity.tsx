"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMkt } from "./mkt-provider";
import type { MktContact } from "./mkt-types";

const SOURCE_COLORS: Record<string, string> = {
  website: "#C39A4C",
  linkedin: "#4299e1",
  brevo_email: "#48bb78",
  email: "#48bb78",
  evento: "#9f7aea",
  evento_presencial: "#9f7aea",
  referido: "#68d391",
  llamada_fria: "#fc8181",
  redes_sociales: "#76e4f7",
  whatsapp: "#68d391",
  formulario: "#f6ad55",
};
function srcColor(s: string) { return SOURCE_COLORS[s] ?? "#718096"; }

function getWeekStart(ts: number): string {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function weekLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${d.toLocaleString("es-CO", { month: "short" })}`;
}

function buildWeeks(contacts: MktContact[]) {
  const now = Date.now();
  const weeks: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    weeks.push(d.toISOString().split("T")[0]);
  }
  const unique = [...new Set(weeks)].slice(-8);

  const map: Record<string, Record<string, number>> = {};
  unique.forEach(w => { map[w] = {}; });

  contacts.forEach(c => {
    const ts = c.lastActivity || 0;
    if (!ts) return;
    const w = getWeekStart(ts);
    if (!map[w]) return;
    const src = c.source || "other";
    map[w][src] = (map[w][src] || 0) + 1;
  });

  return { weeks: unique, map };
}

function Skeleton() {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 160 }}>
      {[40, 65, 50, 80, 55, 90, 70, 60].map((h, i) => (
        <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0", background: "#1e1e1e", animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

export function MktLeadVelocity() {
  const { contacts, loading } = useMkt();

  const { weeks, map } = useMemo(() => buildWeeks(contacts), [contacts]);

  const allSources = useMemo(() => {
    const s = new Set<string>();
    Object.values(map).forEach(w => Object.keys(w).forEach(k => s.add(k)));
    return [...s];
  }, [map]);

  const maxTotal = useMemo(() => Math.max(1, ...weeks.map(w => Object.values(map[w] || {}).reduce((a, b) => a + b, 0))), [weeks, map]);

  const thisWeek = weeks[weeks.length - 1];
  const thisWeekTotal = Object.values(map[thisWeek] || {}).reduce((a, b) => a + b, 0);

  const handoffs = contacts.filter(c => c.readyForSales).length;
  const convRate = contacts.length > 0 ? Math.round((handoffs / contacts.length) * 100) : 0;

  const passedTs = contacts.filter(c => c.passedToSalesAt).map(c => c.passedToSalesAt as number);
  const avgDays = passedTs.length > 1
    ? Math.round((Math.max(...passedTs) - Math.min(...passedTs)) / passedTs.length / 86400000)
    : 0;

  const card: React.CSSProperties = { background: "#111111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 18px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
        {[
          { label: "Leads esta semana", value: thisWeekTotal, accent: true },
          { label: "Avg días → handoff", value: avgDays > 0 ? `${avgDays}d` : "—", accent: false },
          { label: "Tasa conversión", value: `${convRate}%`, accent: false },
          { label: "Total handoffs", value: handoffs, accent: false },
        ].map(({ label, value, accent }) => (
          <div key={label} style={card}>
            <div style={{ fontSize: 22, fontWeight: 700, color: accent ? "#C39A4C" : "#e2e8f0" }}>{value}</div>
            <div style={{ fontSize: 11, color: "#718096", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ ...card, padding: "18px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Leads por semana (últimas 8 semanas)</div>
        {loading ? <Skeleton /> : (
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 160 }}>
            {weeks.map(w => {
              const srcMap = map[w] || {};
              const total = Object.values(srcMap).reduce((a, b) => a + b, 0);
              const barH = maxTotal > 0 ? Math.round((total / maxTotal) * 140) : 0;
              return (
                <div key={w} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 10, color: "#718096", fontWeight: 600 }}>{total > 0 ? total : ""}</div>
                  <div style={{ width: "100%", height: 140, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <div style={{ width: "100%", display: "flex", flexDirection: "column-reverse", borderRadius: "4px 4px 0 0", overflow: "hidden", height: barH, transition: "height 0.6s ease" }}>
                      {allSources.map(src => {
                        const count = srcMap[src] || 0;
                        if (!count) return null;
                        const segH = Math.round((count / Math.max(total, 1)) * barH);
                        return <div key={src} style={{ width: "100%", height: segH, background: srcColor(src), flexShrink: 0 }} title={`${src}: ${count}`} />;
                      })}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: "#718096", textAlign: "center", lineHeight: 1.2 }}>{weekLabel(w)}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        {allSources.length > 0 && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: "1px solid #1e1e1e" }}>
            {allSources.map(src => (
              <div key={src} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#718096" }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: srcColor(src), flexShrink: 0 }} />
                {src}
              </div>
            ))}
          </div>
        )}
      </div>

      {contacts.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#718096" }}>
          Sin datos de contactos todavía.
        </div>
      )}
    </div>
  );
}
