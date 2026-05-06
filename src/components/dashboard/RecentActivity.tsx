import { formatRelativeDate } from "@/lib/constants";

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  contactName: string | null;
  createdAt: number | Date;
}

const TYPE_EMOJI: Record<string, string> = {
  call: "📞", email: "✉️", meeting: "🤝", note: "📝", follow_up: "⏰",
};

export function RecentActivity({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="rounded-xl p-5 border h-full" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <h3 className="text-sm font-semibold mb-4">Actividad Reciente</h3>
      {activities.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: "var(--muted-foreground)" }}>
          No hay actividad reciente
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activities.slice(0, 6).map(a => (
            <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "var(--background)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 13,
              }}>
                {TYPE_EMOJI[a.type] || "📝"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="text-xs truncate">{a.description}</p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)", marginTop: 2 }}>
                  {a.contactName} · {formatRelativeDate(a.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
