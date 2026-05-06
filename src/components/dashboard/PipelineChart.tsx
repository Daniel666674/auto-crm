import { formatCurrency } from "@/lib/constants";

interface StageData {
  name: string;
  count: number;
  value: number;
  color: string;
}

export function PipelineChart({ data }: { data: StageData[] }) {
  const maxCount = Math.max(...data.map(s => s.count), 1);

  return (
    <div className="rounded-xl p-5 border h-full" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <h3 className="text-sm font-semibold mb-5">Pipeline de Ventas</h3>
      {data.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
          No hay deals en el pipeline
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.map(stage => (
            <div key={stage.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 90, fontSize: 12, color: "var(--muted-foreground)", textAlign: "right", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {stage.name}
              </span>
              <div style={{ flex: 1, height: 28, background: "var(--background)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${(stage.count / maxCount) * 100}%`,
                  background: stage.color,
                  borderRadius: 6,
                  minWidth: stage.count > 0 ? 32 : 0,
                  display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8,
                  transition: "width 0.5s ease",
                }}>
                  {stage.count > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{stage.count}</span>
                  )}
                </div>
              </div>
              <span style={{ width: 90, fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0, textAlign: "right" }}>
                {formatCurrency(stage.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
