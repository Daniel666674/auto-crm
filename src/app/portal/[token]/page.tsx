export const dynamic = "force-dynamic";

import { db } from "@/db";
import { clientPortals, contacts, deals, pipelineStages, activities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DealRow {
  id: string;
  title: string;
  value: number;
  expectedClose: Date | null;
  probability: number;
  stageName: string;
  stageColor: string;
}

interface ActivityRow {
  id: string;
  type: string;
  description: string;
  completedAt: Date | null;
  createdAt: Date;
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

// ─── Not found page ───────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
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

  // 3. Get deals with stages
  const dealRows: DealRow[] = db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      expectedClose: deals.expectedClose,
      probability: deals.probability,
      stageName: pipelineStages.name,
      stageColor: pipelineStages.color,
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
      stageName: r.stageName ?? "—",
      stageColor: r.stageColor ?? "#64748b",
    }));

  // 4. Get last 15 activities
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
  const activeDeals = dealRows.length;
  const pipelineTotal = dealRows.reduce((s, d) => s + d.value, 0);
  const nextClose = dealRows
    .filter((d) => d.expectedClose)
    .sort((a, b) => (a.expectedClose!.getTime()) - (b.expectedClose!.getTime()))[0];

  // Next steps = pending activities (completedAt null)
  const nextSteps = activityRows.filter((a) => !a.completedAt).slice(0, 5);
  const recentActivity = activityRows.filter((a) => a.completedAt).slice(0, 8);

  const now = new Date();
  const dateLabel = now.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  const displayName = contact.company || contact.name;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a09",
      color: "#D7D2CB",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "0 0 60px",
    }}>

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
          <span style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#D19C15" }}>
            NEXUS
          </span>
          <span style={{ fontSize: 10, color: "#7a756e", letterSpacing: "0.04em" }}>
            by BlackScale
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#D7D2CB" }}>{displayName}</span>
          <span style={{ fontSize: 12, color: "#7a756e" }}>{dateLabel}</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "36px 24px 0" }}>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#D7D2CB" }}>
            {portal.title}
          </h1>
          <p style={{ fontSize: 13, color: "#7a756e", margin: "4px 0 0" }}>
            Visión general de tus oportunidades activas
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {/* Pipeline activo */}
          <div style={{
            background: "#11110F",
            border: "1px solid rgba(215,210,203,0.07)",
            borderRadius: 12,
            padding: "18px 20px",
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7a756e", marginBottom: 8 }}>
              Pipeline Activo
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#D7D2CB" }}>
              {formatCurrency(pipelineTotal)}
            </div>
            <div style={{ fontSize: 11, color: "#7a756e", marginTop: 4 }}>valor total de oportunidades</div>
          </div>

          {/* Deals activos */}
          <div style={{
            background: "#11110F",
            border: "1px solid rgba(215,210,203,0.07)",
            borderRadius: 12,
            padding: "18px 20px",
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7a756e", marginBottom: 8 }}>
              Deals Activos
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#D7D2CB" }}>{activeDeals}</div>
            <div style={{ fontSize: 11, color: "#7a756e", marginTop: 4 }}>oportunidades en proceso</div>
          </div>

          {/* Próx. cierre */}
          <div style={{
            background: "#11110F",
            border: "1px solid rgba(215,210,203,0.07)",
            borderRadius: 12,
            padding: "18px 20px",
          }}>
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

        {/* ── Deals table ── */}
        <div style={{
          background: "#11110F",
          border: "1px solid rgba(215,210,203,0.07)",
          borderRadius: 12,
          marginBottom: 24,
          overflow: "hidden",
        }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(215,210,203,0.07)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#D7D2CB" }}>Estado de Oportunidades</span>
          </div>

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

        {/* ── Bottom two columns ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Actividad reciente */}
          <div style={{
            background: "#11110F",
            border: "1px solid rgba(215,210,203,0.07)",
            borderRadius: 12,
            overflow: "hidden",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(215,210,203,0.07)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#D7D2CB" }}>Actividad Reciente</span>
            </div>
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

          {/* Próximos pasos */}
          <div style={{
            background: "#11110F",
            border: "1px solid rgba(215,210,203,0.07)",
            borderRadius: 12,
            overflow: "hidden",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(215,210,203,0.07)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#D7D2CB" }}>Próximos Pasos</span>
            </div>
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
                      background: activityDot(a.type),
                      marginTop: 5,
                      flexShrink: 0,
                      border: `2px solid ${activityDot(a.type)}`,
                      background: "transparent",
                    } as React.CSSProperties} />
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

        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const portal = db.select().from(clientPortals).where(eq(clientPortals.token, token)).get();
  if (!portal) return { title: "Portal — Nexus" };
  const contact = db.select().from(contacts).where(eq(contacts.id, portal.contactId)).get();
  const name = contact?.company || contact?.name || "Cliente";
  return { title: `${name} — Nexus` };
}
