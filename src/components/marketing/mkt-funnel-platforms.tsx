"use client";

import React, { useState } from "react";
import {
  FP_OVERVIEW, FP_PLATFORMS, FP_PILL, FP_STAGE_COLOR, FP_PLATFORM_COLOR, FP_DELTA_UP,
  type StageKey, type PlatformKey, type Seg, type PlatformDetail, type GateRow, type Puck, type HealthCard,
} from "./mkt-funnel-platforms-data";

// Chrome maps to NEXUS marketing theme tokens; stage/platform colors are Julian's exact hexes.
const SURFACE = "var(--mkt-surface)";
const BORDER = "var(--mkt-border)";
const BORDER_STRONG = "rgba(255,255,255,0.14)";
const TEXT = "var(--mkt-text)";
const MUTED = "var(--mkt-text-muted)";
const GOLD = "var(--mkt-accent)";
const ELEVATED = "rgba(255,255,255,0.03)";
const TRACK = "rgba(255,255,255,0.08)";

const COL_LEFT = ["4%", "38%", "72%"];

function BrandIcon({ platform, size = 16 }: { platform: PlatformKey; size?: number }) {
  if (platform === "linkedin") return <svg width={size} height={size} viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" /></svg>;
  if (platform === "meta") return <svg width={size} height={size} viewBox="0 0 24 24" fill="#0866ff"><path d="M22 12.06C22 6.51 17.5 2 12 2S2 6.51 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22c4.78-.79 8.44-4.94 8.44-9.94z" /></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><path fill="#ea4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#4285f4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>;
}

