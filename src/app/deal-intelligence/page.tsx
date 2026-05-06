import { db } from "@/db";
import { contacts, deals, pipelineStages, activities } from "@/db/schema";
import { asc } from "drizzle-orm";
import { formatCurrency } from "@/lib/constants";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STAGE_AVG_BY_ORDER: Record<number, number> = { 1: 3, 2: 7, 3: 14, 4: 10 };
const STAGE_NEXT_BY_ORDER: Record<number, string> = {
  1: "Calificar lead y agendar primera llamada de descubrimiento",
  2: "Preparar y enviar propuesta inicial personalizada",
  3: "Hacer seguimiento a propuesta — resolver objeciones",
  4: "Cerrar objeciones finales y enviar contrato",
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: `${color}18`, color }}>
      {text}
    </span>
  );
}

export default async function DealIntelligencePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const allStages = db.select().from(pipelineStages).orderBy(asc(pipelineStages.order)).all();
  const allDeals = db.select().from(deals).all();
  const allContacts = db.select().from(contacts).all();
  const allActivities = db.select().from(activities).all();

  const contactMap = Object.fromEntries(allContacts.map(c => [c.id, c]));
  const stageMap = Object.fromEntries(allStages.map(s => [s.id, s]));

  const enriched = allDeals
    .filter(d => { const s = stageMap[d.stageId]; return s && !s.isWon && !s.isLost; })
    .map(d => {
      const stage = stageMap[d.stageId];
      const contact = contactMap[d.contactId] || null;
      const stageOrder = stage?.order ?? 1;
      const avgDays = STAGE_AVG_BY_ORDER[stageOrder] ?? 7;
      const nextAction = STAGE_NEXT_BY_ORDER[stageOrder] ?? null;

      const now = Date.now();
      const createdMs = d.createdAt instanceof Date ? d.createdAt.getTime() : Number(d.createdAt);
      const daysInStage = Math.max(0, Math.floor((now - createdMs) / 86400000));

      const dealActs = allActivities
        .filter(a => a.dealId === d.id)
        .sort((a, b) => {
          const aMs = (a.completedAt instanceof Date ? a.completedAt.getTime() : Number(a.completedAt)) || 0;
          const bMs = (b.completedAt instanceof Date ? b.completedAt.getTime() : Number(b.completedAt)) || 0;
          return bMs - aMs;
        });
      const lastAct = dealActs[0];
      const lastActMs = lastAct
        ? (lastAct.completedAt instanceof Date ? lastAct.completedAt.getTime() : Number(lastAct.completedAt)) ||
          (lastAct.createdAt instanceof Date ? lastAct.createdAt.getTime() : Number(lastAct.createdAt))
        : null;
      const daysSinceAct = lastActMs ? Math.floor((now - lastActMs) / 86400000) : 99;

      const expectedMs = d.expectedClose ? (d.expectedClose instanceof Date ? d.expectedClose.getTime() : Number(d.expectedClose)) : null;
      const overdue = expectedMs ? expectedMs < now : false;

      const risks: string[] = [];
      if (daysSinceAct > 7) risks.push(`Sin actividad hace ${daysSinceAct} días`);
      if (overdue) risks.push("Fecha de cierre vencida");
      if (d.probability < 30) risks.push("Probabilidad baja (<30%)");

      let momentum = "Avanzando", mColor = "#22c55e";
      if (risks.length >= 2) { momentum = "En riesgo"; mColor = "#ef4444"; }
      else if (daysInStage > avgDays * 1.5 || risks.length === 1) { momentum = "Estancado"; mColor = "#f59e0b"; }

      return { ...d, stage, contact, daysInStage, avgDays, daysSinceAct, risks, momentum, mColor, nextAction };
    });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Deal Intelligence</h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Momentum y alertas de riesgo por deal activo</p>
      </div>

      {enriched.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", color: "var(--muted-foreground)" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <div style={{ fontSize: 13 }}>No hay deals activos actualmente</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {enriched.map(deal => (
            <div key={deal.id} style={{
              borderRadius: 10, padding: 18, background: "var(--card)",
              border: "1px solid var(--border)", borderLeft: `3px solid ${deal.mColor}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{deal.title}</span>
                    <Badge text={deal.momentum} color={deal.mColor} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    {deal.contact?.name || "—"} · {deal.stage?.name} · {formatCurrency(deal.value)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 24 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Días en etapa</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: deal.daysInStage > deal.avgDays * 1.5 ? "#ef4444" : "var(--foreground)" }}>
                      {deal.daysInStage}
                      <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted-foreground)" }}> / avg {deal.avgDays}d</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Prob.</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>{deal.probability}%</div>
                  </div>
                </div>
              </div>

              {deal.risks.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {deal.risks.map((r, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                      ⚠ {r}
                    </span>
                  ))}
                </div>
              )}

              {deal.nextAction && (
                <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(209,156,21,0.06)", border: "1px solid rgba(209,156,21,0.12)", fontSize: 12, color: "var(--muted-foreground)", display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--primary)" }}>→</span>
                  <span><strong style={{ color: "var(--foreground)" }}>Próximo paso:</strong> {deal.nextAction}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
