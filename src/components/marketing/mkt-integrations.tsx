"use client";

import React, { useEffect, useState } from "react";
import { BSLoading } from "../ui/BSLoading";

interface IntegrationStatus {
  apollo: boolean;
  ga4Property: string | null;
  gscSiteUrl: string | null;
}

type IntegrationState = "connected" | "disconnected" | "planned";

interface IntegrationCard {
  id: string;
  name: string;
  category: string;
  description: string;
  state: IntegrationState;
  detail?: string;
  envVar?: string;
  module: "marketing" | "sales" | "both";
}

const CARD: React.CSSProperties = {
  borderRadius: 10, padding: "16px 18px",
  background: "var(--mkt-card, var(--card))",
  border: "1px solid var(--mkt-border, var(--border))",
  display: "flex", flexDirection: "column", gap: 8,
};

function StateBadge({ state }: { state: IntegrationState }) {
  const cfg: Record<IntegrationState, { label: string; color: string; bg: string }> = {
    connected: { label: "Conectado", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    disconnected: { label: "Sin conectar", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    planned: { label: "Próximamente", color: "var(--mkt-text-muted, #888)", bg: "rgba(255,255,255,0.05)" },
  };
  const c = cfg[state];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: c.bg, color: c.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color }} />
      {c.label}
    </span>
  );
}

function ModuleTag({ module }: { module: "marketing" | "sales" | "both" }) {
  const label = module === "both" ? "M+S" : module === "marketing" ? "Marketing" : "Ventas";
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 6, background: "rgba(195,154,76,0.12)", color: "#C39A4C", textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {label}
    </span>
  );
}

export function MktIntegrations() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/integrations-status")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setStatus)
      .catch(() => setStatus({ apollo: false, ga4Property: null, gscSiteUrl: null }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BSLoading label="Cargando integraciones…" />;

  const cards: IntegrationCard[] = [
    {
      id: "apollo", name: "Apollo.io", category: "Prospección", module: "marketing",
      description: "Enriquecimiento de leads e importación de prospectos vía CSV / API.",
      state: status?.apollo ? "connected" : "disconnected",
      detail: status?.apollo ? "API key configurada" : "Falta APOLLO_API_KEY",
      envVar: "APOLLO_API_KEY",
    },
    {
      id: "ga4", name: "Google Analytics 4", category: "Web Analytics", module: "marketing",
      description: "Tráfico web, fuentes de adquisición y conversiones para atribución.",
      state: status?.ga4Property ? "connected" : "disconnected",
      detail: status?.ga4Property ? `Property ${status.ga4Property}` : "Falta GA4_PROPERTY_ID",
      envVar: "GA4_PROPERTY_ID",
    },
    {
      id: "gsc", name: "Google Search Console", category: "SEO", module: "marketing",
      description: "Posicionamiento orgánico y queries de búsqueda del sitio.",
      state: status?.gscSiteUrl ? "connected" : "disconnected",
      detail: status?.gscSiteUrl ? status.gscSiteUrl : "Falta GSC_SITE_URL",
      envVar: "GSC_SITE_URL",
    },
    // ── Room for future APIs (structured, ready to wire) ──────────────────────
    {
      id: "alegra", name: "Alegra", category: "Facturación / Contabilidad", module: "sales",
      description: "Facturación electrónica y sincronización de deals ganados a contabilidad (Colombia).",
      state: "planned", detail: "Plan documentado en docs/ALEGRA_INTEGRATION_PLAN.md", envVar: "ALEGRA_API_KEY",
    },
    {
      id: "whatsapp", name: "WhatsApp Business", category: "Mensajería", module: "both",
      description: "Conversaciones y notificaciones de seguimiento directo a leads y clientes.",
      state: "planned", envVar: "WHATSAPP_API_KEY",
    },
    {
      id: "wompi", name: "Wompi", category: "Pagos", module: "sales",
      description: "Links de pago para deals (mockup actual — listo para conectar API real).",
      state: "planned", envVar: "WOMPI_API_KEY",
    },
    {
      id: "zapier", name: "Zapier / Webhooks", category: "Automatización", module: "both",
      description: "Disparadores salientes a 5000+ apps. Los workflows internos ya emiten webhooks.",
      state: "planned",
    },
  ];

  const connected = cards.filter(c => c.state === "connected").length;
  const active = cards.filter(c => c.state !== "planned");
  const planned = cards.filter(c => c.state === "planned");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--mkt-text, #e2e8f0)" }}>Integraciones</div>
        <div style={{ width: 40, height: 3, background: "#C39A4C", borderRadius: 2, marginTop: 4 }} />
        <div style={{ fontSize: 12, color: "var(--mkt-text-muted, #718096)", marginTop: 6 }}>
          {connected} de {active.length} servicios conectados · {planned.length} en hoja de ruta
        </div>
      </div>

      {/* Active integrations */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mkt-text-muted, #718096)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Servicios disponibles
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {active.map(c => (
            <div key={c.id} style={CARD}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text, #e2e8f0)" }}>{c.name}</span>
                  <ModuleTag module={c.module} />
                </div>
                <StateBadge state={c.state} />
              </div>
              <div style={{ fontSize: 11, color: "var(--mkt-text-muted, #718096)" }}>{c.category}</div>
              <div style={{ fontSize: 12, color: "var(--mkt-text, #cbd5e1)", lineHeight: 1.4 }}>{c.description}</div>
              {c.detail && (
                <div style={{ fontSize: 11, color: c.state === "connected" ? "#22c55e" : "#f59e0b", marginTop: 2 }}>
                  {c.detail}
                </div>
              )}
              {c.envVar && c.state === "disconnected" && (
                <code style={{ fontSize: 10, color: "var(--mkt-text-muted, #718096)", background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 4, alignSelf: "flex-start" }}>
                  {c.envVar}
                </code>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Planned / API room */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mkt-text-muted, #718096)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Hoja de ruta de APIs
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {planned.map(c => (
            <div key={c.id} style={{ ...CARD, opacity: 0.72, borderStyle: "dashed" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text, #e2e8f0)" }}>{c.name}</span>
                  <ModuleTag module={c.module} />
                </div>
                <StateBadge state={c.state} />
              </div>
              <div style={{ fontSize: 11, color: "var(--mkt-text-muted, #718096)" }}>{c.category}</div>
              <div style={{ fontSize: 12, color: "var(--mkt-text, #cbd5e1)", lineHeight: 1.4 }}>{c.description}</div>
              {c.detail && <div style={{ fontSize: 11, color: "var(--mkt-text-muted, #718096)", marginTop: 2 }}>{c.detail}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--mkt-text-muted, #718096)", padding: "10px 14px", borderRadius: 8, background: "rgba(195,154,76,0.06)", border: "1px solid rgba(195,154,76,0.18)" }}>
        Las API keys se configuran como variables de entorno en el VPS (<code>.env.local</code>) y se reflejan aquí automáticamente al reiniciar.
      </div>
    </div>
  );
}
