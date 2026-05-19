"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/constants";

interface ForecastData {
  conversionRates: { leadsToMql: number; mqlToSql: number; sqlToWon: number };
  avgDealValueCop: number;
  avgDaysLeadToWon: number;
  currentFunnel: { leads: number; mqls: number; sqls: number };
  historicalSample: { windowDays: number; newLeads: number; newMqls: number; newSqls: number; wonDeals: number };
  forecast: Record<"day30" | "day60" | "day90", { expectedDeals: number; expectedRevenueCop: number; confidence: "low" | "medium" | "high" }>;
}

const CONF_COLOR: Record<string, string> = { low: "#ef4444", medium: "#f59e0b", high: "#22c55e" };
const CONF_LABEL: Record<string, string> = { low: "Baja", medium: "Media", high: "Alta" };

export function MktForecast() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/marketing/forecast")
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setData)
      .catch(() => setError("Error al cargar forecast"))
      .finally(() => setLoading(false));
  }, []);

  const card = {
    borderRadius: 10, padding: "18px 20px",
    background: "var(--mkt-card, var(--card))",
    border: "1px solid var(--mkt-border, var(--border))",
    color: "var(--mkt-text, var(--foreground))",
  } as React.CSSProperties;

  if (loading) return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Forecast de Marketing</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {[1, 2, 3].map(i => <div key={i} className="bs-skeleton" style={{ height: 120, borderRadius: 10 }} />)}
      </div>
    </div>
  );

  if (error || !data) return (
    <div style={{ padding: 24, color: "var(--muted-foreground, #888)" }}>
      {error || "Sin datos disponibles"}
    </div>
  );

  const periods = [
    { key: "day30" as const, label: "30 días" },
    { key: "day60" as const, label: "60 días" },
    { key: "day90" as const, label: "90 días" },
  ];

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Forecast de Marketing</div>
        <div style={{ fontSize: 12, color: "var(--mkt-text-muted, var(--muted-foreground))", marginTop: 3 }}>
          Proyección basada en tasas históricas de los últimos {data.historicalSample.windowDays} días
        </div>
      </div>

      {/* 3 projection cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {periods.map(p => {
          const proj = data.forecast[p.key];
          const conf = proj.confidence;
          return (
            <div key={p.key} style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--mkt-text-muted, var(--muted-foreground))", marginBottom: 10 }}>
                {p.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--mkt-accent, var(--primary))", marginBottom: 4 }}>
                {formatCurrency(proj.expectedRevenueCop)}
              </div>
              <div style={{ fontSize: 12, color: "var(--mkt-text-muted, var(--muted-foreground))", marginBottom: 10 }}>
                ~{proj.expectedDeals} deal{proj.expectedDeals !== 1 ? "s" : ""} esperado{proj.expectedDeals !== 1 ? "s" : ""}
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "2px 8px", borderRadius: 12,
                fontSize: 10, fontWeight: 700,
                background: `${CONF_COLOR[conf]}22`,
                color: CONF_COLOR[conf],
              }}>
                Confianza: {CONF_LABEL[conf]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Funnel + conversion rates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Current funnel */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Embudo actual</div>
          {[
            { label: "Leads", count: data.currentFunnel.leads, color: "#60a5fa" },
            { label: "MQLs", count: data.currentFunnel.mqls, color: "#a78bfa" },
            { label: "SQLs", count: data.currentFunnel.sqls, color: "#f59e0b" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, fontSize: 11, fontWeight: 600, color: row.color }}>{row.label}</div>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 4,
                  width: `${Math.min(100, (row.count / Math.max(data.currentFunnel.leads, 1)) * 100)}%`,
                  background: row.color,
                  transition: "width 0.4s ease",
                }} />
              </div>
              <div style={{ width: 36, fontSize: 13, fontWeight: 700, textAlign: "right", color: "var(--mkt-text, var(--foreground))" }}>
                {row.count}
              </div>
            </div>
          ))}
        </div>

        {/* Conversion rates */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Tasas de conversión</div>
          {[
            { label: "Lead → MQL", rate: data.conversionRates.leadsToMql, target: 0.18 },
            { label: "MQL → SQL", rate: data.conversionRates.mqlToSql, target: 0.35 },
            { label: "SQL → Ganado", rate: data.conversionRates.sqlToWon, target: 0.22 },
          ].map(row => {
            const pct = Math.round(row.rate * 100);
            const ok = row.rate >= row.target;
            return (
              <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, fontSize: 12 }}>{row.label}</div>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: ok ? "#22c55e" : "#ef4444",
                }}>
                  {pct}%
                </span>
                <span style={{ fontSize: 10, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>
                  meta {Math.round(row.target * 100)}%
                </span>
              </div>
            );
          })}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--mkt-border, var(--border))", fontSize: 11, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>
            Ticket promedio: {formatCurrency(data.avgDealValueCop)} · Ciclo: {data.avgDaysLeadToWon}d
          </div>
        </div>
      </div>

      {/* Historical sample note */}
      <div style={{ fontSize: 11, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>
        Basado en {data.historicalSample.wonDeals} deals ganados · {data.historicalSample.newMqls} MQLs · {data.historicalSample.newSqls} SQLs en los últimos {data.historicalSample.windowDays} días.
        {data.historicalSample.wonDeals < 10 && " Confianza baja por bajo volumen histórico — más datos mejorarán la proyección."}
      </div>
    </div>
  );
}
