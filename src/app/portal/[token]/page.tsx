export const dynamic = "force-dynamic";

import { db } from "@/db";
import { clientPortals, contacts, deals, pipelineStages, activities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/constants";
import { DEFAULT_PORTAL_CONFIG, type PortalConfig } from "@/types/portal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DealRow {
  id: string;
  title: string;
  value: number;
  expectedClose: Date | null;
  probability: number;
  stageId: string | null;
  stageName: string;
  stageColor: string;
  isWon: boolean | null;
  isLost: boolean | null;
  closedAt: Date | null;
}

interface ActivityRow {
  id: string;
  type: string;
  description: string;
  completedAt: Date | null;
  createdAt: Date;
}

interface StageRow {
  id: string;
  name: string;
  color: string;
  order: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dealHealth(expectedClose: Date | null): { label: string; color: string; bg: string } {
  if (!expectedClose) return { label: "Saludable", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
  const now = new Date();
  const diffDays = Math.floor((expectedClose.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 60) return { label: "Saludable", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
  if (diffDays > 30) return { label: "Atención", color: "#D19C15", bg: "rgba(209,156,21,0.12)" };
  return { label: "En riesgo", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
}

function activityDot(type: string): string {
  switch (type) {
    case "call":    return "#3b82f6";
    case "email":   return "#D19C15";
    case "meeting": return "#8b5cf6";
    case "note":    return "#64748b";
    default:        return "#22c55e";
  }
}

function activityLabel(type: string): string {
  switch (type) {
    case "call":     return "Llamada";
    case "email":    return "Email";
    case "meeting":  return "Reunión";
    case "note":     return "Nota";
    case "follow_up":return "Seguimiento";
    default:         return type;
  }
}

function parseConfig(raw: string | null | undefined): PortalConfig {
  if (!raw) return { ...DEFAULT_PORTAL_CONFIG, widgets: [...DEFAULT_PORTAL_CONFIG.widgets] };
  try {
    const parsed = JSON.parse(raw) as Partial<PortalConfig>;
    return {
      widgets: Array.isArray(parsed.widgets) && parsed.widgets.length > 0 ? parsed.widgets : [...DEFAULT_PORTAL_CONFIG.widgets],
      branding: parsed.branding || {},
      reportCadence: parsed.reportCadence || "monthly",
      kpiTargets: parsed.kpiTargets,
    };
  } catch {
    return { ...DEFAULT_PORTAL_CONFIG, widgets: [...DEFAULT_PORTAL_CONFIG.widgets] };
  }
}

// ─── Not found page ───────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      flex: 1,
      background: "#0a0a09",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 16,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ fontSize: 40, fontWeight: 700, color: "#D19C15" }}>404</div>
      <div style={{ fontSize: 16, color: "#D7D2CB" }}>Portal no encontrado</div>
      <div style={{ fontSize: 13, color: "#7a756e" }}>El enlace puede estar desactivado o ser incorrecto.</div>
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  background: "#11110F",
  border: "1px solid rgba(215,210,203,0.07)",
  borderRadius: 12,
  overflow: "hidden",
};

const CARD_HEADER_STYLE: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid rgba(215,210,203,0.07)",
  fontSize: 13,
  fontWeight: 600,
  color: "#D7D2CB",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // 1. Find portal
  const portal = db
    .select()
    .from(clientPortals)
    .where(eq(clientPortals.token, token))
    .get();

  if (!portal) return <NotFound />;

  // 2. Get contact
  const contact = db
    .select()
    .from(contacts)
    .where(eq(contacts.id, portal.contactId))
    .get();

  if (!contact) return <NotFound />;

  // 3. Parse config
  const config = parseConfig(portal.configJson);
  const enabled = new Set(config.widgets);
  const accent = config.branding?.primaryColor || "#D19C15";
  const targets = config.kpiTargets || {};
  const revenueTarget = targets.monthlyRevenueTarget;
  const leadsTarget = targets.monthlyLeadsTarget;
  const coverageTarget = targets.pipelineCoverageTarget;

  // 4. Get deals with stages
  const dealRows: DealRow[] = db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      expectedClose: deals.expectedClose,
      probability: deals.probability,
      stageId: deals.stageId,
      stageName: pipelineStages.name,
      stageColor: pipelineStages.color,
      isWon: pipelineStages.isWon,
      isLost: pipelineStages.isLost,
      closedAt: deals.closedAt,
    })
    .from(deals)
    .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .where(eq(deals.contactId, portal.contactId))
    .all()
    .map((r) => ({
      id: r.id,
      title: r.title,
      value: r.value,
      expectedClose: r.expectedClose,
      probability: r.probability,
      stageId: r.stageId,
      stageName: r.stageName ?? "—",
      stageColor: r.stageColor ?? "#64748b",
      isWon: r.isWon,
      isLost: r.isLost,
      closedAt: r.closedAt,
    }));

  // 5. All stages
  const allStages: StageRow[] = db
    .select({ id: pipelineStages.id, name: pipelineStages.name, color: pipelineStages.color, order: pipelineStages.order })
    .from(pipelineStages)
    .orderBy(pipelineStages.order)
    .all();

  // 6. Last 15 activities
  const activityRows: ActivityRow[] = db
    .select({
      id: activities.id,
      type: activities.type,
      description: activities.description,
      completedAt: activities.completedAt,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .where(eq(activities.contactId, portal.contactId))
    .orderBy(desc(activities.createdAt))
    .limit(15)
    .all();

  // Stats
  const activeDeals = dealRows.filter((d) => !d.isWon && !d.isLost).length;
  const pipelineTotal = dealRows.filter((d) => !d.isWon && !d.isLost).reduce((s, d) => s + d.value, 0);
  const nextClose = dealRows
    .filter((d) => d.expectedClose && !d.isWon && !d.isLost)
    .sort((a, b) => (a.expectedClose!.getTime()) - (b.expectedClose!.getTime()))[0];

  // KPIs del mes
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthDeals = dealRows.filter((d) => d.closedAt && d.closedAt >= monthStart);
  const wonMonth = monthDeals.filter((d) => d.isWon);
  const lostMonth = monthDeals.filter((d) => d.isLost);
  const wonValueMonth = wonMonth.reduce((s, d) => s + d.value, 0);
  const closedTotal = wonMonth.length + lostMonth.length;
  const winRate = closedTotal > 0 ? Math.round((wonMonth.length / closedTotal) * 100) : 0;

  // Pipeline coverage = (open pipeline) / (revenue target)
  const coverageRatio = revenueTarget && revenueTarget > 0 ? pipelineTotal / revenueTarget : null;
  const coverageOk = coverageRatio !== null && coverageTarget !== undefined
    ? coverageRatio >= coverageTarget
    : null;
  const revenueProgress = revenueTarget && revenueTarget > 0
    ? Math.min(100, Math.round((wonValueMonth / revenueTarget) * 100))
    : null;

  // Funnel
  const funnelData = allStages.map((stage) => {
    const count = dealRows.filter((d) => d.stageId === stage.id).length;
    return { ...stage, count };
  });
  const maxCount = Math.max(1, ...funnelData.map((f) => f.count));

  const nextSteps = activityRows.filter((a) => !a.completedAt).slice(0, 5);
  const recentActivity = activityRows.filter((a) => a.completedAt).slice(0, 8);

  const now = new Date();
  const dateLabel = now.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  const companyLabel = portal.clientCompany || contact.company || contact.name;
  const cadenceLabel = config.reportCadence === "weekly" ? "Semanal" : config.reportCadence === "quarterly" ? "Trimestral" : "Mensual";

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        flex: 1,
        background: "#0a0a09",
        color: "#D7D2CB",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "0 0 60px",
        // CSS var for accent
        ["--portal-accent" as string]: accent,
      } as React.CSSProperties}
    >

      {/* ── Header ── */}
      <div style={{
        background: "#11110F",
        borderBottom: "1px solid rgba(215,210,203,0.07)",
        padding: "0 40px",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {config.branding?.logoUrl && (
            // Use img element directly — server component, no Next/Image to avoid host config
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.branding.logoUrl} alt={companyLabel} style={{ height: 28, width: "auto", objectFit: "contain" }} />
          )}
          <span style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: accent }}>
            NEXUS
          </span>
          <span style={{ fontSize: 10, color: "#7a756e", letterSpacing: "0.04em" }}>
            by BlackScale
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#D7D2CB" }}>{companyLabel}</span>
          <span style={{ fontSize: 12, color: "#7a756e" }}>Reporte {cadenceLabel.toLowerCase()} · {dateLabel}</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "36px 24px 0", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Page title */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#D7D2CB" }}>
            {portal.title}
          </h1>
          <p style={{ fontSize: 13, color: "#7a756e", margin: "4px 0 0" }}>
            Visión general de tus oportunidades activas
          </p>
        </div>

        {/* ── KPI strip ── */}
        {enabled.has("kpi-strip") && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <div style={{ ...CARD_STYLE, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7a756e", marginBottom: 8 }}>
                Pipeline Activo
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#D7D2CB" }}>
                {formatCurrency(pipelineTotal)}
              </div>
              {coverageRatio !== null && coverageTarget !== undefined ? (
                <div style={{ fontSize: 11, color: coverageOk ? "#22c55e" : "#f59e0b", marginTop: 4 }}>
                  Cobertura {coverageRatio.toFixed(1)}x · meta {coverageTarget}x
                </div>
              ) : revenueTarget !== undefined ? (
                <div style={{ fontSize: 11, color: "#7a756e", marginTop: 4 }}>
                  Meta revenue: {formatCurrency(revenueTarget)}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "#7a756e", marginTop: 4 }}>valor total de oportunidades</div>
              )}
            </div>
            <div style={{ ...CARD_STYLE, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7a756e", marginBottom: 8 }}>
                Deals Activos
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#D7D2CB" }}>{activeDeals}</div>
              {leadsTarget !== undefined ? (
                <div style={{ fontSize: 11, color: "#7a756e", marginTop: 4 }}>
                  Meta leads/mes: {leadsTarget}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "#7a756e", marginTop: 4 }}>oportunidades en proceso</div>
              )}
            </div>
            <div style={{ ...CARD_STYLE, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7a756e", marginBottom: 8 }}>
                Próx. Cierre
              </div>
              {nextClose ? (
                <>
                  <div style={{ fontSize: 26, fontWeight: 700, color: "#D7D2CB" }}>
                    {formatDate(nextClose.expectedClose!)}
                  </div>
                  <div style={{ fontSize: 11, color: "#7a756e", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {nextClose.title}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 26, fontWeight: 700, color: "#7a756e" }}>—</div>
              )}
            </div>
          </div>
        )}

        {/* ── KPIs del mes ── */}
        {enabled.has("kpis-month") && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <div style={{ ...CARD_STYLE, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7a756e", marginBottom: 8 }}>Deals ganados</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#D7D2CB" }}>{wonMonth.length}</div>
              <div style={{ fontSize: 11, color: "#7a756e", marginTop: 4 }}>este mes</div>
            </div>
            <div style={{ ...CARD_STYLE, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7a756e", marginBottom: 8 }}>Revenue cerrado</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#D7D2CB" }}>{formatCurrency(wonValueMonth)}</div>
              <div style={{ fontSize: 11, color: "#7a756e", marginTop: 4 }}>este mes</div>
            </div>
            <div style={{ ...CARD_STYLE, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7a756e", marginBottom: 8 }}>Deals perdidos</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#D7D2CB" }}>{lostMonth.length}</div>
              <div style={{ fontSize: 11, color: "#7a756e", marginTop: 4 }}>este mes</div>
            </div>
            <div style={{ ...CARD_STYLE, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7a756e", marginBottom: 8 }}>Win rate</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: accent }}>{winRate}%</div>
              <div style={{ fontSize: 11, color: "#7a756e", marginTop: 4 }}>este mes</div>
            </div>
          </div>
        )}

        {/* ── Funnel ── */}
        {enabled.has("funnel") && (
          <div style={CARD_STYLE}>
            <div style={CARD_HEADER_STYLE}>Embudo de conversión</div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {funnelData.length === 0 ? (
                <div style={{ color: "#7a756e", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Sin etapas configuradas</div>
              ) : funnelData.map((s) => {
                const pct = Math.round((s.count / maxCount) * 100);
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 140, fontSize: 12, color: "#D7D2CB", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.name}
                    </div>
                    <div style={{ flex: 1, height: 14, background: "rgba(215,210,203,0.04)", borderRadius: 7, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: s.color, opacity: 0.85, transition: "width 0.3s" }} />
                    </div>
                    <div style={{ width: 40, textAlign: "right", fontSize: 12, color: "#D7D2CB", fontWeight: 600 }}>{s.count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Deals table ── */}
        {enabled.has("deals-table") && (
          <div style={CARD_STYLE}>
            <div style={CARD_HEADER_STYLE}>Estado de Oportunidades</div>

            {dealRows.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "#7a756e", fontSize: 13 }}>
                Sin oportunidades registradas
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(215,210,203,0.07)" }}>
                    {["Oportunidad", "Etapa", "Valor", "Cierre Esperado", "Estado"].map((h) => (
                      <th key={h} style={{
                        padding: "10px 20px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "#7a756e",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dealRows.map((deal) => {
                    const health = dealHealth(deal.expectedClose);
                    return (
                      <tr key={deal.id} style={{ borderBottom: "1px solid rgba(215,210,203,0.04)" }}>
                        <td style={{ padding: "12px 20px", fontWeight: 500, color: "#D7D2CB" }}>
                          {deal.title}
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            background: `${deal.stageColor}22`,
                            color: deal.stageColor,
                            border: `1px solid ${deal.stageColor}44`,
                          }}>
                            {deal.stageName}
                          </span>
                        </td>
                        <td style={{ padding: "12px 20px", fontWeight: 600, color: "#D7D2CB" }}>
                          {formatCurrency(deal.value)}
                        </td>
                        <td style={{ padding: "12px 20px", color: "#7a756e" }}>
                          {deal.expectedClose ? formatDate(deal.expectedClose) : "—"}
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            background: health.bg,
                            color: health.color,
                          }}>
                            {health.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Bottom two columns: activity + next steps ── */}
        {(enabled.has("activity-feed") || enabled.has("next-steps")) && (
          <div style={{ display: "grid", gridTemplateColumns: enabled.has("activity-feed") && enabled.has("next-steps") ? "1fr 1fr" : "1fr", gap: 14 }}>

            {enabled.has("activity-feed") && (
              <div style={CARD_STYLE}>
                <div style={CARD_HEADER_STYLE}>Actividad Reciente</div>
                <div style={{ padding: "8px 0" }}>
                  {recentActivity.length === 0 ? (
                    <div style={{ padding: "20px", color: "#7a756e", fontSize: 13, textAlign: "center" }}>Sin actividad registrada</div>
                  ) : (
                    recentActivity.map((a) => (
                      <div key={a.id} style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "10px 20px",
                        borderBottom: "1px solid rgba(215,210,203,0.03)",
                      }}>
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: activityDot(a.type),
                          marginTop: 5,
                          flexShrink: 0,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "#D7D2CB", lineHeight: 1.4 }}>{a.description}</div>
                          <div style={{ fontSize: 11, color: "#7a756e", marginTop: 2 }}>
                            {activityLabel(a.type)} · {a.completedAt ? formatRelativeDate(a.completedAt) : "—"}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {enabled.has("next-steps") && (
              <div style={CARD_STYLE}>
                <div style={CARD_HEADER_STYLE}>Próximos Pasos</div>
                <div style={{ padding: "8px 0" }}>
                  {nextSteps.length === 0 ? (
                    <div style={{ padding: "20px", color: "#7a756e", fontSize: 13, textAlign: "center" }}>Sin pasos pendientes</div>
                  ) : (
                    nextSteps.map((a) => (
                      <div key={a.id} style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "10px 20px",
                        borderBottom: "1px solid rgba(215,210,203,0.03)",
                      }}>
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "transparent",
                          marginTop: 5,
                          flexShrink: 0,
                          border: `2px solid ${activityDot(a.type)}`,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "#D7D2CB", lineHeight: 1.4 }}>{a.description}</div>
                          <div style={{ fontSize: 11, color: "#7a756e", marginTop: 2 }}>
                            {activityLabel(a.type)}
                            {a.completedAt ? ` · ${formatRelativeDate(a.completedAt)}` : ""}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── Marketing widgets (stubs) ── */}
        {(enabled.has("mkt-engagement") || enabled.has("mkt-campaigns") || enabled.has("mkt-attribution")) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {enabled.has("mkt-engagement") && (
              <div style={CARD_STYLE}>
                <div style={CARD_HEADER_STYLE}>Engagement de marketing</div>
                <div style={{ padding: "20px", fontSize: 12, color: "#7a756e", lineHeight: 1.6 }}>
                  Módulo de marketing — próximamente disponible.
                </div>
              </div>
            )}
            {enabled.has("mkt-campaigns") && (
              <div style={CARD_STYLE}>
                <div style={CARD_HEADER_STYLE}>Campañas activas</div>
                <div style={{ padding: "20px", fontSize: 12, color: "#7a756e", lineHeight: 1.6 }}>
                  Módulo de marketing — próximamente disponible.
                </div>
              </div>
            )}
            {enabled.has("mkt-attribution") && (
              <div style={CARD_STYLE}>
                <div style={CARD_HEADER_STYLE}>Atribución de revenue</div>
                <div style={{ padding: "20px", fontSize: 12, color: "#7a756e", lineHeight: 1.6 }}>
                  Módulo de marketing — próximamente disponible.
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const portal = db.select().from(clientPortals).where(eq(clientPortals.token, token)).get();
  if (!portal) return { title: "Portal — Nexus" };
  const contact = db.select().from(contacts).where(eq(contacts.id, portal.contactId)).get();
  const name = portal.clientCompany || contact?.company || contact?.name || "Cliente";
  return { title: `${name} — Nexus` };
}
