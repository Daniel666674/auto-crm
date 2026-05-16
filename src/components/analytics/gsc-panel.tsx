"use client";

import React, { useCallback, useEffect, useState } from "react";

const GOLD = "#C39A4C";
const PALETTE = ["#C39A4C", "#E8B84B", "#A07C35", "#D4A843", "#7A5E28", "#F5D37E"];

type Preset = "7d" | "thisWeek" | "lastWeek" | "28d" | "30d" | "thisMonth" | "lastMonth" | "90d" | "custom";

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: "7d",        label: "7 días" },
  { id: "thisWeek",  label: "Esta semana" },
  { id: "lastWeek",  label: "Semana pasada" },
  { id: "28d",       label: "28 días" },
  { id: "30d",       label: "30 días" },
  { id: "thisMonth", label: "Este mes" },
  { id: "lastMonth", label: "Mes pasado" },
  { id: "90d",       label: "90 días" },
  { id: "custom",    label: "Personalizado" },
];

interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCReport {
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  queries: GSCRow[];
  pages: GSCRow[];
  countries: GSCRow[];
  daily: GSCRow[];
  range: { startDate: string; endDate: string; preset: string };
  siteUrl: string;
  error?: string;
  message?: string;
}

const card: React.CSSProperties = {
  background: "var(--mkt-card, var(--card, #111111))",
  border: "1px solid var(--mkt-border, var(--border, #1e1e1e))",
  borderRadius: 10,
  padding: "14px 18px",
};

const pill: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 20,
  fontSize: 11,
  cursor: "pointer",
  border: "1px solid",
  transition: "all 150ms ease",
};

function buildLinePath(values: number[], w: number, h: number, pad = 4): { line: string; area: string } {
  if (values.length < 2) return { line: "", area: "" };
  const max = Math.max(...values, 1);
  const stepX = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => [pad + i * stepX, pad + (h - pad * 2) * (1 - v / max)] as [number, number]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
  return { line, area };
}

function TrendSVG({ rows }: { rows: GSCRow[] }) {
  const clicks = rows.map(r => r.clicks);
  const impressions = rows.map(r => r.impressions);
  const labels = rows.map(r => {
    const d = r.keys[0] ?? "";
    return d.length >= 10 ? `${d.slice(8)}/${d.slice(5, 7)}` : d;
  });
  const w = 800, h = 160;
  const c = buildLinePath(clicks, w, h);
  const imp = buildLinePath(impressions, w, h);
  const maxLabels = 8;
  const step = Math.max(1, Math.ceil(labels.length / maxLabels));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.4" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gImpr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(p => (
        <line key={p} x1="4" x2={w - 4} y1={h * p} y2={h * p} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      {imp.area && <path d={imp.area} fill="url(#gImpr)" />}
      {c.area && <path d={c.area} fill="url(#gClicks)" />}
      {imp.line && <path d={imp.line} fill="none" stroke="#6366f1" strokeWidth="1.5" />}
      {c.line && <path d={c.line} fill="none" stroke={GOLD} strokeWidth="2.5" />}
      {labels.map((lbl, i) => {
        if (i % step !== 0 && i !== labels.length - 1) return null;
        const stepX = labels.length > 1 ? (w - 8) / (labels.length - 1) : 0;
        return <text key={i} x={4 + i * stepX} y={h - 2} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="middle">{lbl}</text>;
      })}
    </svg>
  );
}

