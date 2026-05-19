import { db } from "@/db";
import { contacts, activities } from "@/db/schema";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { MSHealthScore } from "@/components/dashboard/MSHealthScore";

export const dynamic = "force-dynamic";

function toMs(val: Date | number | null | undefined): number {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  return val < 1e10 ? val * 1000 : val;
}

// ── Internal sub-components (not exported) ────────────────────────────────────

function SectionCard({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      borderRadius: 12, padding: 20, border: "1px solid var(--border)",
      background: "var(--card)", display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function BreachRow({ name, company, hoursOverdue }: {
  name: string;
  company: string | null;
  hoursOverdue: number;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 0", borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: "rgba(239,68,68,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, color: "#ef4444",
      }}>
        {name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        {company && (
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {company}
          </div>
        )}
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: "#ef4444",
        background: "rgba(239,68,68,0.08)", padding: "2px 7px", borderRadius: 12, flexShrink: 0,
      }}>
        +{hoursOverdue}h
      </div>
    </div>
  );
}

function FunnelBar({ label, count, total, color }: {
  label: string; count: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{count}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: color, transition: "width 0.4s" }} />
      </div>
      <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{pct}% del total</div>
    </div>
  );
}

// ── Page (server component) ───────────────────────────────────────────────────

export default async function MSCommandPage() {
  const now = Date.now();
  const ago24h = now - 24 * 60 * 60 * 1000;
  const ago14d = now - 14 * 24 * 60 * 60 * 1000;
  const ago30d = now - 30 * 24 * 60 * 60 * 1000;

  // ── All contacts (minimal fields) ─────────────────────────────────────────
  const allContacts = db.select({
    id: contacts.id,
    name: contacts.name,
    company: contacts.company,
    lifecycleStage: contacts.lifecycleStage,
    returnedToMarketingAt: contacts.returnedToMarketingAt,
    returnedToMarketingReason: contacts.returnedToMarketingReason,
    updatedAt: contacts.updatedAt,
    createdAt: contacts.createdAt,
  }).from(contacts).all();

  // ── Funnel counts by lifecycle stage ─────────────────────────────────────
  const FUNNEL_STAGES = [
    { key: "lead", label: "Leads", color: "#3b82f6" },
    { key: "MQL", label: "MQL", color: "#8b5cf6" },
    { key: "SQL", label: "SQL", color: "#D19C15" },
    { key: "opportunity", label: "Opportunity", color: "#f97316" },
    { key: "customer", label: "Cliente", color: "#22c55e" },
  ] as const;

  const funnelCounts = FUNNEL_STAGES.map(s => ({
    ...s,
    count: allContacts.filter(c => c.lifecycleStage === s.key).length,
  }));
  const totalFunnel = allContacts.length;

  // ── SLA breaches: MQL contacts older than 24h, not returned ──────────────
  const slaBreaches = allContacts
    .filter(c =>
      c.lifecycleStage === "MQL" &&
      c.returnedToMarketingAt === null &&
      toMs(c.updatedAt) < ago24h
    )
    .map(c => ({
      id: c.id,
      name: c.name,
      company: c.company,
      hoursOverdue: Math.floor((now - toMs(c.updatedAt)) / 3_600_000),
    }))
    .sort((a, b) => b.hoursOverdue - a.hoursOverdue)
    .slice(0, 8);

  // ── Stuck leads by stage (> 14 days without update) ──────────────────────
  const STUCK_STAGES = ["lead", "MQL", "SQL"] as const;
  const stuckByStage: Record<string, number> = {};
  for (const stage of STUCK_STAGES) {
    stuckByStage[stage] = allContacts.filter(c =>
      c.lifecycleStage === stage &&
      c.returnedToMarketingAt === null &&
      toMs(c.updatedAt) < ago14d
    ).length;
  }

  // ── Return-to-marketing reasons last 30 days ──────────────────────────────
  const recentReturns = allContacts.filter(c =>
    c.returnedToMarketingAt !== null &&
    toMs(c.returnedToMarketingAt) > ago30d
  );

  const reasonCounts: Record<string, number> = {};
  for (const c of recentReturns) {
    const reason = c.returnedToMarketingReason ?? "Sin razón";
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
  }
  const sortedReasons = Object.entries(reasonCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // ── Recent activities ─────────────────────────────────────────────────────
  const recentActs = db.select({
    id: activities.id,
    type: activities.type,
    description: activities.description,
    contactName: contacts.name,
    createdAt: activities.createdAt,
  })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .orderBy(desc(activities.createdAt))
    .limit(8)
    .all();

  // ── Health score data (inline, same formula as API) ───────────────────────
  const MQL_AND_ABOVE = ["MQL", "SQL", "opportunity", "customer", "won"];
  const SQL_AND_ABOVE = ["SQL", "opportunity", "customer", "won"];

  const mqlAndAbove = allContacts.filter(c => MQL_AND_ABOVE.includes(c.lifecycleStage ?? "lead"));
  const sqlAndAbove = allContacts.filter(c => SQL_AND_ABOVE.includes(c.lifecycleStage ?? "lead"));
  const handoffRate = mqlAndAbove.length > 0 ? sqlAndAbove.length / mqlAndAbove.length : 0;
  const handoffPts = Math.min(25, Math.round(handoffRate * 25));

  const returnedLast30 = allContacts.filter(c => c.returnedToMarketingAt !== null && toMs(c.returnedToMarketingAt) >= ago30d).length;
  const handedLast30 = allContacts.filter(c => SQL_AND_ABOVE.includes(c.lifecycleStage ?? "lead") && toMs(c.updatedAt) >= ago30d).length;
  const returnRateVal = handedLast30 > 0 ? returnedLast30 / handedLast30 : 0;
  const returnPts = returnRateVal <= 0.1 ? 20 : returnRateVal <= 0.2 ? 10 : 0;

  const mqlLast60 = allContacts.filter(c => MQL_AND_ABOVE.includes(c.lifecycleStage ?? "lead") && toMs(c.updatedAt) >= (now - 60 * 24 * 3_600_000)).length;
  const sqlLast60 = allContacts.filter(c => SQL_AND_ABOVE.includes(c.lifecycleStage ?? "lead") && toMs(c.updatedAt) >= (now - 60 * 24 * 3_600_000)).length;
  const mqlToSqlRateVal = mqlLast60 > 0 ? sqlLast60 / mqlLast60 : 0;
  const mqlToSqlPts = Math.min(20, Math.round((mqlToSqlRateVal / 0.35) * 20));

  const activeContacts = allContacts.filter(c => ["lead", "MQL", "SQL"].includes(c.lifecycleStage ?? "lead"));
  const staleCount = activeContacts.filter(c => c.returnedToMarketingAt === null && toMs(c.updatedAt) < ago14d).length;
  const staleRateVal = activeContacts.length > 0 ? staleCount / activeContacts.length : 0;
  const stalePts = staleRateVal <= 0.1 ? 15 : staleRateVal <= 0.2 ? 8 : 0;

  const newLast30 = allContacts.filter(c => toMs(c.createdAt) >= ago30d).length;
  const volumePts = newLast30 > 10 ? 20 : newLast30 > 5 ? 10 : 5;

  const healthScore = Math.min(100, handoffPts + returnPts + mqlToSqlPts + stalePts + volumePts);
  const getLabel = (s: number) => s >= 80 ? "Excelente" : s >= 65 ? "Bueno" : s >= 45 ? "Regular" : "Crítico";

  const healthData = {
    score: healthScore,
    label: getLabel(healthScore),
    breakdown: {
      handoffAcceptance: { pts: handoffPts, max: 25, rate: handoffRate },
      returnRate: { pts: returnPts, max: 20, rate: returnRateVal },
      mqlToSql: { pts: mqlToSqlPts, max: 20, rate: mqlToSqlRateVal },
      staleLead: { pts: stalePts, max: 15, rate: staleRateVal },
      volume: { pts: volumePts, max: 20, count: newLast30 },
    },
  };

  const todayLabel = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const ACT_TYPE_ICON: Record<string, string> = {
    call: "📞", email: "✉️", meeting: "🤝", note: "📝", follow_up: "⏰",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
            Command Center M+S
          </h1>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Vista unificada de ambos módulos
          </p>
        </div>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)", paddingTop: 4 }}>{todayLabel}</span>
      </div>

      {/* Row 1: Health Score + SLA Breaches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Health score widget (client — fetches live or uses SSR data) */}
        <MSHealthScore initialData={healthData} />

        {/* SLA Breaches */}
        <SectionCard
          title="Breaches SLA"
          subtitle={`${slaBreaches.length} MQLs sin atención >24h`}
        >
          {slaBreaches.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Sin incumplimientos activos</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {slaBreaches.map(c => (
                <BreachRow key={c.id} name={c.name} company={c.company} hoursOverdue={c.hoursOverdue} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Row 2: Funnel */}
      <SectionCard title="Embudo de Ciclo de Vida" subtitle="Distribución actual de contactos por etapa">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {funnelCounts.map(s => (
            <FunnelBar key={s.key} label={s.label} count={s.count} total={totalFunnel} color={s.color} />
          ))}
        </div>
      </SectionCard>

      {/* Row 3: Stuck Leads + Returns by Reason */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stuck Leads */}
        <SectionCard title="Leads Estancados" subtitle=">14 días sin actualización">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STUCK_STAGES.map(stage => (
              <div key={stage} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", borderRadius: 8, background: "var(--background)",
              }}>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{stage} &gt;14d</span>
                <span style={{
                  fontSize: 16, fontWeight: 800,
                  color: stuckByStage[stage] > 0 ? "#ef4444" : "#22c55e",
                }}>
                  {stuckByStage[stage]}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Returns by reason */}
        <SectionCard title="Motivos de Retorno" subtitle={`Últimos 30 días · ${recentReturns.length} total`}>
          {sortedReasons.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Sin retornos recientes</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sortedReasons.map(([reason, count]) => (
                <div key={reason} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: "1px solid var(--border)",
                }}>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {reason}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", flexShrink: 0, marginLeft: 10 }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Row 4: Recent Activities */}
      <SectionCard title="Actividad Reciente" subtitle="Últimas 8 interacciones registradas">
        {recentActs.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Sin actividad reciente</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentActs.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: "var(--background)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 13,
                }}>
                  {ACT_TYPE_ICON[a.type] ?? "📝"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.description}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                    {a.contactName ?? "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
