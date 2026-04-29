// Sales GROUP 1 — Revenue Intelligence
// ForecastScreen · DealIntelligenceScreen · WinLossScreen + shared chart/UI helpers

// ── Chart Primitives (exported to window) ────────────────────────────────────

function SVGBar({ data, height = 130, valueKey = "value", labelKey = "label", colorKey = "color" }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  const W = 500, PAD = 22;
  const segW = W / data.length;
  const bw = Math.max(8, segW * 0.55);
  const bx = (segW - bw) / 2;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = Math.max(3, (d[valueKey] / max) * (height - PAD));
        const x = i * segW + bx;
        const y = height - PAD - bh;
        const col = d[colorKey] || "var(--crm-accent)";
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx={3} fill={col} opacity={0.82} />
            <text x={x + bw / 2} y={height - 4} textAnchor="middle" fontSize={8}
              fill="var(--crm-text-muted)" fontFamily="Poppins,sans-serif">{d[labelKey]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SVGLine({ data, height = 120, color = "var(--crm-accent)", color2, areaFill,
  valueKey = "value", value2Key, labelKey = "label" }) {
  if (!data || data.length < 2) return null;
  const W = 500, H = height - 22;
  const allVals = data.flatMap(d => [d[valueKey], value2Key ? d[value2Key] : 0]).filter(Boolean);
  const max = Math.max(...allVals, 1);
  const pt = (val, i) => [
    (i / (data.length - 1)) * W,
    H - (val / max) * H * 0.88
  ];
  const pts1 = data.map((d, i) => pt(d[valueKey], i));
  const poly1 = pts1.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `M${pts1[0][0]},${H} ` + pts1.map(([x, y]) => `L${x},${y}`).join(" ") + ` L${pts1[pts1.length - 1][0]},${H} Z`;
  const pts2 = value2Key ? data.map((d, i) => pt(d[value2Key] || 0, i)) : [];
  const poly2 = pts2.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
      {areaFill && <path d={area} fill={areaFill} opacity={0.1} />}
      {value2Key && <polyline points={poly2} fill="none" stroke={color2 || "#551C25"} strokeWidth={1.5} strokeDasharray="4,3" strokeLinecap="round" />}
      <polyline points={poly1} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts1.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={3} fill={color} />
          <text x={x} y={height - 4} textAnchor="middle" fontSize={8}
            fill="var(--crm-text-muted)" fontFamily="Poppins,sans-serif">{data[i][labelKey]}</text>
        </g>
      ))}
    </svg>
  );
}

function SVGDonut({ data, size = 110, thick = 22 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = (size - thick) / 2;
  let ang = -Math.PI / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, i) => {
        const sweep = (d.value / total) * 2 * Math.PI;
        const x1 = cx + r * Math.cos(ang), y1 = cy + r * Math.sin(ang);
        ang += sweep;
        const x2 = cx + r * Math.cos(ang), y2 = cy + r * Math.sin(ang);
        return <path key={i} d={`M${x1},${y1} A${r},${r} 0 ${sweep > Math.PI ? 1 : 0},1 ${x2},${y2}`}
          fill="none" stroke={d.color} strokeWidth={thick} opacity={0.88} />;
      })}
      <circle cx={cx} cy={cy} r={r - thick / 2 - 2} fill="var(--crm-surface)" />
    </svg>
  );
}

function Sparkline({ values, color = "var(--crm-accent)", width = 80, height = 26 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1), min = Math.min(...values, 0), rng = max - min || 1;
  const pts = values.map((v, i) =>
    `${((i / (values.length - 1)) * width).toFixed(1)},${(height - ((v - min) / rng) * (height - 2) - 1).toFixed(1)}`
  ).join(" ");
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--crm-text)" }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: "var(--crm-text-muted)", marginTop: 4 }}>{subtitle}</p>}
    </div>
  );
}

