export interface WinRateMonth {
  label: string;
  won: number;
  lost: number;
  rate: number; // 0-100
}

export function WinRateTrend({ months }: { months: WinRateMonth[] }) {
  const current = months[months.length - 1];
  const maxRate = Math.max(...months.map(m => m.rate), 10);

  return (
    <div className="rounded-xl p-5 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>Tasa de Cierre</h3>
        <span style={{
          fontSize: 14, fontWeight: 700,
          color: (current?.rate ?? 0) >= 50 ? "#22c55e" : "var(--primary)",
        }}>
          {current?.rate ?? 0}%
        </span>
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 72, marginBottom: 10 }}>
        {months.map((m, i) => {
          const isLast = i === months.length - 1;
          const heightPct = maxRate > 0 ? Math.max((m.rate / maxRate) * 100, m.rate > 0 ? 6 : 2) : 2;
          const color = m.rate >= 50 ? "#22c55e" : m.rate >= 30 ? "var(--primary)" : "#ef4444";
          return (
            <div key={i} title={`${m.label}: ${m.rate}% (${m.won}G / ${m.lost}P)`}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{
                fontSize: 10, fontWeight: isLast ? 700 : 400,
                color: isLast ? color : "var(--muted-foreground)",
              }}>
                {m.rate > 0 ? `${m.rate}%` : "—"}
              </span>
              <div style={{ width: "100%", flex: 1, background: "var(--background)", borderRadius: 3, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
                <div style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  background: isLast ? color : `${color}55`,
                  borderRadius: 3,
                  transition: "height 0.4s ease",
                }} />
              </div>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{m.label}</span>
            </div>
          );
        })}
      </div>

      {/* Current month breakdown */}
      <div style={{ display: "flex", gap: 16, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "#22c55e" }} />
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            <strong style={{ color: "#22c55e" }}>{current?.won ?? 0}</strong> ganados
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "#ef4444" }} />
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            <strong style={{ color: "#ef4444" }}>{current?.lost ?? 0}</strong> perdidos
          </span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-foreground)" }}>
          mes actual
        </div>
      </div>
    </div>
  );
}
