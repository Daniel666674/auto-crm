"use client";

import React, { useCallback, useEffect, useState } from "react";

const GOLD = "#C39A4C";
const GOLD_FAINT = "rgba(195,154,76,0.12)";
const GOLD_BORDER = "rgba(195,154,76,0.25)";
const PALETTE = ["#C39A4C", "#E8B84B", "#A07C35", "#D4A843", "#7A5E28", "#F5D37E", "#D19C15", "#8B6914"];

type Preset = "today" | "yesterday" | "thisWeek" | "lastWeek" | "7d" | "thisMonth" | "lastMonth" | "28d" | "30d" | "90d" | "custom";

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: "today",     label: "Hoy" },
  { id: "yesterday", label: "Ayer" },
  { id: "thisWeek",  label: "Esta semana" },
  { id: "lastWeek",  label: "Semana pasada" },
  { id: "7d",        label: "7 días" },
  { id: "thisMonth", label: "Este mes" },
  { id: "lastMonth", label: "Mes pasado" },
  { id: "28d",       label: "28 días" },
  { id: "30d",       label: "30 días" },
  { id: "90d",       label: "90 días" },
  { id: "custom",    label: "Personalizado" },
];

interface GA4Detail {
  sessions: number;
  pageviews: number;
  activeUsers: number;
  bounceRate: number;
  newUsers: number;
  avgSessionDuration?: number;
  topPages: { page: string; views: number }[];
  trafficSources: { source: string; sessions: number }[];
  deviceBreakdown?: { device: string; sessions: number }[];
  daily: { date: string; sessions: number; pageviews: number; users?: number }[];
  error?: string;
}

