import { db } from "@/db";
import { contacts, deals, pipelineStages } from "@/db/schema";
import { asc } from "drizzle-orm";
import { formatCurrency } from "@/lib/constants";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const MONTHLY_TARGET = 90_000_000;

function fDate(ts: Date | null) {
  if (!ts) return "Sin fecha";
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: `${color}18`, color }}>
      {text}
    </span>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ borderRadius: 10, padding: "16px 20px", background: "var(--card)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || "var(--foreground)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

type Deal = {
  id: string;
  title: string;
  value: number;
  probability: number;
  expectedClose: Date | null;
  contact: { name: string } | null;
  stage: { name: string } | null;
};

function DealCard({ deal }: { deal: Deal }) {
  return (
    <div style={{ borderRadius: 8, padding: 14, marginBottom: 8, background: "var(--card)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{deal.title}</div>
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>
        {deal.contact?.name || "—"} · {deal.stage?.name}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{formatCurrency(deal.value)}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{fDate(deal.expectedClose)}</span>
          <Badge
            text={`${deal.probability}%`}
            color={deal.probability >= 80 ? "#22c55e" : deal.probability >= 50 ? "#f59e0b" : "#ef4444"}
          />
        </div>
      </div>
    </div>
  );
}

function Col({ label, deals: colDeals, color, bg }: { label: string; deals: Deal[]; color: string; bg: string }) {
  const total = colDeals.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ background: bg, borderRadius: "10px 10px 0 0", padding: "12px 16px", borderBottom: `2px solid ${color}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "var(--foreground)" }}>{formatCurrency(total)}</div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{colDeals.length} deal{colDeals.length !== 1 ? "s" : ""}</div>
      </div>
      <div style={{ paddingTop: 12 }}>
        {colDeals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted-foreground)", fontSize: 13 }}>
            Sin deals en esta categoría
          </div>
        ) : (
          colDeals.map(d => <DealCard key={d.id} deal={d} />)
        )}
      </div>
    </div>
  );
}

export default async function ForecastPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const allStages = db.select().from(pipelineStages).orderBy(asc(pipelineStages.order)).all();
  const allDeals = db.select().from(deals).all();
  const allContacts = db.select().from(contacts).all();

  const contactMap = Object.fromEntries(allContacts.map(c => [c.id, c]));
  const stageMap = Object.fromEntries(allStages.map(s => [s.id, s]));

  const activeDeals: Deal[] = allDeals
    .filter(d => { const s = stageMap[d.stageId]; return s && !s.isWon && !s.isLost; })
    .map(d => ({
      id: d.id, title: d.title, value: d.value, probability: d.probability,
      expectedClose: d.expectedClose ?? null,
      contact: contactMap[d.contactId] ? { name: contactMap[d.contactId].name } : null,
      stage: stageMap[d.stageId] ? { name: stageMap[d.stageId].name } : null,
    }));

  const committed = activeDeals.filter(d => d.probability >= 80);
  const likely = activeDeals.filter(d => d.probability >= 50 && d.probability < 80);
  const possible = activeDeals.filter(d => d.probability < 50);

  const committedTotal = committed.reduce((s, d) => s + d.value, 0);
  const gap = MONTHLY_TARGET - committedTotal;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Revenue Forecast</h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Pipeline ponderado por probabilidad de cierre</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Comprometido >80%" value={formatCurrency(committedTotal)} accent="#22c55e" />
        <StatCard label="Meta mensual" value={formatCurrency(MONTHLY_TARGET)} />
        <StatCard
          label={gap > 0 ? "Gap vs meta" : "Exceso vs meta"}
          value={formatCurrency(Math.abs(gap))}
          sub={gap > 0 ? "⚠ Por debajo del objetivo" : "✓ Por encima del objetivo"}
          accent={gap > 0 ? "#ef4444" : "#22c55e"}
        />
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <Col label="Comprometido · >80%" deals={committed} color="#22c55e" bg="rgba(34,197,94,0.04)" />
        <Col label="Probable · 50–80%" deals={likely} color="#f59e0b" bg="rgba(245,158,11,0.04)" />
        <Col label="Posible · <50%" deals={possible} color="#ef4444" bg="rgba(239,68,68,0.04)" />
      </div>
    </div>
  );
}
