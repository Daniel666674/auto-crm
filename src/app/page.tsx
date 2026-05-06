import { db } from "@/db";
import { contacts, deals, activities, pipelineStages } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { KPICards } from "@/components/dashboard/KPICards";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { NotificationBanner } from "@/components/dashboard/NotificationBanner";
import type { DashboardStats } from "@/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "marketing") redirect("/marketing");
  const allContacts = db.select().from(contacts).all();
  const allDeals = db.select().from(deals).all();
  const stages = db
    .select()
    .from(pipelineStages)
    .orderBy(asc(pipelineStages.order))
    .all();

  const activeDeals = allDeals.filter((d) => {
    const stage = stages.find((s) => s.id === d.stageId);
    return stage && !stage.isWon && !stage.isLost;
  });

  const wonDeals = allDeals.filter((d) => {
    const stage = stages.find((s) => s.id === d.stageId);
    return stage?.isWon;
  });

  const stats: DashboardStats = {
    totalContacts: allContacts.length,
    activeDeals: activeDeals.length,
    totalPipelineValue: activeDeals.reduce((sum, d) => sum + d.value, 0),
    wonDealsValue: wonDeals.reduce((sum, d) => sum + d.value, 0),
    conversionRate:
      allDeals.length > 0
        ? Math.round((wonDeals.length / allDeals.length) * 100)
        : 0,
    hotLeads: allContacts.filter((c) => c.temperature === "hot").length,
  };

  const pipelineData = stages
    .filter((s) => !s.isLost)
    .map((stage) => ({
      name: stage.name,
      count: allDeals.filter((d) => d.stageId === stage.id).length,
      value: allDeals
        .filter((d) => d.stageId === stage.id)
        .reduce((sum, d) => sum + d.value, 0),
      color: stage.color,
    }));

  const recentActivities = db
    .select({
      id: activities.id,
      type: activities.type,
      description: activities.description,
      contactName: contacts.name,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .orderBy(desc(activities.createdAt))
    .limit(6)
    .all();

  const hotLeadsList = db
    .select({ id: contacts.id, name: contacts.name, company: contacts.company, score: contacts.score })
    .from(contacts)
    .where(eq(contacts.temperature, "hot"))
    .limit(5)
    .all();

  const dealsWithContacts = db
    .select({
      id: deals.id, title: deals.title, value: deals.value,
      expectedClose: deals.expectedClose, stageId: deals.stageId,
      contactName: contacts.name,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .all();

  const upcomingDeals = dealsWithContacts
    .filter(d => {
      const stage = stages.find(s => s.id === d.stageId);
      return stage && !stage.isWon && !stage.isLost && d.expectedClose;
    })
    .sort((a, b) => (a.expectedClose ?? Infinity) - (b.expectedClose ?? Infinity))
    .slice(0, 4);

  const now = Date.now();
  const daysUntil = (ts: number | null) =>
    ts ? Math.ceil((ts - now) / 86400000) : null;

  return (
    <div className="space-y-6">
      <NotificationBanner />

      <KPICards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PipelineChart data={pipelineData} />
        </div>
        <div>
          <RecentActivity activities={recentActivities as Array<{ id: string; type: string; description: string; contactName: string | null; createdAt: number | Date; }>} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hot Leads */}
        <div className="rounded-xl p-5 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold mb-4">Leads Calientes</h3>
          {hotLeadsList.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Sin leads calientes</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {hotLeadsList.map(c => (
                <Link key={c.id} href={`/contacts/${c.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    borderRadius: 8, background: "var(--background)", cursor: "pointer",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", background: "var(--primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--primary-foreground)", fontSize: 11, fontWeight: 600, flexShrink: 0,
                    }}>
                      {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{c.company}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <div style={{ width: 48, height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ width: `${c.score ?? 0}%`, height: "100%", borderRadius: 2, background: "#ef4444" }} />
                      </div>
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{c.score ?? 0}</span>
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
                      <div className="text-sm font-medium truncate">{d.title}</div>
                      <div className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{d.contactName}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="text-sm font-semibold" style={{ color: "var(--primary)" }}>{formatCurrency(d.value)}</div>
                      <div className="text-xs" style={{ color: days !== null && days <= 3 ? "#ef4444" : "var(--muted-foreground)" }}>
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
    </div>
  );
}