function StatCard({ label, value, sub, accent, style: ext }) {
  return (
    <div className="crm-card" style={{ borderRadius: 10, padding: "16px 20px", ...ext }}>
      <div style={{ fontSize: 11, color: "var(--crm-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || "var(--crm-text)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--crm-text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function EmptyState({ icon = "📭", message }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--crm-text-muted)" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{message}</div>
    </div>
  );
}

function Badge({ text, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
      background: `${color}18`, color,
    }}>{text}</span>
  );
}

function fDD(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// ── FORECAST ──────────────────────────────────────────────────────────────────

const MONTHLY_TARGET_COP = 90000000;

function ForecastScreen() {
  const crm = useCRM();

  const activeDeals = crm.deals
    .filter(d => { const s = crm.stages.find(x => x.id === d.stageId); return s && !s.isWon && !s.isLost; })
    .map(d => ({ ...d, contact: crm.contacts.find(c => c.id === d.contactId), stage: crm.stages.find(s => s.id === d.stageId) }));

  const committed = activeDeals.filter(d => d.probability >= 80);
  const likely = activeDeals.filter(d => d.probability >= 50 && d.probability < 80);
  const possible = activeDeals.filter(d => d.probability < 50);
  const total = arr => arr.reduce((s, d) => s + d.value, 0);
  const committedTotal = total(committed);
  const gap = MONTHLY_TARGET_COP - committedTotal;

  const DealCard = ({ deal }) => (
    <div className="crm-card crm-deal-card" style={{ borderRadius: 8, padding: 14, marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{deal.title}</div>
      <div style={{ fontSize: 11, color: "var(--crm-text-muted)", marginBottom: 8 }}>
        {deal.contact?.name || "—"} · {deal.stage?.name}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--crm-accent)" }}>{formatCRM(deal.value)}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--crm-text-muted)" }}>
            {deal.expectedClose ? fDD(deal.expectedClose) : "Sin fecha"}
          </span>
          <Badge text={`${deal.probability}%`}
            color={deal.probability >= 80 ? "#22c55e" : deal.probability >= 50 ? "#f59e0b" : "#ef4444"} />
        </div>
      </div>
    </div>
  );

  const Col = ({ label, deals, color, bg }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ background: bg, borderRadius: "10px 10px 0 0", padding: "12px 16px", borderBottom: `2px solid ${color}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "var(--crm-text)" }}>{formatCRM(total(deals))}</div>
        <div style={{ fontSize: 11, color: "var(--crm-text-muted)" }}>{deals.length} deal{deals.length !== 1 ? "s" : ""}</div>
      </div>
      <div style={{ paddingTop: 12 }}>
        {deals.length ? deals.map(d => <DealCard key={d.id} deal={d} />) : <EmptyState message="Sin deals en esta categoría" />}
      </div>
    </div>
  );

  return (
    <div>
      <SectionHeader title="Revenue Forecast" subtitle="Pipeline ponderado por probabilidad de cierre" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Comprometido >80%" value={formatCRM(committedTotal)} accent="#22c55e" />
        <StatCard label="Meta mensual" value={formatCRM(MONTHLY_TARGET_COP)} />
        <StatCard label={gap > 0 ? "Gap vs meta" : "Exceso vs meta"}
          value={formatCRM(Math.abs(gap))}
          sub={gap > 0 ? "⚠ Por debajo del objetivo" : "✓ Por encima del objetivo"}
          accent={gap > 0 ? "#ef4444" : "#22c55e"} />
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <Col label="Comprometido · >80%" deals={committed} color="#22c55e" bg="rgba(34,197,94,0.04)" />
        <Col label="Probable · 50–80%" deals={likely} color="#f59e0b" bg="rgba(245,158,11,0.04)" />
        <Col label="Posible · <50%" deals={possible} color="#ef4444" bg="rgba(239,68,68,0.04)" />
      </div>
    </div>
  );
}

// ── DEAL INTELLIGENCE ─────────────────────────────────────────────────────────

const STAGE_AVG = { s1: 3, s2: 7, s3: 14, s4: 10 };
const STAGE_NEXT = {
  s1: "Calificar lead y agendar primera llamada de descubrimiento",
  s2: "Preparar y enviar propuesta inicial personalizada",
  s3: "Hacer seguimiento a propuesta — resolver objeciones",
  s4: "Cerrar objeciones finales y enviar contrato",
};

function DealIntelligenceScreen() {
  const crm = useCRM();

  const deals = crm.deals
    .filter(d => { const s = crm.stages.find(x => x.id === d.stageId); return s && !s.isWon && !s.isLost; })
    .map(d => {
      const stage = crm.stages.find(s => s.id === d.stageId);
      const contact = crm.contacts.find(c => c.id === d.contactId);
      const daysInStage = Math.max(0, Math.floor((Date.now() - d.createdAt) / 86400000));
      const avgDays = STAGE_AVG[d.stageId] || 7;
      const acts = crm.activities.filter(a => a.dealId === d.id).sort((a, b) => b.createdAt - a.createdAt);
      const lastAct = acts[0];
      const daysSinceAct = lastAct
        ? Math.floor((Date.now() - (lastAct.completedAt || lastAct.createdAt)) / 86400000)
        : 99;
      const overdue = d.expectedClose && d.expectedClose < Date.now();
      const risks = [];
      if (daysSinceAct > 7) risks.push(`Sin actividad hace ${daysSinceAct} días`);
      if (overdue) risks.push("Fecha de cierre vencida");
      if (d.probability < 30) risks.push("Probabilidad baja (<30%)");
      let momentum = "Avanzando", mColor = "#22c55e";
      if (risks.length >= 2) { momentum = "En riesgo"; mColor = "#ef4444"; }
      else if (daysInStage > avgDays * 1.5 || risks.length === 1) { momentum = "Estancado"; mColor = "#f59e0b"; }
      return { ...d, stage, contact, daysInStage, avgDays, daysSinceAct, risks, momentum, mColor, nextAction: STAGE_NEXT[d.stageId] };
    });

  return (
    <div>
      <SectionHeader title="Deal Intelligence" subtitle="Momentum y alertas de riesgo por deal activo" />
      {!deals.length && <EmptyState icon="🔍" message="No hay deals activos actualmente" />}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {deals.map(deal => (
          <div key={deal.id} className="crm-card" style={{ borderRadius: 10, padding: 18, borderLeft: `3px solid ${deal.mColor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{deal.title}</span>
                  <Badge text={deal.momentum} color={deal.mColor} />
                </div>
                <div style={{ fontSize: 12, color: "var(--crm-text-muted)" }}>
                  {deal.contact?.name} · {deal.stage?.name} · {formatCRM(deal.value)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 24 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--crm-text-muted)" }}>Días en etapa</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: deal.daysInStage > deal.avgDays * 1.5 ? "#ef4444" : "var(--crm-text)" }}>
                    {deal.daysInStage}
                    <span style={{ fontSize: 11, fontWeight: 400, color: "var(--crm-text-muted)" }}> / avg {deal.avgDays}d</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--crm-text-muted)" }}>Prob.</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--crm-accent)" }}>{deal.probability}%</div>
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
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(209,156,21,0.06)", border: "1px solid rgba(209,156,21,0.12)", fontSize: 12, color: "var(--crm-text-muted)", display: "flex", gap: 8 }}>
                <span style={{ color: "var(--crm-accent)" }}>→</span>
                <span><strong style={{ color: "var(--crm-text)" }}>Próximo paso:</strong> {deal.nextAction}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── WIN / LOSS ────────────────────────────────────────────────────────────────

