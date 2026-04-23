"use client";

import React, { useState } from "react";
import { MktProvider, useMkt } from "@/components/marketing/mkt-provider";
import { MktSidebar } from "@/components/marketing/mkt-sidebar";
import { MktEngagementBoard } from "@/components/marketing/mkt-engagement-board";
import { MktCampaignWall } from "@/components/marketing/mkt-campaign-wall";
import { MktSegmentHealth } from "@/components/marketing/mkt-segment-health";
import { MktAttributionDashboard } from "@/components/marketing/mkt-attribution";
import { MktHandoffCenter } from "@/components/marketing/mkt-handoff-center";
import { MKT_THEME_VARS } from "@/components/marketing/mkt-utils";
import type { MktSection } from "@/components/marketing/mkt-types";

const SECTION_LABELS: Record<MktSection, string> = {
  engagement: "Engagement Board",
  campaigns: "Campañas",
  segments: "Segmentos",
  attribution: "Atribución",
  handoff: "Handoff Center",
};

function MarketingContent() {
  const [section, setSection] = useState<MktSection>("engagement");
  const { notifications, loading } = useMkt();
  const lastNotification = notifications[notifications.length - 1];

  const renderSection = () => {
    if (loading) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh" }}>
          <div style={{ fontSize: 14, color: "var(--mkt-text-muted)" }}>Cargando datos de marketing…</div>
        </div>
      );
    }
    switch (section) {
      case "engagement": return <MktEngagementBoard />;
      case "campaigns": return <MktCampaignWall />;
      case "segments": return <MktSegmentHealth />;
      case "attribution": return <MktAttributionDashboard />;
      case "handoff": return <MktHandoffCenter />;
    }
  };

  return (
    <div
      style={{
        ...MKT_THEME_VARS,
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", background: "var(--mkt-bg)",
        fontFamily: "'Inter', -apple-system, sans-serif",
        overflow: "hidden",
      } as React.CSSProperties}
    >
      <MktSidebar current={section} onNavigate={setSection} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <header style={{
          height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", borderBottom: "1px solid var(--mkt-border)",
          background: "var(--mkt-surface)", flexShrink: 0,
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--mkt-text)", margin: 0 }}>
            {SECTION_LABELS[section]}
          </h1>
          {lastNotification && (
            <div style={{ fontSize: 12, color: "var(--mkt-accent)", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--mkt-accent)" }} />
              {lastNotification.text}
            </div>
          )}
        </header>

        {/* Main */}
        <main style={{
          flex: 1, padding: 24, overflowY: "auto", color: "var(--mkt-text)",
        }}>
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <MktProvider>
      <MarketingContent />
    </MktProvider>
  );
}
