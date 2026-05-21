import Link from "next/link";

export interface ActionableItem {
  id: string;
  type: string;
  description: string;
  contactId: string | null;
  contactName: string | null;
  scheduledAtMs: number | null;
}

const TYPE_LABEL: Record<string, string> = {
  call: "Llamada", email: "Email", meeting: "Reunión",
  follow_up: "Follow-up", note: "Nota",
};

function timeStr(ms: number) {
  return new Date(ms).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function Row({ item, overdue }: { item: ActionableItem; overdue: boolean }) {
  const accent = overdue ? "#ef4444" : "var(--primary)";
  const inner = (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 10px", borderRadius: 6, marginBottom: 5,
      background: overdue ? "rgba(239,68,68,0.06)" : "var(--background)",
      borderLeft: `3px solid ${accent}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: accent, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.contactName ?? "Contacto"}
          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, opacity: 0.7 }}>
            {TYPE_LABEL[item.type] ?? item.type}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.description}
        </div>
      </div>
      {item.scheduledAtMs && (
        <span style={{ fontSize: 11, color: accent, flexShrink: 0, fontWeight: overdue ? 600 : 400 }}>
          {timeStr(item.scheduledAtMs)}
        </span>
      )}
    </div>
  );
  if (!item.contactId) return inner;
  return (
    <Link href={`/contacts/${item.contactId}`} style={{ textDecoration: "none" }}>
      {inner}
    </Link>
  );
}

export function TodayActionables({ overdue, today }: { overdue: ActionableItem[]; today: ActionableItem[] }) {
  const empty = overdue.length === 0 && today.length === 0;
  return (
    <div className="rounded-xl p-5 border h-full" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>Agenda de Hoy</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {overdue.length > 0 && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "rgba(239,68,68,0.12)", color: "#ef4444", fontWeight: 600 }}>
              {overdue.length} vencido{overdue.length !== 1 ? "s" : ""}
            </span>
          )}
          {today.length > 0 && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "rgba(var(--primary-rgb,209,156,21),0.12)", color: "var(--primary)", fontWeight: 600 }}>
              {today.length} hoy
            </span>
          )}
        </div>
      </div>
      {empty ? (
        <div style={{ textAlign: "center", padding: "28px 0", color: "var(--muted-foreground)", fontSize: 13 }}>
          Sin tareas pendientes — buen día 🎯
        </div>
      ) : (
        <div>
          {overdue.map(f => <Row key={f.id} item={f} overdue />)}
          {today.map(f => <Row key={f.id} item={f} overdue={false} />)}
        </div>
      )}
    </div>
  );
}