const WL_SEED = [];

const REASONS = ["Precio", "Timing", "Competencia", "Sin presupuesto", "ICP incorrecto"];

function WinLossScreen() {
  const crm = useCRM();
  const [reasonFilter, setReasonFilter] = React.useState("Todos");

  const wonDeals = crm.deals.filter(d => crm.stages.find(s => s.id === d.stageId)?.isWon)
    .map(d => ({ id: d.id, title: d.title, value: d.value, won: true, reason: "", industry: crm.contacts.find(c => c.id === d.contactId)?.company?.split(" ").pop() || "General", source: crm.contacts.find(c => c.id === d.contactId)?.source || "website", stage: "Ganado", days: Math.floor((Date.now() - d.createdAt) / 86400000) }));

  const allData = [...wonDeals, ...WL_SEED];
  const won = allData.filter(d => d.won);
  const lost = allData.filter(d => !d.won);
  const winRate = allData.length ? Math.round((won.length / allData.length) * 100) : 0;
  const filteredLost = reasonFilter === "Todos" ? lost : lost.filter(d => d.reason === reasonFilter);

  const industries = [...new Set(allData.map(d => d.industry))];
  const byIndustry = industries.map(ind => {
    const g = allData.filter(d => d.industry === ind);
    const w = g.filter(d => d.won).length;
    return { label: ind, rate: Math.round((w / g.length) * 100) };
  }).sort((a, b) => b.rate - a.rate);

  const reasonData = REASONS.map(r => ({ label: r.split(" ")[0], value: lost.filter(d => d.reason === r).length, color: "var(--crm-accent)" }));

  return (
    <div>
      <SectionHeader title="Win / Loss Analysis" subtitle="Análisis de deals ganados y perdidos" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Win Rate" value={`${winRate}%`} accent="var(--crm-accent)" />
        <StatCard label="Ganados" value={won.length} accent="#22c55e" sub={formatCRM(won.reduce((s, d) => s + d.value, 0))} />
        <StatCard label="Perdidos" value={lost.length} accent="#ef4444" sub={formatCRM(lost.reduce((s, d) => s + d.value, 0))} />
        <StatCard label="Avg días a cierre" value={`${Math.round(allData.reduce((s, d) => s + d.days, 0) / (allData.length || 1))}d`} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="crm-card" style={{ borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Win rate por industria</div>
          {byIndustry.slice(0, 6).map(row => (
            <div key={row.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span>{row.label}</span>
                <span style={{ fontWeight: 600, color: row.rate >= 50 ? "#22c55e" : "#ef4444" }}>{row.rate}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ width: `${row.rate}%`, height: "100%", borderRadius: 2, background: row.rate >= 50 ? "#22c55e" : "#ef4444", transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </div>
        <div className="crm-card" style={{ borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Razones de pérdida</div>
          <SVGBar data={reasonData} height={140} />
        </div>
      </div>
      <div className="crm-card" style={{ borderRadius: 10, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Deals perdidos</div>
          <select value={reasonFilter} onChange={e => setReasonFilter(e.target.value)}
            style={{ padding: "6px 28px 6px 10px", borderRadius: 6, border: "1px solid var(--crm-border)", background: "var(--crm-bg)", color: "var(--crm-text)", fontSize: 12 }}>
            <option>Todos</option>
            {REASONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        {filteredLost.length === 0
          ? <EmptyState message="No hay deals perdidos con este filtro" />
          : <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--crm-border)" }}>
                {["Deal", "Valor COP", "Razón", "Etapa perdida", "Días"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 11, color: "var(--crm-text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLost.map(d => (
                <tr key={d.id} className="crm-table-row" style={{ borderBottom: "1px solid var(--crm-border)" }}>
                  <td style={{ padding: "10px 10px", fontSize: 13 }}>{d.title}</td>
                  <td style={{ padding: "10px 10px", fontSize: 13, color: "var(--crm-accent)" }}>{formatCRM(d.value)}</td>
                  <td style={{ padding: "10px 10px" }}><Badge text={d.reason} color="#ef4444" /></td>
                  <td style={{ padding: "10px 10px", fontSize: 12, color: "var(--crm-text-muted)" }}>{d.stage}</td>
                  <td style={{ padding: "10px 10px", fontSize: 13 }}>{d.days}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}

Object.assign(window, {
  SVGBar, SVGLine, SVGDonut, Sparkline,
  SectionHeader, StatCard, EmptyState, Badge, fDD,
  ForecastScreen, DealIntelligenceScreen, WinLossScreen,
});