function BarList({ rows, keyIdx = 0, valueKey, colorKey }: { rows: GSCRow[]; keyIdx?: number; valueKey: keyof GSCRow; colorKey?: boolean }) {
  const values = rows.map(r => r[valueKey] as number);
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r, i) => {
        const label = r.keys[keyIdx] ?? "(unknown)";
        const val = r[valueKey] as number;
        const pct = (val / max) * 100;
        const color = colorKey ? PALETTE[i % PALETTE.length] : GOLD;
        const display = valueKey === "ctr" ? `${(val * 100).toFixed(1)}%`
          : valueKey === "position" ? val.toFixed(1)
          : val.toLocaleString("es-CO");
        return (
          <div key={`${label}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "var(--mkt-text-muted, var(--muted-foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "72%" }}>{label}</span>
              <span style={{ fontWeight: 600, color: "var(--mkt-text, var(--foreground))" }}>{display}</span>
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

export function GSCPanel() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [report, setReport] = useState<GSCReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (preset === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);
    setError("");
    const url = preset === "custom"
      ? `/api/gsc?start=${customStart}&end=${customEnd}`
      : `/api/gsc?preset=${preset}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.message || d.error); return; }
        setReport(d);
      })
      .catch(() => setError("Error de red al conectar con Search Console"))
      .finally(() => setLoading(false));
  }, [preset, customStart, customEnd]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const notConnected = error.toLowerCase().includes("token") || error.toLowerCase().includes("sesión") || error.toLowerCase().includes("not_connected");

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid var(--mkt-border, var(--border, #1e1e1e))",
      background: "var(--mkt-card, var(--card, #111111))",
      overflow: "hidden",
    }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mkt-text, var(--foreground))" }}>Google Search Console</div>
            <div style={{ fontSize: 11, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>Consultas, impresiones, posición promedio</div>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--mkt-text-muted, var(--muted-foreground))", transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--mkt-border, var(--border, #1e1e1e))", padding: "18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Date pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {PRESETS.map(p => {
              const active = preset === p.id;
              return (
                <button key={p.id} onClick={() => setPreset(p.id)} style={{
                  ...pill,
                  borderColor: active ? GOLD : "var(--mkt-border, var(--border, #1e1e1e))",
                  background: active ? GOLD : "transparent",
                  color: active ? "#0a0a09" : "var(--mkt-text-muted, var(--muted-foreground))",
                  fontWeight: active ? 700 : 400,
                }}>{p.label}</button>
              );
            })}
            <button onClick={load} style={{
              ...pill, marginLeft: "auto",
              borderColor: "var(--mkt-border, var(--border, #1e1e1e))",
              background: "transparent",
              color: "var(--mkt-text-muted, var(--muted-foreground))",
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: "inline", marginRight: 4 }}>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />
              </svg>
              Actualizar
            </button>
          </div>

          {preset === "custom" && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--mkt-border, var(--border))", background: "transparent", color: "var(--mkt-text, var(--foreground))", fontSize: 12 }} />
              <span style={{ fontSize: 11, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>hasta</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--mkt-border, var(--border))", background: "transparent", color: "var(--mkt-text, var(--foreground))", fontSize: 12 }} />
              <button onClick={load} disabled={!customStart || !customEnd}
                style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: GOLD, color: "#0a0a09", fontSize: 12, fontWeight: 700, cursor: customStart && customEnd ? "pointer" : "not-allowed", opacity: customStart && customEnd ? 1 : 0.5 }}>
                Aplicar
              </button>
            </div>
          )}

          {loading && (
            <div style={{ ...card, fontSize: 12, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>Cargando Search Console…</div>
          )}

          {error && !loading && (
            <div style={{ ...card, borderColor: "rgba(248,113,113,0.35)", fontSize: 12, color: "#f87171" }}>
              {error}
              {notConnected && (
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>
                  Cierra sesión y vuelve a entrar — el servidor otorgará acceso a Search Console automáticamente.
                </div>
              )}
            </div>
          )}

          {report && !loading && !error && (
            <>
              {/* KPI strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {[
                  { label: "Clics totales",    value: report.totals.clicks.toLocaleString("es-CO"),       accent: GOLD },
                  { label: "Impresiones",       value: report.totals.impressions.toLocaleString("es-CO"),  accent: "#6366f1" },
                  { label: "CTR promedio",      value: `${(report.totals.ctr * 100).toFixed(2)}%`,         accent: "#22c55e" },
                  { label: "Posición promedio", value: report.totals.position.toFixed(1),                  accent: "#f59e0b" },
                ].map(k => (
                  <div key={k.label} style={{ ...card, borderLeft: `3px solid ${k.accent}` }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: k.accent }}>{k.value}</div>
                    <div style={{ fontSize: 10, color: "var(--mkt-text-muted, var(--muted-foreground))", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Trend */}
              {report.daily.length > 1 && (
                <div style={{ ...card, padding: "14px 18px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text, var(--foreground))" }}>Tendencia SEO</div>
                  <div style={{ fontSize: 10, color: "var(--mkt-text-muted, var(--muted-foreground))", marginTop: 2, marginBottom: 12 }}>Clics · Impresiones</div>
                  <TrendSVG rows={report.daily} />
                  <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 10, color: "var(--mkt-text-muted, var(--muted-foreground))" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 10, height: 2, background: GOLD, borderRadius: 1 }} /> Clics
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 10, height: 2, background: "#6366f1", borderRadius: 1 }} /> Impresiones
                    </span>
                  </div>
                </div>
              )}

              {/* Queries + Pages */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                <div style={{ ...card, padding: "14px 18px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text, var(--foreground))", marginBottom: 12 }}>Top Consultas</div>
                  <BarList rows={report.queries} valueKey="clicks" colorKey />
                </div>
                <div style={{ ...card, padding: "14px 18px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text, var(--foreground))", marginBottom: 12 }}>Top Páginas</div>
                  <BarList rows={report.pages} valueKey="clicks" colorKey />
                </div>
              </div>

              {/* Countries + Position table */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                {report.countries.length > 0 && (
                  <div style={{ ...card, padding: "14px 18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text, var(--foreground))", marginBottom: 12 }}>Países</div>
                    <BarList rows={report.countries} valueKey="impressions" colorKey />
                  </div>
                )}
                {report.queries.length > 0 && (
                  <div style={{ ...card, padding: "14px 18px", overflowX: "auto" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text, var(--foreground))", marginBottom: 12 }}>Detalle por consulta</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr>
                          {["Consulta", "Clics", "Impr.", "CTR", "Pos."].map(h => (
                            <th key={h} style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600, color: "var(--mkt-text-muted, var(--muted-foreground))", borderBottom: "1px solid var(--mkt-border, var(--border))" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.queries.map((r, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--mkt-border, var(--border))" }}>
                            <td style={{ padding: "5px 8px", color: "var(--mkt-text, var(--foreground))", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.keys[0]}</td>
                            <td style={{ padding: "5px 8px", color: GOLD, fontWeight: 600 }}>{r.clicks}</td>
                            <td style={{ padding: "5px 8px", color: "var(--mkt-text-muted, var(--muted-foreground))" }}>{r.impressions}</td>
                            <td style={{ padding: "5px 8px", color: "var(--mkt-text-muted, var(--muted-foreground))" }}>{(r.ctr * 100).toFixed(1)}%</td>
                            <td style={{ padding: "5px 8px", color: r.position <= 3 ? "#22c55e" : r.position <= 10 ? "#f59e0b" : "var(--mkt-text-muted, var(--muted-foreground))" }}>{r.position.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 10, color: "var(--mkt-text-muted, var(--muted-foreground))", opacity: 0.7 }}>
                {report.siteUrl} · {report.range.startDate} → {report.range.endDate}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
