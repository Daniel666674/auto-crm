import { db } from "@/db";
import { contacts, deals, activities, pipelineStages } from "@/db/schema";
import { eq, asc, desc, isNull, and } from "drizzle-orm";
import { KPICards } from "@/components/dashboard/KPICards";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { NotificationBanner } from "@/components/dashboard/NotificationBanner";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TodayActionables } from "@/components/dashboard/TodayActionables";
import { RevenueGoal } from "@/components/dashboard/RevenueGoal";
import { WinRateTrend } from "@/components/dashboard/WinRateTrend";
import { DealsAtRisk } from "@/components/dashboard/DealsAtRisk";
import type { ActionableItem } from "@/components/dashboard/TodayActionables";
import type { WinRateMonth } from "@/components/dashboard/WinRateTrend";
import type { RiskDeal } from "@/components/dashboard/DealsAtRisk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import Link from "next/link";
import { NextBestActions } from "@/components/dashboard/NextBestActions";

export const dynamic = "force-dynamic";

function toMs(val: Date | number | null | undefined): number {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  return val < 1e10 ? val * 1000 : val;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "marketing") redirect("/marketing");

  // ── Core data ──────────────────────────────────────────────────────────────
  const allContacts = db.select().from(contacts).where(isNull(contacts.returnedToMarketingAt)).all();
  const activeContactIds = new Set(allContacts.map(c => c.id));
  const allDeals = db.select().from(deals).all().filter(d => activeContactIds.has(d.contactId));
  const stages = db.select().from(pipelineStages).orderBy(asc(pipelineStages.order)).all();
  const allActivities = db
    .select({
      id: activities.id,
      type: activities.type,
      description: activities.description,
      contactId: activities.contactId,
      dealId: activities.dealId,
      scheduledAt: activities.scheduledAt,
      completedAt: activities.completedAt,
      createdAt: activities.createdAt,
      contactName: contacts.name,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .orderBy(desc(activities.createdAt))
    .all();

  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

  // ── Stage classification ───────────────────────────────────────────────────
  const wonStageIds = new Set(stages.filter(s => s.isWon).map(s => s.id));
  const lostStageIds = new Set(stages.filter(s => s.isLost).map(s => s.id));
  const activeDeals = allDeals.filter(d => !wonStageIds.has(d.stageId) && !lostStageIds.has(d.stageId));
  const wonDeals = allDeals.filter(d => wonStageIds.has(d.stageId));

  // ── KPI base stats ─────────────────────────────────────────────────────────
  const mtdRevenue = wonDeals
    .filter(d => toMs(d.updatedAt) >= startOfMonth.getTime())
    .reduce((s, d) => s + d.value, 0);

  // ── Follow-up agenda ──────────────────────────────────────────────────────
  const pending = allActivities.filter(a => !a.completedAt && a.scheduledAt);
  const overdueRaw = pending.filter(a => toMs(a.scheduledAt) < startOfToday.getTime())
    .sort((a, b) => toMs(a.scheduledAt) - toMs(b.scheduledAt))
    .slice(0, 6);
  const todayRaw = pending
    .filter(a => {
      const ms = toMs(a.scheduledAt);
      return ms >= startOfToday.getTime() && ms <= endOfToday.getTime();
    })
    .sort((a, b) => toMs(a.scheduledAt) - toMs(b.scheduledAt))
    .slice(0, 6);

  function toActionable(a: typeof allActivities[number]): ActionableItem {
    return {
      id: a.id,
      type: a.type,
      description: a.description,
      contactId: a.contactId,
      contactName: a.contactName ?? null,
      scheduledAtMs: a.scheduledAt ? toMs(a.scheduledAt) : null,
    };
  }
  const overdueItems = overdueRaw.map(toActionable);
  const todayItems = todayRaw.map(toActionable);

  // ── Deals at risk ─────────────────────────────────────────────────────────
  const lastActByDeal = new Map<string, number>();
  for (const a of allActivities) {
    if (!a.dealId) continue;
    const ms = toMs(a.createdAt);
    const prev = lastActByDeal.get(a.dealId) ?? 0;
    if (ms > prev) lastActByDeal.set(a.dealId, ms);
  }
  const sevenDaysAgo = now - 7 * 86_400_000;

  const dealsWithContacts = db
    .select({
      id: deals.id, title: deals.title, value: deals.value,
      expectedClose: deals.expectedClose, stageId: deals.stageId,
      contactName: contacts.name, updatedAt: deals.updatedAt,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .where(isNull(contacts.returnedToMarketingAt))
    .all();

  const riskDeals: RiskDeal[] = dealsWithContacts
    .filter(d => !wonStageIds.has(d.stageId) && !lostStageIds.has(d.stageId) && d.value > 0)
    .map(d => {
      const last = lastActByDeal.get(d.id) ?? 0;
      const days = Math.floor((now - last) / 86_400_000);
      return { ...d, daysSinceActivity: days };
    })
    .filter(d => d.daysSinceActivity >= 7)
    .sort((a, b) => b.value - a.value || b.daysSinceActivity - a.daysSinceActivity)
    .slice(0, 5)
    .map(d => ({
      id: d.id,
      title: d.title,
      value: d.value,
      contactName: d.contactName ?? null,
      stageName: stages.find(s => s.id === d.stageId)?.name ?? "—",
      daysSinceActivity: d.daysSinceActivity,
    }));

  // ── Win rate trend (last 6 months) ────────────────────────────────────────
  const winRateMonths: WinRateMonth[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const year = d.getFullYear();
    const month = d.getMonth();
    const inMonth = (ts: Date | number) => {
      const date = ts instanceof Date ? ts : new Date(toMs(ts));
      return date.getFullYear() === year && date.getMonth() === month;
    };
    const won = wonDeals.filter(d => inMonth(d.updatedAt)).length;
    const lost = allDeals.filter(d => lostStageIds.has(d.stageId) && inMonth(d.updatedAt)).length;
    return {
      label: d.toLocaleString("es-CO", { month: "short" }),
      won, lost,
      rate: (won + lost) > 0 ? Math.round(won / (won + lost) * 100) : 0,
    };
  });

  // ── Pipeline chart data ───────────────────────────────────────────────────
  const pipelineData = stages
    .filter(s => !s.isLost)
    .map(stage => ({
      name: stage.name,
      count: allDeals.filter(d => d.stageId === stage.id).length,
      value: allDeals.filter(d => d.stageId === stage.id).reduce((s, d) => s + d.value, 0),
      color: stage.color,
    }));

  // ── Recent activities ─────────────────────────────────────────────────────
  const recentActivities = allActivities.slice(0, 6).map(a => ({
    id: a.id, type: a.type, description: a.description,
    contactName: a.contactName ?? null, createdAt: a.createdAt as Date,
  }));

  // ── Hot leads ────────────────────────────────────────────────────────────
  const hotLeadsList = db
    .select({ id: contacts.id, name: contacts.name, company: contacts.company, score: contacts.score })
    .from(contacts)
    .where(and(eq(contacts.temperature, "hot"), isNull(contacts.returnedToMarketingAt)))
    .limit(5)
    .all();

  // ── Upcoming closes ──────────────────────────────────────────────────────
  const upcomingDeals = dealsWithContacts
    .filter(d => !wonStageIds.has(d.stageId) && !lostStageIds.has(d.stageId) && d.expectedClose)
    .sort((a, b) => toMs(a.expectedClose) - toMs(b.expectedClose))
    .slice(0, 4);

  const daysUntil = (val: Date | number | null) => {
    if (!val) return null;
    return Math.ceil((toMs(val) - now) / 86_400_000);
  };

  // ── Stats for KPI row ────────────────────────────────────────────────────
  const enhancedStats = {
    totalContacts: allContacts.length,
    activeDeals: activeDeals.length,
    totalPipelineValue: activeDeals.reduce((s, d) => s + d.value, 0),
    wonDealsValue: wonDeals.reduce((s, d) => s + d.value, 0),
    conversionRate: allDeals.length > 0 ? Math.round(wonDeals.length / allDeals.length * 100) : 0,
    hotLeads: allContacts.filter(c => c.temperature === "hot").length,
    overdueCount: overdueRaw.length,
    mtdRevenue,
  };

  const todayLabel = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <NotificationBanner />

      {/* Header + Quick Actions */}
      <QuickActions date={todayLabel} />

      {/* KPI Cards */}
      <KPICards stats={enhancedStats} />

      {/* Priority Row: Today's Agenda + Revenue Goal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TodayActionables overdue={overdueItems} today={todayItems} />
        </div>
        <div>
          <RevenueGoal />
        </div>
      </div>

      {/* Intelligence Row: Win Rate + Deals at Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WinRateTrend months={winRateMonths} />
        <DealsAtRisk deals={riskDeals} />
      </div>

      {/* Pipeline + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PipelineChart data={pipelineData} />
        </div>
        <div>
          <RecentActivity activities={recentActivities as Parameters<typeof RecentActivity>[0]["activities"]} />
        </div>
      </div>

      {/* Hot Leads + Upcoming Closes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hot Leads */}
        <div className="rounded-xl p-5 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold mb-4">Leads Calientes</h3>
          {hotLeadsList.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Sin leads calientes</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {hotLeadsList.map(c => (
                <Link key={c.id} href={`/contacts/${c.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                    borderRadius: 8, background: "var(--background)",
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", background: "var(--primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--primary-foreground)", fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>
                      {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.company}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <div style={{ width: 44, height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ width: `${c.score ?? 0}%`, height: "100%", background: "#ef4444", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{c.score ?? 0}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Closes */}
        <div className="rounded-xl p-5 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold mb-4">Próximos Cierres</h3>
          {upcomingDeals.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Sin cierres próximos</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {upcomingDeals.map(d => {
                const days = daysUntil(d.expectedClose);
                return (
                  <div key={d.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 0", borderBottom: "1px solid var(--border)",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{d.contactName}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{formatCurrency(d.value)}</div>
                      <div style={{ fontSize: 11, color: days !== null && days <= 3 ? "#ef4444" : "var(--muted-foreground)" }}>
                        {days === null ? "—" : days <= 0 ? "Vencido" : `${days}d`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Next Best Actions */}
      <NextBestActions />
    </div>
  );
}