function Pill({ stage, children, small }: { stage: StageKey; children: React.ReactNode; small?: boolean }) {
  const p = FP_PILL[stage];
  return <span style={{ display: "inline-flex", alignItems: "center", padding: small ? "2px 7px" : "4px 10px", borderRadius: 999, fontSize: small ? 9 : 11, fontWeight: 600, background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>{children}</span>;
}

function Rich({ segs }: { segs: Seg[] }) {
  return <>{segs.map((s, i) => s.em ? <strong key={i} style={{ color: s.em === "gold" ? GOLD : s.em === "warn" ? FP_STAGE_COLOR.retention : TEXT, fontWeight: 600 }}>{s.t}</strong> : <React.Fragment key={i}>{s.t}</React.Fragment>)}</>;
}

function Btn({ children, primary, onClick }: { children: React.ReactNode; primary?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: primary ? 600 : 500, cursor: "pointer", whiteSpace: "nowrap", background: primary ? GOLD : ELEVATED, color: primary ? "#1a1408" : TEXT, border: `1px solid ${primary ? GOLD : BORDER}` }}>{children}</button>;
}

const card = (elevated?: boolean): React.CSSProperties => ({ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, ...(elevated ? { backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)" } : {}) });

// ── Funnel map (positioned track with pucks) ──────────────────────────────────
function FunnelTrack({ onSelect }: { onSelect: (p: PlatformKey) => void }) {
  const o = FP_OVERVIEW;
  return (
    <div style={{ ...card(true), padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: TEXT, margin: 0 }}>Mapa del Funnel</h2>
          <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 0" }}>Cada plataforma posicionada en la etapa donde está operando hoy</p>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
          {(["awareness", "consideration", "conversion"] as StageKey[]).map(s => (
            <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: MUTED }}><span style={{ width: 8, height: 8, borderRadius: 4, background: FP_STAGE_COLOR[s] }} />{s[0].toUpperCase() + s.slice(1)}</span>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", height: 320, borderRadius: 12, overflow: "hidden", background: `linear-gradient(90deg, ${FP_STAGE_COLOR.awareness}14 0%, ${FP_STAGE_COLOR.awareness}14 33.33%, ${FP_STAGE_COLOR.consideration}14 33.33%, ${FP_STAGE_COLOR.consideration}14 66.66%, ${FP_STAGE_COLOR.conversion}14 66.66%, ${FP_STAGE_COLOR.conversion}14 100%)` }}>
        {o.stages.map((st, i) => (
          <React.Fragment key={st.key}>
            <div style={{ position: "absolute", top: 14, left: `${2 + i * 33.33}%`, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: FP_STAGE_COLOR[st.key] }}>{st.label}</div>
            <div style={{ position: "absolute", top: 36, left: `${2 + i * 33.33}%`, maxWidth: "28%", fontSize: 11, lineHeight: 1.4, color: MUTED }}>{st.objective}</div>
          </React.Fragment>
        ))}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "33.33%", width: 1, background: BORDER }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "66.66%", width: 1, background: BORDER }} />

        {o.pucks.map((pk: Puck) => (
          <div key={pk.platform} onClick={() => onSelect(pk.platform)} style={{ position: "absolute", left: COL_LEFT[pk.col], top: pk.topPx, minWidth: 180, padding: "12px 14px", borderRadius: 12, cursor: "pointer", background: ELEVATED, border: `1px solid ${BORDER_STRONG}`, borderLeft: `3px solid ${FP_PLATFORM_COLOR[pk.platform]}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: FP_PLATFORM_COLOR[pk.platform] }} /><span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{pk.label}</span></div>
              <Pill stage={pk.pillStage} small>{pk.pill}</Pill>
            </div>
            <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>{pk.context}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{pk.value} <span style={{ fontSize: 12, fontWeight: 400, color: MUTED }}>{pk.unit}</span></div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{pk.footer}<span style={{ color: FP_DELTA_UP }}>{pk.delta}</span></div>
          </div>
        ))}

        {/* Empty consideration stage */}
        <div style={{ position: "absolute", left: COL_LEFT[1], top: 165, minWidth: 180, padding: "12px 14px", borderRadius: 12, background: `${FP_STAGE_COLOR.consideration}0a`, border: `1px dashed ${FP_STAGE_COLOR.consideration}66` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`${FP_STAGE_COLOR.consideration}99`} strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: `${FP_STAGE_COLOR.consideration}e6` }}>{o.emptyStage.title}</span>
          </div>
          <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.5 }}>{o.emptyStage.body}</div>
          <button style={{ background: "none", border: "none", padding: 0, marginTop: 8, fontSize: 10, fontWeight: 600, color: FP_STAGE_COLOR.consideration, cursor: "pointer" }}>{o.emptyStage.cta}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 16 }}>
        {o.tallies.map(t => (
          <div key={t.label} style={{ textAlign: "center", padding: 12, borderRadius: 10, background: ELEVATED, border: t.dashed ? `1px dashed ${FP_STAGE_COLOR.consideration}4d` : `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: FP_STAGE_COLOR[t.color] }}>{t.value}</div>
            <div style={{ fontSize: 10, color: t.noteColor === "retention" ? FP_STAGE_COLOR.retention : MUTED }}>{t.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthCards({ onSelect }: { onSelect: (p: PlatformKey) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: TEXT, margin: 0 }}>Health por Plataforma</h2>
        <span style={{ fontSize: 12, color: MUTED }}>Click en cualquier tarjeta para ver detalle</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {FP_OVERVIEW.health.map((h: HealthCard) => (
          <div key={h.platform} onClick={() => onSelect(h.platform)} style={{ ...card(), padding: 20, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${FP_PLATFORM_COLOR[h.platform]}26`, display: "flex", alignItems: "center", justifyContent: "center" }}><BrandIcon platform={h.platform} /></div>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{h.name}</div><div style={{ fontSize: 10, color: MUTED }}>{h.sub}</div></div>
              </div>
              <Pill stage={h.stage}>{h.stageLabel}</Pill>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>{h.value}</div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, fontWeight: 600, marginBottom: 12 }}>{h.unit}</div>
            <div style={{ height: 6, borderRadius: 999, background: TRACK, overflow: "hidden", marginBottom: 4 }}><div style={{ width: `${h.pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${FP_STAGE_COLOR[h.stage]} 0%, ${FP_STAGE_COLOR[h.stage]}cc 100%)` }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginBottom: 12 }}><span>{h.gateLabel}</span><span style={{ color: FP_DELTA_UP }}>{h.pctLabel}</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
              {h.metrics.map(m => <div key={m.label}><div style={{ fontSize: 10, color: MUTED }}>{m.label}</div><div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{m.value}</div></div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StageGates() {
  const gateColor = (s: string) => s === "check" ? FP_STAGE_COLOR.conversion : s === "fail" ? "#fca5a5" : MUTED;
  const mark = (s: string) => s === "check" ? "✓ " : s === "fail" ? "✕ " : "⏱ ";
  return (
    <div style={{ ...card(true), padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: TEXT, margin: 0 }}>Stage Gates — Criterios para avanzar al siguiente nivel</h2>
          <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 0" }}>Reglas claras de cuándo &quot;graduar&quot; una campaña a la siguiente etapa del funnel</p>
        </div>
        <Btn>Editar reglas</Btn>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: MUTED }}>
            {["Plataforma", "Etapa actual → siguiente", "Criterio 1", "Criterio 2", "Criterio 3", "Acción"].map((h, i) => <th key={h} style={{ padding: "0 0 12px", fontWeight: 600, textAlign: i === 5 ? "right" : "left" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {FP_OVERVIEW.stageGates.map((g: GateRow) => (
              <tr key={g.platform} style={{ borderTop: `1px solid ${BORDER}`, fontSize: 12 }}>
                <td style={{ padding: "12px 0" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: FP_PLATFORM_COLOR[g.platform] }} /><span style={{ fontWeight: 500, color: TEXT }}>{g.name}</span></span></td>
                <td style={{ padding: "12px 0" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Pill stage={g.from.stage}>{g.from.label}</Pill><span style={{ color: MUTED }}>→</span><Pill stage={g.to.stage}>{g.to.label}</Pill></span></td>
                {g.criteria.map((c, i) => <td key={i} style={{ padding: "12px 12px 12px 0", color: gateColor(c.state), whiteSpace: "nowrap" }}>{mark(c.state)}{c.text}</td>)}
                <td style={{ padding: "12px 0", textAlign: "right" }}>{g.action.type === "button" ? <button style={{ background: "none", border: "none", color: GOLD, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>{g.action.text}</button> : <span style={{ color: MUTED }}>{g.action.text}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Budget() {
  const b = FP_OVERVIEW.budget;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
      <div style={{ ...card(), padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0 }}>Distribución de inversión por etapa</h3>
        <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 16px" }}>Cómo está repartido tu spend de los últimos 30 días</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {b.distribution.map(d => (
            <div key={d.stage}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: TEXT }}><span style={{ width: 8, height: 8, borderRadius: 4, background: FP_STAGE_COLOR[d.stage] }} />{d.label}</span>
                <span style={{ color: MUTED }}><strong style={{ color: TEXT }}>{d.amount}</strong> · {d.pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: TRACK, overflow: "hidden" }}><div style={{ width: `${d.pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${FP_STAGE_COLOR[d.stage]} 0%, ${FP_STAGE_COLOR[d.stage]}cc 100%)` }} /></div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MUTED, lineHeight: 1.5 }}><Rich segs={b.benchmark} /></div>
      </div>
      <div style={{ ...card(), padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0 }}>Spend total</h3>
        <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 16px" }}>Últimos 30 días</p>
        <div style={{ fontSize: 30, fontWeight: 700, color: TEXT }}>{b.total.amount}</div>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>COP · <span style={{ color: FP_DELTA_UP }}>{b.total.note}</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
          {b.total.breakdown.map(x => <div key={x.platform} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: TEXT }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: FP_PLATFORM_COLOR[x.platform] }} />{x.label}</span><span>{x.amount}</span></div>)}
        </div>
      </div>
    </div>
  );
}

function OverviewView({ onSelect }: { onSelect: (p: PlatformKey) => void }) {
  const o = FP_OVERVIEW;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Action banner */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 20px", borderRadius: 12, background: `linear-gradient(135deg, ${GOLD}1f 0%, ${GOLD}0a 100%)`, border: `1px solid ${GOLD}4d`, borderLeft: `3px solid ${GOLD}` }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: `${GOLD}1f`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{o.banner.title}</span><Pill stage="consideration">{o.banner.pill}</Pill></div>
          <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.6 }}><Rich segs={o.banner.body} /></p>
        </div>
        <Btn primary>{o.banner.button}</Btn>
      </div>

      <FunnelTrack onSelect={onSelect} />
      <HealthCards onSelect={onSelect} />
      <StageGates />
      <Budget />
    </div>
  );
}

// ── Per-platform detail view ──────────────────────────────────────────────────
function PlatformView({ detail }: { detail: PlatformDetail }) {
  const d = detail;
  const segActive = FP_STAGE_COLOR[d.progression.cols[d.progression.active].stage ?? "awareness"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${FP_PLATFORM_COLOR[d.platform]}26`, display: "flex", alignItems: "center", justifyContent: "center" }}><BrandIcon platform={d.platform} size={20} /></div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: TEXT, margin: 0 }}>{d.name}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}><Pill stage={d.stagePill.stage}>{d.stagePill.label}</Pill><span style={{ fontSize: 12, color: MUTED }}>{d.subtitle}</span></div>
          </div>
        </div>
        <Btn primary>{d.createBtn}</Btn>
      </div>

      {/* Progression */}
      <div style={{ ...card(true), padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0 }}>Tu progresión en el funnel</h3>
        <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 20px" }}>{d.progression.note}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          {d.progression.cols.map((c, i) => (
            <div key={i} style={{ flex: 1, position: "relative" }}>
              <div style={{ height: 8, borderRadius: 999, background: c.active ? `linear-gradient(90deg, ${segActive} 0%, ${segActive}cc 100%)` : TRACK, boxShadow: c.active && d.progression.glow ? `0 0 0 4px ${GOLD}14, 0 0 24px ${GOLD}26` : "none" }} />
              {c.active && <div style={{ position: "absolute", top: -4, right: 0, width: 16, height: 16, borderRadius: 8, background: segActive, border: "2px solid var(--mkt-bg)" }} />}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, fontSize: 12 }}>
          {d.progression.cols.map((c, i) => (
            <div key={i}>
              <div style={{ fontWeight: 600, color: c.active ? FP_STAGE_COLOR[c.stage ?? "awareness"] : MUTED }}>{c.active ? "● " : "○ "}{c.title}{c.active && <span style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}> (actual)</span>}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{c.sub}</div>
              {c.detailStrong ? <div style={{ fontSize: 10, marginTop: 4, color: TEXT, fontWeight: 600 }}>{c.detailStrong}</div> : <div style={{ fontSize: 10, marginTop: 4, color: c.detailColor === "up" ? FP_DELTA_UP : MUTED }}>{c.detail}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
        {d.kpis.map(k => (
          <div key={k.label} style={{ ...card(), padding: 16 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, fontWeight: 600 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT, marginTop: 4 }}>{k.value}</div>
            <div style={{ fontSize: 10, marginTop: 4, color: k.up ? FP_DELTA_UP : MUTED }}>{k.note}</div>
          </div>
        ))}
      </div>

      {/* Campaigns */}
      <div style={{ ...card(true), padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: "0 0 16px" }}>Campañas activas</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: MUTED }}>{d.campaigns.columns.map((h, i) => <th key={i} style={{ padding: "0 12px 12px 0", fontWeight: 600 }}>{h}</th>)}</tr></thead>
            <tbody>
              {d.campaigns.rows.map((r, ri) => (
                <tr key={ri} style={{ borderTop: `1px solid ${BORDER}`, fontSize: 12 }}>
                  <td style={{ padding: "12px 12px 12px 0" }}><div style={{ fontWeight: 500, color: TEXT }}>{r.name}</div><div style={{ fontSize: 10, color: MUTED }}>{r.sub}</div></td>
                  {r.cells.map((c, ci) => (
                    <td key={ci} style={{ padding: "12px 12px 12px 0", whiteSpace: "nowrap", color: c.up ? FP_DELTA_UP : TEXT, fontWeight: c.strong ? 700 : 400 }}>
                      {c.pill ? <Pill stage={c.pill}>{c.v}</Pill> : c.status ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: TEXT }}><span style={{ width: 6, height: 6, borderRadius: 3, background: FP_STAGE_COLOR.conversion }} />{c.v}</span> : c.v}
                    </td>
                  ))}
                  <td style={{ padding: "12px 0", textAlign: "right" }}><button style={{ background: "none", border: "none", color: GOLD, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>{r.action}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {d.recommendations.map((r, i) => {
          const accent = r.variant === "success" ? FP_STAGE_COLOR.conversion : GOLD;
          return (
            <div key={i} style={{ borderRadius: 12, padding: 16, background: `linear-gradient(135deg, ${accent}1a 0%, ${accent}08 100%)`, border: `1px solid ${accent}4d`, borderLeft: `3px solid ${accent}` }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: accent, marginBottom: 4 }}>{r.eyebrow}</div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: "0 0 8px" }}>{r.title}</h4>
              <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, margin: 0 }}><Rich segs={r.body} /></p>
              {r.button && <div style={{ marginTop: 12 }}><Btn primary>{r.button}</Btn></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MktFunnelPlatforms() {
  const [tab, setTab] = useState<"overview" | PlatformKey>("overview");
  const o = FP_OVERVIEW;
  const tabs: { id: "overview" | PlatformKey; label: string; stage?: string }[] = [
    { id: "overview", label: "Vista General" },
    { id: "meta", label: "Meta", stage: "Awareness" },
    { id: "linkedin", label: "LinkedIn", stage: "Awareness" },
    { id: "google", label: "Google Ads", stage: "Conversion" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: TEXT, margin: 0 }}>{o.header.title}</h1>
            <Pill stage="inactive">{o.header.pill}</Pill>
          </div>
          <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 0" }}>{o.header.subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>Últimos 30 días</Btn>
          <Btn><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Exportar</Btn>
          <Btn primary><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Nueva campaña</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, borderBottom: `1px solid ${BORDER}`, paddingBottom: 8, overflowX: "auto" }}>
        {tabs.map(t => {
          const active = tab === t.id;
          const pColor = t.id !== "overview" ? FP_PLATFORM_COLOR[t.id as PlatformKey] : undefined;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", color: active ? TEXT : MUTED, background: active ? ELEVATED : "transparent", border: `1px solid ${active ? BORDER_STRONG : "transparent"}` }}>
              {t.id === "overview" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> : <span style={{ width: 8, height: 8, borderRadius: 4, background: pColor }} />}
              {t.label}
              {t.stage && <span style={{ fontSize: 10, color: MUTED }}>{t.stage}</span>}
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: 10, color: MUTED, display: "inline-flex", alignItems: "center", gap: 6, paddingBottom: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: "#fca5a5" }} />Última sync: {o.lastSync}
        </span>
      </div>

      {tab === "overview" ? <OverviewView onSelect={setTab} /> : <PlatformView detail={FP_PLATFORMS[tab]} />}
    </div>
  );
}
