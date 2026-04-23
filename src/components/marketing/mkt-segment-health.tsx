"use client";

import React from "react";
import { useMkt } from "./mkt-provider";
import { MKT_INDUSTRIES, MKT_SOURCES, MKT_SOURCE_LABELS } from "./mkt-types";
import type { MktContact } from "./mkt-types";

type Segment = {
  label: string;
  total: number;
  engaged: number;
  unengaged: number;
  dead: number;
  engagementRate: number;
  conversionRate: number;
  withDeals: number;
  action: string;
};

function buildSegment(label: string, contacts: MktContact[]): Segment {
  const total = contacts.length;
  const engaged = contacts.filter(c => c.engagementStatus === "hot" || c.engagementStatus === "warm").length;
  const dead = contacts.filter(c => c.engagementStatus === "dead").length;
  const unengaged = total - engaged - dead;
  const engagementRate = total > 0 ? Math.round((engaged / total) * 100) : 0;
  const withDeals = contacts.filter(c => c.passedToSalesAt).length;
  const conversionRate = total > 0 ? Math.round((withDeals / total) * 100) : 0;

  let action = "Monitorear";
  if (engagementRate < 15) action = "Revisar copy";
  else if (conversionRate === 0 && engagementRate > 30) action = "Revisar handoff";
  else if (engagementRate > 40) action = "Escalar";

  return { label, total, engaged, unengaged, dead, engagementRate, conversionRate, withDeals, action };
}

const actionColors: Record<string, string> = {
  "Escalar": "#22c55e",
  "Monitorear": "var(--mkt-text-muted)",
  "Revisar copy": "#ef4444",
  "Revisar handoff": "#f59e0b",
};

function SegmentRow({ seg }: { seg: Segment }) {
  const actionColor = actionColors[seg.action] ?? "var(--mkt-text-muted)";
  return (
    <div style={{
      padding: 16, borderRadius: 10, display: "flex", alignItems: "center", gap: 16,
      background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)",
    }}>
      <div style={{ width: 120, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)" }}>{seg.label}</div>
        <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{seg.total} contactos</div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden" }}>
          {seg.engaged > 0 && <div style={{ width: `${(seg.engaged / seg.total) * 100}%`, background: "#22c55e", transition: "width 0.6s" }} />}
          {seg.unengaged > 0 && <div style={{ width: `${(seg.unengaged / seg.total) * 100}%`, background: "rgba(255,255,255,0.08)", transition: "width 0.6s" }} />}
          {seg.dead > 0 && <div style={{ width: `${(seg.dead / seg.total) * 100}%`, background: "rgba(239,68,68,0.3)", transition: "width 0.6s" }} />}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--mkt-text-muted)" }}>
          <span><span style={{ color: "#22c55e" }}>●</span> {seg.engaged} engaged</span>
          <span><span style={{ color: "rgba(255,255,255,0.3)" }}>●</span> {seg.unengaged} sin engage</span>
          <span><span style={{ color: "#ef4444" }}>●</span> {seg.dead} dead</span>
        </div>
      </div>

      <div style={{ textAlign: "center", width: 70 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--mkt-text)" }}>{seg.engagementRate}%</div>
        <div style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>Engagement</div>
      </div>

      <div style={{ textAlign: "center", width: 70 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--mkt-text)" }}>{seg.conversionRate}%</div>
        <div style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>Conversión</div>
      </div>

      <span style={{
        fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
        background: `${actionColor}15`, color: actionColor,
        border: `1px solid ${actionColor}30`,
      }}>{seg.action}</span>
    </div>
  );
}

function SegmentGroup({ title, segments }: { title: string; segments: Segment[] }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "var(--mkt-accent)" }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {segments.map(seg => <SegmentRow key={seg.label} seg={seg} />)}
      </div>
    </div>
  );
}

export function MktSegmentHealth() {
  const { contacts } = useMkt();

  const byIndustry = MKT_INDUSTRIES
    .map(ind => buildSegment(ind, contacts.filter(c => c.industry === ind)))
    .filter(s => s.total > 0);

  const byTier = [1, 2, 3].map(t => buildSegment(`Tier ${t}`, contacts.filter(c => c.tier === t)));

  const bySource = MKT_SOURCES
    .map(s => buildSegment(MKT_SOURCE_LABELS[s], contacts.filter(c => c.source === s)))
    .filter(s => s.total > 0);

  return (
    <div>
      <SegmentGroup title="Por Industria" segments={byIndustry} />
      <SegmentGroup title="Por Tier" segments={byTier} />
      <SegmentGroup title="Por Fuente de Lead" segments={bySource} />
    </div>
  );
}
