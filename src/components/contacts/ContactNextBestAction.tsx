"use client";

interface Deal { stageId: string; createdAt: number | Date; }
interface Activity { type: string; scheduledAt: number | Date | null; completedAt: number | Date | null; createdAt: number | Date; }
interface Stage { id: string; order: number; isWon: boolean; isLost: boolean; }

interface Props {
  temperature: string;
  deals: Deal[];
  activities: Activity[];
  stages: Stage[];
  onLogActivity: () => void;
  onCreateDeal?: () => void;
}

function daysSince(val: number | Date | null | undefined): number | null {
  if (!val) return null;
  const ms = val instanceof Date ? val.getTime() : val < 1e10 ? val * 1000 : val;
  return Math.floor((Date.now() - ms) / 86400000);
}

export function ContactNextBestAction({ temperature, deals, activities, stages, onLogActivity, onCreateDeal }: Props) {
  const stageMap = new Map(stages.map(s => [s.id, s]));
  const activeDeals = deals.filter(d => {
    const s = stageMap.get(d.stageId);
    return s && !s.isWon && !s.isLost;
  });

  const lastActivity = activities.reduce<number | Date | null>((latest, a) => {
    const ts = a.completedAt || a.createdAt;
    if (!latest) return ts;
    const tMs = ts instanceof Date ? ts.getTime() : ts < 1e10 ? ts * 1000 : ts;
    const lMs = latest instanceof Date ? latest.getTime() : latest < 1e10 ? latest * 1000 : latest;
    return tMs > lMs ? ts : latest;
  }, null);

  const daysSinceLast = daysSince(lastActivity);
  const hasOverdue = activities.some(a => !a.completedAt && a.scheduledAt && daysSince(a.scheduledAt) !== null && daysSince(a.scheduledAt)! > 0);
  const hasMeeting = activities.some(a => a.type === "meeting");
  const earlyDeal = activeDeals.find(d => { const s = stageMap.get(d.stageId); return s && s.order <= 2; });

  let icon = "→";
  let action = "";
  let detail = "";
  let color = "var(--primary)";
  let onClick: (() => void) | null = null;

  if (hasOverdue) {
    icon = "⏰"; color = "#ef4444";
    action = "Completar seguimiento vencido";
    detail = "Tienes una actividad programada que ya venció.";
    onClick = onLogActivity;
  } else if (activeDeals.length === 0 && (temperature === "hot" || temperature === "warm")) {
    icon = "💰"; color = "#22c55e";
    action = "Crear un deal";
    detail = "Este contacto es un buen candidato — no tiene oportunidad activa.";
    onClick = onCreateDeal ?? null;
  } else if (earlyDeal && !hasMeeting) {
    icon = "🤝"; color = "#3b82f6";
    action = "Agendar reunión de descubrimiento";
    detail = "El deal está en etapa temprana y no hay reunión registrada.";
    onClick = onLogActivity;
  } else if (daysSinceLast !== null && daysSinceLast >= 14 && (temperature === "hot" || temperature === "warm")) {
    icon = "📧"; color = "#f59e0b";
    action = "Re-enganchar: enviar email o llamar";
    detail = `Sin contacto desde hace ${daysSinceLast} días.`;
    onClick = onLogActivity;
  } else if (daysSinceLast === null) {
    icon = "👋"; color = "var(--primary)";
    action = "Registrar primer contacto";
    detail = "Aún no hay actividades con este prospecto.";
    onClick = onLogActivity;
  } else {
    icon = "✅"; color = "#22c55e";
    action = "Contacto al día";
    detail = `Última actividad hace ${daysSinceLast}d. Todo en orden.`;
  }

  return (
    <div style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${color}33`, background: `${color}08`, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 2 }}>{action}</div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{detail}</div>
      </div>
      {onClick && (
        <button
          onClick={onClick}
          style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${color}`, background: `${color}18`, color, flexShrink: 0, whiteSpace: "nowrap" }}
        >
          Ejecutar
        </button>
      )}
    </div>
  );
}