function fmtDur(s: number | undefined): string {
  if (!s) return "—";
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function fmtDateLabel(raw: string): string {
  if (!raw) return "";
  if (raw.length === 8) return `${raw.slice(6, 8)}/${raw.slice(4, 6)}`;
  if (raw.length >= 10) return `${raw.slice(8, 10)}/${raw.slice(5, 7)}`;
  return raw;
}

function buildAreaPath(values: number[], w: number, h: number, pad = 4): { line: string; area: string } {
  if (values.length === 0) return { line: "", area: "" };
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - v / max);
    return [x, y] as const;
  });
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${h - pad} L${points[0][0].toFixed(1)},${h - pad} Z`;
  return { line, area };
}

const card: React.CSSProperties = {
  background: "var(--mkt-card, var(--card, #111111))",
  border: "1px solid var(--mkt-border, var(--border, #1e1e1e))",
  borderRadius: 10,
  padding: "14px 16px",
};

const pillBase: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 500,
  cursor: "pointer",
  border: "1px solid",
  transition: "all 150ms ease",
};

export function GA4Detail() {
  const [preset, setPreset] = useState<Preset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState<GA4Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (preset === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);
    setError("");
    const url = preset === "custom"
      ? `/api/ga4?start=${customStart}&end=${customEnd}`
      : `/api/ga4?preset=${preset}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setError(d.message || d.error);
          return;
        }
        setData(d);
      })
      .catch(() => setError("Error de red al conectar con GA4"))
      .finally(() => setLoading(false));
  }, [preset, customStart, customEnd]);

  useEffect(() => { load(); }, [load]);

  const totalSources = data?.trafficSources.reduce((s, x) => s + x.sessions, 0) ?? 0;
  const totalDevices = data?.deviceBreakdown?.reduce((s, x) => s + x.sessions, 0) ?? 0;
  const dailyValues = (data?.daily ?? []).map(d => d.sessions);
  const usersValues = (data?.daily ?? []).map(d => d.users ?? 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Date pill row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PRESETS.map(p => {
          const active = preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              style={{
                ...pillBase,
                borderColor: active ? GOLD : "var(--mkt-border, var(--border, #1e1e1e))",
                background: active ? GOLD : "transparent",
                color: active ? "#0a0a09" : "var(--mkt-text-muted, var(--muted-foreground))",
                fontWeight: active ? 700 : 500,
              }}>
              {p.label}
            </button>
          );
        })}
      </div>

      {preset === "custom" && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--mkt-border, var(--border, #1e1e1e))", background: "transparent", color: "var(--mkt-text, var(--foreground))", fontSize: 12 }} />
          <span style={{ fontSize: 11, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>hasta</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--mkt-border, var(--border, #1e1e1e))", background: "transparent", color: "var(--mkt-text, var(--foreground))", fontSize: 12 }} />
          <button onClick={load} disabled={!customStart || !customEnd}
            style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: GOLD, color: "#0a0a09", fontSize: 12, fontWeight: 700, cursor: customStart && customEnd ? "pointer" : "not-allowed", opacity: customStart && customEnd ? 1 : 0.5 }}>
            Aplicar
          </button>
        </div>
      )}

      {loading && (
        <div style={{ ...card, fontSize: 12, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>Cargando datos GA4…</div>
      )}

      {error && !loading && (
        <div style={{ ...card, borderColor: "rgba(248,113,113,0.4)", fontSize: 12, color: "#f87171" }}>{error}</div>
      )}

      {data && !loading && !error && (
        <>
          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {[
              { label: "Sesiones", value: data.sessions.toLocaleString("es-CO"), accent: GOLD },
              { label: "Usuarios activos", value: data.activeUsers.toLocaleString("es-CO"), accent: "#6366f1" },
              { label: "Usuarios nuevos", value: data.newUsers.toLocaleString("es-CO"), accent: "#22c55e" },
              { label: "Páginas vistas", value: data.pageviews.toLocaleString("es-CO"), accent: "#a855f7" },
              { label: "Bounce rate", value: `${(data.bounceRate * 100).toFixed(1)}%`, accent: "#ef4444" },
              { label: "Duración media", value: fmtDur(data.avgSessionDuration), accent: "#3b82f6" },
            ].map(k => (
              <div key={k.label} style={{ ...card, borderLeft: `3px solid ${k.accent}` }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: k.accent }}>{k.value}</div>
                <div style={{ fontSize: 10, color: "var(--mkt-text-muted, var(--muted-foreground))", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Trend chart — pure SVG */}
          {data.daily.length > 1 && (
            <div style={{ ...card, padding: "16px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text, var(--foreground))" }}>Tendencia de Tráfico</div>
              <div style={{ fontSize: 10, color: "var(--mkt-text-muted, var(--muted-foreground))", marginTop: 2, marginBottom: 12 }}>Sesiones · Usuarios</div>
              <div style={{ position: "relative", width: "100%", height: 180 }}>
                <TrendSVG sessions={dailyValues} users={usersValues} labels={data.daily.map(d => fmtDateLabel(d.date))} />
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 10, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 2, background: GOLD, borderRadius: 1 }} /> Sesiones
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 2, background: "#6366f1", borderRadius: 1 }} /> Usuarios
                </span>
              </div>
            </div>
          )}

          {/* Top pages + Sources */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <div style={{ ...card, padding: "16px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text, var(--foreground))", marginBottom: 12 }}>Top Páginas</div>
              <BarList items={data.topPages.slice(0, 8).map(p => ({ label: p.page, value: p.views }))} accent={GOLD} />
            </div>
            <div style={{ ...card, padding: "16px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text, var(--foreground))", marginBottom: 4 }}>Fuentes de Tráfico</div>
              <div style={{ fontSize: 10, color: "var(--mkt-text-muted, var(--muted-foreground))", marginBottom: 12 }}>Total {totalSources.toLocaleString("es-CO")} sesiones</div>
              <BarList items={data.trafficSources.slice(0, 8).map((s, i) => ({ label: s.source, value: s.sessions, color: PALETTE[i % PALETTE.length] }))} accent={GOLD} />
            </div>
          </div>

          {/* Devices */}
          {data.deviceBreakdown && data.deviceBreakdown.length > 0 && (
            <div style={{ ...card, padding: "16px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text, var(--foreground))", marginBottom: 14 }}>Dispositivos</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.deviceBreakdown.map((d, i) => {
                  const pct = totalDevices > 0 ? (d.sessions / totalDevices) * 100 : 0;
                  const color = PALETTE[i % PALETTE.length];
                  return (
                    <div key={d.device} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "var(--mkt-text-muted, var(--muted-foreground))", textTransform: "capitalize", fontWeight: 500 }}>{d.device}</span>
                        <span style={{ color: "var(--mkt-text-muted, var(--muted-foreground))" }}>
                          {d.sessions.toLocaleString("es-CO")} ·{" "}
                          <span style={{ fontWeight: 700, color }}>{pct.toFixed(1)}%</span>
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 600ms ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(data as any).range && (
            <div style={{ fontSize: 10, color: "var(--mkt-text-muted, var(--muted-foreground))", opacity: 0.7 }}>
              Rango: {(data as any).range.startDate} → {(data as any).range.endDate}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TrendSVG({ sessions, users, labels }: { sessions: number[]; users: number[]; labels: string[] }) {
  const w = 800, h = 180;
  const sess = buildAreaPath(sessions, w, h);
  const usrs = buildAreaPath(users, w, h);
  const maxLabels = 8;
  const step = Math.max(1, Math.ceil(labels.length / maxLabels));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="gSess" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.35" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gUsr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* horizontal gridlines */}
      {[0.25, 0.5, 0.75].map(p => (
        <line key={p} x1="4" x2={w - 4} y1={h * p} y2={h * p} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      {usrs.area && <path d={usrs.area} fill="url(#gUsr)" />}
      {sess.area && <path d={sess.area} fill="url(#gSess)" />}
      {usrs.line && <path d={usrs.line} fill="none" stroke="#6366f1" strokeWidth="2" />}
      {sess.line && <path d={sess.line} fill="none" stroke={GOLD} strokeWidth="2.5" />}
      {/* x labels (sparse) */}
      {labels.map((lbl, i) => {
        if (i % step !== 0 && i !== labels.length - 1) return null;
        const stepX = labels.length > 1 ? (w - 8) / (labels.length - 1) : 0;
        const x = 4 + i * stepX;
        return <text key={i} x={x} y={h - 2} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="middle">{lbl}</text>;
      })}
    </svg>
  );
}

function BarList({ items, accent }: { items: { label: string; value: number; color?: string }[]; accent: string }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it, i) => {
        const pct = (it.value / max) * 100;
        const color = it.color || accent;
        return (
          <div key={`${it.label}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "var(--mkt-text-muted, var(--muted-foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{it.label}</span>
              <span style={{ fontWeight: 600, color: "var(--mkt-text, var(--foreground))" }}>{it.value.toLocaleString("es-CO")}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
