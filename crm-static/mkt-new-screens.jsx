// Marketing New Screens — Groups 2-6 + Integrations
// MktSegmentHealthNew · MktIcpInsights · MktLists
// MktPipelineView · MktLeadVelocity
// MktAnalytics · MktCalendar · MktAbm
// MktDigest · MktRoi · MktExport · IntegrationsScreen

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function MktCard({ children, style: ext }) {
  return <div className="mkt-card" style={{ borderRadius: 10, padding: 18, ...ext }}>{children}</div>;
}

function MktSectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--mkt-text)" }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: "var(--mkt-text-muted)", marginTop: 4 }}>{subtitle}</p>}
    </div>
  );
}

function MktEmptyState({ icon = "📭", msg }) {
  return <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--mkt-text-muted)" }}><div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div><div style={{ fontSize: 13 }}>{msg}</div></div>;
}

function MktBadge({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: `${color}18`, color }}>{text}</span>;
}

function MktStatCard({ label, value, sub, accent }) {
  return (
    <div className="mkt-card" style={{ borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || "var(--mkt-text)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Seed extras ───────────────────────────────────────────────────────────────

const BREVO_LISTS_SEED = []; // loaded from API

const CALENDAR_SEED = [];

const ABM_SEED = [];

const LEAD_VELOCITY = [];

const ROI_DATA = [];

const CHANNEL_COLORS = { LinkedIn: "#0A66C2", Email: "var(--mkt-accent)", Meta: "#1877F2", Blog: "#22c55e" };

// ── GROUP 2: AUDIENCE INTELLIGENCE ───────────────────────────────────────────

function MktSegmentHealthNew() {
  const mkt = useMarketing();
  const contacts = mkt.contacts || [];

  const groupBy = (key) => {
    const map = {};
    contacts.forEach(c => {
      const k = c[key] || "Sin clasificar";
      if (!map[k]) map[k] = { total: 0, engaged: 0 };
      map[k].total++;
      if (["hot", "warm"].includes(c.engagement_status || c.engagementStatus)) map[k].engaged++;
    });
    return Object.entries(map).map(([label, d]) => ({ label, ...d, rate: d.total > 0 ? Math.round((d.engaged / d.total) * 100) : 0 })).sort((a, b) => b.rate - a.rate);
  };

  const recommendTag = rate => rate > 40
    ? { label: "Escalar", color: "#22c55e" }
    : rate >= 15
    ? { label: "Revisar copy", color: "#f59e0b" }
    : { label: "Pausar", color: "#ef4444" };

  const SegmentGroup = ({ title, data }) => (
    <MktCard style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{title}</div>
      {data.map((seg, i) => {
        const rec = recommendTag(seg.rate);
        return (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{seg.label}</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{seg.engaged}/{seg.total} activos</span>
                <MktBadge text={rec.label} color={rec.color} />
                <span style={{ fontSize: 12, fontWeight: 700, color: rec.color }}>{seg.rate}%</span>
              </div>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ width: `${seg.rate}%`, height: "100%", borderRadius: 4, background: rec.color, transition: "width 0.5s" }} />
            </div>
          </div>
        );
      })}
    </MktCard>
  );

  if (!contacts.length) return <MktEmptyState msg="No hay contactos de marketing cargados aún" />;

  return (
    <div>
      <MktSectionHeader title="Segment Health" subtitle="Engagement ratio por segmento · recomendaciones automáticas" />
      <SegmentGroup title="Por industria" data={groupBy("industry")} />
      <SegmentGroup title="Por tier" data={groupBy("tier").map(d => ({ ...d, label: `Tier ${d.label}` }))} />
      <SegmentGroup title="Por fuente" data={groupBy("source")} />
    </div>
  );
}

function MktIcpInsights() {
  const mkt = useMarketing();
  const contacts = mkt.contacts || [];

  const groupKey = (c) => `${c.industry || "—"}|${c.source}`;
  const map = {};
  contacts.forEach(c => {
    const k = groupKey(c);
    if (!map[k]) map[k] = { industry: c.industry || "—", source: c.source, total: 0, handoffs: 0 };
    map[k].total++;
    if (c.ready_for_sales || c.readyForSales) map[k].handoffs++;
  });

  const rows = Object.values(map)
    .map(r => ({ ...r, rate: r.total > 0 ? Math.round((r.handoffs / r.total) * 100) : 0 }))
    .sort((a, b) => b.rate - a.rate);

  return (
    <div>
      <MktSectionHeader title="ICP Insights" subtitle="Patrones de conversión por perfil — quién convierte mejor a ventas" />
      {!rows.length && <MktEmptyState msg="Datos insuficientes para generar insights" />}
      <MktCard>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--mkt-border)" }}>
              {["Industria", "Fuente", "Contactos", "Handoffs", "Tasa de conv."].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "var(--mkt-text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--mkt-border)", background: i === 0 ? "rgba(209,156,21,0.03)" : "transparent" }}>
                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: i === 0 ? 700 : 400 }}>{r.industry}</td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--mkt-text-muted)" }}>{r.source}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{r.total}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{r.handoffs}</td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 80, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)" }}>
                      <div style={{ width: `${r.rate}%`, height: "100%", borderRadius: 3, background: r.rate > 30 ? "#22c55e" : r.rate > 10 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: r.rate > 30 ? "#22c55e" : r.rate > 10 ? "#f59e0b" : "#ef4444" }}>{r.rate}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </MktCard>
    </div>
  );
}

function MktLists() {
  const [lists, setLists] = React.useState([]);
  const [loadingLists, setLoadingLists] = React.useState(true);
  React.useEffect(() => {
    fetch("/api/brevo/lists").then(r=>r.json()).then(d => {
      if (d.lists) setLists(d.lists.map((l,i) => ({
        id: `bl${l.id||i}`, name: l.name, contactCount: l.totalSubscribers || 0,
        lastSync: new Date().toLocaleDateString("es-CO"), healthRate: 85, cadenceName: l.name,
      })));
    }).catch(()=>{}).finally(()=>setLoadingLists(false));
  }, []);
  const [editing, setEditing] = React.useState(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", contactCount: "", lastSync: "", healthRate: "", cadenceName: "" });

  const updateField = (id, field, val) => setLists(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));
  const addList = () => {
    setLists(prev => [{ ...form, id: `bl${Date.now()}`, contactCount: +form.contactCount, healthRate: +form.healthRate }, ...prev]);
    setForm({ name: "", contactCount: "", lastSync: "", healthRate: "", cadenceName: "" });
    setShowAdd(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <MktSectionHeader title="Listas Brevo" subtitle="Estado de listas · sincronización y salud de emails" />
        <button onClick={() => setShowAdd(true)}
          style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Nueva lista
        </button>
      </div>
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 440, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Nueva Lista Brevo</div>
            {[["name","Nombre"],["contactCount","Nº contactos"],["healthRate","Health rate (%)"],["cadenceName","Cadencia activa"]].map(([k,l]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "var(--mkt-text-muted)", display: "block", marginBottom: 5 }}>{l}</label>
                <input value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)", color: "var(--mkt-text)", fontSize: 13 }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={addList} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
      <MktCard>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--mkt-border)" }}>
              {["Lista", "Contactos", "Último sync", "Health %", "Cadencia activa"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "var(--mkt-text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lists.map(l => (
              <tr key={l.id} style={{ borderBottom: "1px solid var(--mkt-border)" }}>
                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{l.name}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{l.contactCount.toLocaleString("es-CO")}</td>
                <td style={{ padding: "10px 12px" }}>
                  {editing === `sync-${l.id}`
                    ? <input defaultValue={l.lastSync} onBlur={e => { updateField(l.id, "lastSync", e.target.value); setEditing(null); }} autoFocus style={{ width: 100, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)", color: "var(--mkt-text)", fontSize: 12 }} />
                    : <span onClick={() => setEditing(`sync-${l.id}`)} style={{ fontSize: 12, color: "var(--mkt-text-muted)", cursor: "pointer" }}>{l.lastSync} ✎</span>
                  }
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {editing === `hr-${l.id}`
                    ? <input type="number" defaultValue={l.healthRate} onBlur={e => { updateField(l.id, "healthRate", +e.target.value); setEditing(null); }} autoFocus style={{ width: 60, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)", color: "var(--mkt-text)", fontSize: 12 }} />
                    : <span onClick={() => setEditing(`hr-${l.id}`)} style={{ fontSize: 13, fontWeight: 700, color: l.healthRate >= 80 ? "#22c55e" : l.healthRate >= 60 ? "#f59e0b" : "#ef4444", cursor: "pointer" }}>{l.healthRate}% ✎</span>
                  }
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--mkt-text-muted)" }}>{l.cadenceName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </MktCard>
    </div>
  );
}

// ── GROUP 3: PIPELINE VISIBILITY ──────────────────────────────────────────────

function MktPipelineView() {
  const STAGES = [
    { name: "Nuevo", count: 3, value: 7500000, mktAttr: 2 },
    { name: "Contactado", count: 4, value: 32000000, mktAttr: 3 },
    { name: "Propuesta", count: 5, value: 77000000, mktAttr: 4 },
    { name: "Negociación", count: 2, value: 63000000, mktAttr: 1 },
    { name: "Ganado", count: 7, value: 147000000, mktAttr: 6 },
  ];
  const totalValue = STAGES.reduce((s, x) => s + x.value, 0);
  const mktAttr = STAGES.reduce((s, x) => s + x.mktAttr, 0);
  const mktValue = STAGES.reduce((s, x) => s + Math.round(x.value * (x.mktAttr / x.count)), 0);
  const thisMonthClosed = STAGES.find(s => s.name === "Ganado")?.value || 0;

  const maxCount = Math.max(...STAGES.map(s => s.count), 1);
  const W = 500;

  return (
    <div>
      <MktSectionHeader title="Vista de Pipeline" subtitle="Lectura de ventas — solo consulta, sin edición" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <MktStatCard label="Pipeline total" value={new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(totalValue)} accent="var(--mkt-accent)" />
        <MktStatCard label="Deals en pipeline" value={STAGES.reduce((s,x)=>s+x.count,0)} />
        <MktStatCard label="Atribuidos a mkt" value={mktAttr} sub={`${Math.round((mktAttr/STAGES.reduce((s,x)=>s+x.count,0))*100)}% del total`} accent="var(--mkt-accent)" />
        <MktStatCard label="Revenue cerrado este mes" value={new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(thisMonthClosed)} accent="#22c55e" />
      </div>
      <MktCard>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Deals por etapa</div>
        {STAGES.map(s => (
          <div key={s.name} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "rgba(209,156,21,0.1)", color: "var(--mkt-accent)", fontWeight: 600 }}>{s.mktAttr} mkt</span>
              </div>
              <span style={{ color: "var(--mkt-text-muted)" }}>{s.count} deals · {new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(s.value)}</span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ width: `${(s.count / maxCount) * 100}%`, height: "100%", borderRadius: 5, background: s.name === "Ganado" ? "#22c55e" : "var(--mkt-accent)", opacity: 0.8 }} />
            </div>
          </div>
        ))}
      </MktCard>
    </div>
  );
}

function MktLeadVelocity() {
  const totalThisWeek = LEAD_VELOCITY[LEAD_VELOCITY.length - 1].total;
  const avgHandoffDays = 18; // simulated avg from first contact to handoff

  const maxTotal = Math.max(...LEAD_VELOCITY.map(w => w.total), 1);
  const W = 500, H = 140, PAD = 20;
  const segW = W / LEAD_VELOCITY.length;
  const bw = segW * 0.55;

  const channels = ["website", "linkedin", "email", "events"];
  const chColors = { website: "#3b82f6", linkedin: "#0A66C2", email: "var(--mkt-accent)", events: "#22c55e" };

  return (
    <div>
      <MktSectionHeader title="Lead Velocity" subtitle="Leads entrando al pipeline · por semana y fuente · 8 semanas" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <MktStatCard label="Leads esta semana" value={totalThisWeek} accent="var(--mkt-accent)" />
        <MktStatCard label="Avg días contacto → handoff" value={`${avgHandoffDays}d`} />
        <MktStatCard label="Tasa conversión contacto→handoff" value="18%" sub="de todos los mkt contacts" accent="#22c55e" />
      </div>
      <MktCard style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Leads por semana</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 11, color: "var(--mkt-text-muted)" }}>
          {channels.map(c => <span key={c}><span style={{ color: chColors[c] }}>■</span> {c}</span>)}
        </div>
        <svg width="100%" height={H + PAD} viewBox={`0 0 ${W} ${H + PAD}`} preserveAspectRatio="none">
          {LEAD_VELOCITY.map((w, i) => {
            let yOffset = H;
            return channels.map(ch => {
              const val = w[ch] || 0;
              const bh = (val / maxTotal) * H;
              yOffset -= bh;
              const x = i * segW + (segW - bw) / 2;
              return <rect key={ch} x={x} y={yOffset} width={bw} height={bh} fill={chColors[ch]} opacity={0.8} />;
            }).concat(
              <text key="label" x={i * segW + segW / 2} y={H + 14} textAnchor="middle" fontSize={8} fill="var(--mkt-text-muted)" fontFamily="Poppins,sans-serif">{w.label}</text>
            );
          })}
        </svg>
      </MktCard>
    </div>
  );
}

// ── GROUP 4: PERFORMANCE 360 ──────────────────────────────────────────────────

function MktAnalytics() {
  const mkt = useMarketing();
  const campaigns = mkt.campaigns || [];

  const avgOpenRate = campaigns.length ? (campaigns.reduce((s, c) => s + c.open_rate, 0) / campaigns.length).toFixed(1) : 0;
  const avgClickRate = campaigns.length ? (campaigns.reduce((s, c) => s + c.click_rate, 0) / campaigns.length).toFixed(1) : 0;
  const totalSent = campaigns.reduce((s, c) => s + c.total_contacts, 0);

  const integrations = [
    { id: "ga", name: "Google Analytics", icon: "📊", status: "Pendiente", metrics: [{ l: "Sesiones", v: "—" }, { l: "Conversiones", v: "—" }, { l: "Fuente top", v: "—" }] },
    { id: "li", name: "LinkedIn API", icon: "💼", status: "Pendiente", metrics: [{ l: "Impresiones", v: "—" }, { l: "CTR", v: "—" }, { l: "Engagement", v: "—" }] },
    { id: "meta", name: "Meta Ads", icon: "📱", status: "No configurado", metrics: [{ l: "Gasto", v: "—" }, { l: "CPM", v: "—" }, { l: "CPC", v: "—" }] },
    { id: "brevo", name: "Brevo Overview", icon: "✉️", status: "Conectado", metrics: [{ l: "Total enviados", v: totalSent.toLocaleString("es-CO") }, { l: "Open rate avg", v: `${avgOpenRate}%` }, { l: "Click rate avg", v: `${avgClickRate}%` }] },
  ];

  const statusColor = s => s === "Conectado" ? "#22c55e" : s === "Pendiente" ? "#f59e0b" : "#7a756e";

  return (
    <div>
      <MktSectionHeader title="Analytics 360°" subtitle="Integración de plataformas de performance" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {integrations.map(int => (
          <MktCard key={int.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{int.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{int.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: statusColor(int.status) }} />
                    <span style={{ fontSize: 11, color: statusColor(int.status), fontWeight: 600 }}>{int.status}</span>
                  </div>
                </div>
              </div>
              <button style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${int.status === "Conectado" ? "#22c55e" : "var(--mkt-border)"}`, background: "transparent", color: int.status === "Conectado" ? "#22c55e" : "var(--mkt-text-muted)", fontSize: 12, cursor: "pointer" }}>
                {int.status === "Conectado" ? "Ver datos" : `Conectar ${int.name.split(" ")[0]}`}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {int.metrics.map((m, i) => (
                <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--mkt-border)" }}>
                  <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginBottom: 4 }}>{m.l}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: m.v === "—" ? "var(--mkt-text-muted)" : "var(--mkt-text)" }}>{m.v}</div>
                </div>
              ))}
            </div>
          </MktCard>
        ))}
      </div>
    </div>
  );
}

// ── GROUP 5: CONTENT & PLANNING ───────────────────────────────────────────────

function MktCalendar() {
  const [entries, setEntries] = React.useState(CALENDAR_SEED);
  const [selected, setSelected] = React.useState(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", channel: "Email", status: "Planeado", publishDate: "", campaign: "", notes: "" });

  const STATUSES = ["Planeado", "En progreso", "Publicado"];
  const CHANNELS = ["LinkedIn", "Email", "Meta", "Blog"];

  const year = 2026, month = 4; // May 2026 (0-indexed)
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayEntries = (day) => {
    const ts = new Date(year, month, day).getTime();
    return entries.filter(e => {
      const d = new Date(e.publishDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const updateEntry = (id, field, val) => setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e));
  const addEntry = () => {
    setEntries(prev => [{ ...form, id: `cal${Date.now()}`, publishDate: form.publishDate ? new Date(form.publishDate).getTime() : Date.now() }, ...prev]);
    setForm({ title: "", channel: "Email", status: "Planeado", publishDate: "", campaign: "", notes: "" });
    setShowAdd(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <MktSectionHeader title="Content Calendar — Mayo 2026" subtitle="Plan de contenidos mensual · haz clic para editar" />
        <button onClick={() => setShowAdd(true)}
          style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Agregar contenido
        </button>
      </div>

      {/* Modal */}
      {(showAdd || selected) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 440, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{selected ? "Editar entrada" : "Nueva entrada"}</div>
            {[["title","Título"],["campaign","Campaña vinculada"]].map(([k,l]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "var(--mkt-text-muted)", display: "block", marginBottom: 5 }}>{l}</label>
                <input value={selected ? selected[k] : form[k]} onChange={e => selected ? updateEntry(selected.id, k, e.target.value) : setForm(p => ({ ...p, [k]: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)", color: "var(--mkt-text)", fontSize: 13 }} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[["channel","Canal",CHANNELS],["status","Estado",STATUSES]].map(([k,l,opts]) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: "var(--mkt-text-muted)", display: "block", marginBottom: 5 }}>{l}</label>
                  <select value={selected ? selected[k] : form[k]} onChange={e => selected ? updateEntry(selected.id, k, e.target.value) : setForm(p => ({ ...p, [k]: e.target.value }))}
                    style={{ width: "100%", padding: "7px 24px 7px 8px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)", color: "var(--mkt-text)", fontSize: 13 }}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: "var(--mkt-text-muted)", display: "block", marginBottom: 5 }}>Notas</label>
              <textarea rows={2} value={selected ? selected.notes : form.notes} onChange={e => selected ? updateEntry(selected.id, "notes", e.target.value) : setForm(p => ({ ...p, notes: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)", color: "var(--mkt-text)", fontSize: 13, resize: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setSelected(null); setShowAdd(false); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", fontSize: 13, cursor: "pointer" }}>Cerrar</button>
              {!selected && <button onClick={addEntry} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Agregar</button>}
            </div>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(d => (
          <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontSize: 11, color: "var(--mkt-text-muted)", fontWeight: 600 }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayEvts = dayEntries(day);
          const today = day === 23;
          return (
            <div key={day} style={{ minHeight: 70, padding: 6, borderRadius: 6, background: today ? "rgba(209,156,21,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${today ? "rgba(209,156,21,0.25)" : "var(--mkt-border)"}` }}>
              <div style={{ fontSize: 12, fontWeight: today ? 700 : 400, color: today ? "var(--mkt-accent)" : "var(--mkt-text-muted)", marginBottom: 4 }}>{day}</div>
              {dayEvts.map(e => (
                <div key={e.id} onClick={() => setSelected(e)} style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, marginBottom: 2, background: `${CHANNEL_COLORS[e.channel] || "#7a756e"}22`, color: CHANNEL_COLORS[e.channel] || "#7a756e", fontWeight: 600, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MktAbm() {
  const [accounts, setAccounts] = React.useState(ABM_SEED);
  const ABM_STATUSES = ["Identificando", "Calentando", "Comprometido", "Entregado"];
  const statusColor = s => ({ Identificando: "#7a756e", Calentando: "#f59e0b", Comprometido: "#22c55e", Entregado: "#3b82f6" })[s] || "#7a756e";

  return (
    <div>
      <MktSectionHeader title="ABM Board" subtitle="Account-Based Marketing · cuentas objetivo tier 1" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
        {accounts.map(a => (
          <MktCard key={a.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{a.company}</div>
                <div style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginTop: 2 }}>{a.contact}</div>
              </div>
              <MktBadge text={`T${a.tier}`} color="var(--mkt-accent)" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <select value={a.status} onChange={e => setAccounts(prev => prev.map(x => x.id === a.id ? { ...x, status: e.target.value } : x))}
                style={{ padding: "5px 24px 5px 8px", borderRadius: 20, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: `${statusColor(a.status)}18`, color: statusColor(a.status) }}>
                {ABM_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 10 }}>
              <span>Último toque: {Math.floor((Date.now() - a.lastTouch) / 86400000)}d atrás</span>
              {a.nextTouch && <span>Próximo: {Math.ceil((a.nextTouch - Date.now()) / 86400000)}d</span>}
            </div>
            {a.notes && <div style={{ fontSize: 12, color: "var(--mkt-text-muted)", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", borderLeft: "2px solid var(--mkt-accent)" }}>{a.notes}</div>}
          </MktCard>
        ))}
      </div>
    </div>
  );
}

// ── GROUP 6: MARKETING REPORTING ──────────────────────────────────────────────

function MktDigest() {
  const mkt = useMarketing();
  const camps = mkt.campaigns || [];
  const contacts = mkt.contacts || [];

  const sentThisWeek = camps.filter(c => c.last_sent && (Date.now() - c.last_sent) < 7*86400000).reduce((s,c) => s + c.total_contacts, 0);
  const avgOpen = camps.length ? (camps.reduce((s,c) => s + c.open_rate, 0) / camps.length).toFixed(1) : 0;
  const totalClicks = camps.reduce((s,c) => s + Math.round(c.total_contacts * c.click_rate / 100), 0);
  const totalReplies = camps.reduce((s,c) => s + Math.round(c.total_contacts * c.reply_rate / 100), 0);
  const newContacts = contacts.filter(c => (Date.now() - c.last_activity) < 7*86400000).length;
  const handoffs = contacts.filter(c => c.ready_for_sales || c.readyForSales).length;
  const bestCamp = camps.sort((a,b) => b.open_rate - a.open_rate)[0];

  const metrics = [
    { label: "Emails enviados esta semana", value: sentThisWeek.toLocaleString("es-CO"), icon: "✉️" },
    { label: "Open rate promedio", value: `${avgOpen}%`, icon: "👁" },
    { label: "Total clicks", value: totalClicks.toLocaleString("es-CO"), icon: "🖱" },
    { label: "Replies", value: totalReplies.toLocaleString("es-CO"), icon: "↩" },
    { label: "Nuevos contactos esta semana", value: newContacts, icon: "➕" },
    { label: "Handoffs enviados a ventas", value: handoffs, icon: "🤝" },
  ];

  return (
    <div>
      <MktSectionHeader title="Digest Semanal" subtitle={`Resumen de la semana · ${new Date().toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})}`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {metrics.map((m, i) => (
          <MktCard key={i}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
            <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--mkt-accent)" }}>{m.value}</div>
          </MktCard>
        ))}
      </div>
      {bestCamp && (
        <MktCard>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🏆 Campaña con mejor performance</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{bestCamp.name}</div>
          <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 13 }}>
            <span style={{ color: "var(--mkt-text-muted)" }}>Open rate: <strong style={{ color: "var(--mkt-accent)" }}>{bestCamp.open_rate}%</strong></span>
            <span style={{ color: "var(--mkt-text-muted)" }}>Clicks: <strong style={{ color: "var(--mkt-accent)" }}>{bestCamp.click_rate}%</strong></span>
            <span style={{ color: "var(--mkt-text-muted)" }}>Conversiones: <strong style={{ color: "var(--mkt-accent)" }}>{bestCamp.conversions}</strong></span>
          </div>
        </MktCard>
      )}
      <button style={{ marginTop: 16, padding: "10px 20px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", fontSize: 13, cursor: "pointer" }}
        onClick={() => {
          const csv = ["Métrica,Valor", ...metrics.map(m => `${m.label},${m.value}`)].join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "digest-semanal.csv"; a.click();
        }}>
        ⬇ Exportar CSV
      </button>
    </div>
  );
}

function MktRoi() {
  const fCOP = v => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(v);
  const sorted = [...ROI_DATA].sort((a, b) => b.revenue - a.revenue);
  const maxRev = sorted[0]?.revenue || 1;

  return (
    <div>
      <MktSectionHeader title="ROI de Marketing" subtitle="Revenue atribuido por campaña · ordenado por ingreso generado" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <MktStatCard label="Revenue total atribuido" value={fCOP(ROI_DATA.reduce((s,r) => s + r.revenue, 0))} accent="var(--mkt-accent)" />
        <MktStatCard label="Total handoffs" value={ROI_DATA.reduce((s,r) => s + r.handoffs, 0)} />
        <MktStatCard label="Deals generados" value={ROI_DATA.reduce((s,r) => s + r.deals, 0)} />
        <MktStatCard label="Mejor campaña" value={sorted[0]?.campaign?.split(" ")[0] || "—"} sub="por revenue" accent="#22c55e" />
      </div>
      <MktCard>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--mkt-border)" }}>
              {["Campaña","Contactos","Handoffs","Deals","Revenue COP","Costo/lead"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "var(--mkt-text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--mkt-border)", background: i === 0 ? "rgba(209,156,21,0.03)" : "transparent" }}>
                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: i === 0 ? 700 : 400 }}>
                  <div>{r.campaign}</div>
                  <div style={{ width: Math.round((r.revenue / maxRev) * 200), height: 3, borderRadius: 2, background: "var(--mkt-accent)", marginTop: 4, opacity: 0.5 }} />
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{r.contacts}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{r.handoffs}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{r.deals}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: "var(--mkt-accent)" }}>{fCOP(r.revenue)}</td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--mkt-text-muted)" }}>{fCOP(r.costPerLead)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </MktCard>
    </div>
  );
}

function MktExport() {
  const [dateFrom, setDateFrom] = React.useState("2026-03-01");
  const [dateTo, setDateTo] = React.useState("2026-04-23");
  const [selected, setSelected] = React.useState(["campaigns", "engagement", "handoffs"]);
  const [generating, setGenerating] = React.useState(false);

  const METRICS = [
    { id: "campaigns", label: "Campañas" },
    { id: "engagement", label: "Engagement (opens, clicks, replies)" },
    { id: "segments", label: "Segmentos y salud" },
    { id: "handoffs", label: "Handoffs a ventas" },
    { id: "pipeline", label: "Atribución de pipeline" },
  ];

  const toggle = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      const csv = ["Métrica,Período,Valor", `Campañas activas,${dateFrom}-${dateTo},8`, `Emails enviados,${dateFrom}-${dateTo},824`, `Open rate avg,${dateFrom}-${dateTo},32.5%`, `Handoffs,${dateFrom}-${dateTo},18`].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `mkt-report-${dateFrom}.csv`; a.click();
      setGenerating(false);
    }, 1000);
  };

  return (
    <div>
      <MktSectionHeader title="Exportar Reporte" subtitle="Selecciona métricas y rango de fechas para descargar CSV" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <MktCard>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Rango de fechas</div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "var(--mkt-text-muted)", display: "block", marginBottom: 5 }}>Desde</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)", color: "var(--mkt-text)", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--mkt-text-muted)", display: "block", marginBottom: 5 }}>Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)", color: "var(--mkt-text)", fontSize: 13 }} />
          </div>
        </MktCard>
        <MktCard>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Métricas a incluir</div>
          {METRICS.map(m => (
            <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: `1px solid ${selected.includes(m.id) ? "var(--mkt-accent)" : "var(--mkt-border)"}`, background: selected.includes(m.id) ? "rgba(209,156,21,0.05)" : "transparent", cursor: "pointer", marginBottom: 8, transition: "all 0.15s" }}>
              <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} style={{ accentColor: "var(--mkt-accent)" }} />
              <span style={{ fontSize: 13 }}>{m.label}</span>
            </label>
          ))}
        </MktCard>
      </div>
      <button onClick={generate} disabled={!selected.length || generating}
        style={{ marginTop: 20, padding: "12px 28px", borderRadius: 8, border: "none", background: selected.length ? "var(--mkt-accent)" : "rgba(255,255,255,0.1)", color: selected.length ? "#0a0a0a" : "var(--mkt-text-muted)", fontSize: 14, fontWeight: 700, cursor: selected.length ? "pointer" : "not-allowed" }}>
        {generating ? "Generando..." : `⬇ Generar reporte (${selected.length} métricas)`}
      </button>
    </div>
  );
}

// ── INTEGRATIONS (shared) ─────────────────────────────────────────────────────

function IntegrationsScreen() {
  const [statuses, setStatuses] = React.useState({
    brevo: "Conectado", ga: "Pendiente", linkedin: "Pendiente", meta: "No configurado",
  });
  const [lastSync] = React.useState({ brevo: "23/04/2026 09:14", ga: "—", linkedin: "—", meta: "—" });

  const rows = [
    { id: "brevo", name: "Brevo API", icon: "✉️", description: "Email marketing y cadencias automatizadas" },
    { id: "ga", name: "Google Analytics", icon: "📊", description: "Tráfico web y conversiones" },
    { id: "linkedin", name: "LinkedIn API", icon: "💼", description: "Campañas y engagement en LinkedIn" },
    { id: "meta", name: "Meta Ads API", icon: "📱", description: "Facebook e Instagram Ads" },
  ];

  const statusColor = s => ({ Conectado: "#22c55e", Pendiente: "#f59e0b", "No configurado": "#7a756e", Error: "#ef4444" })[s] || "#7a756e";

  const cycle = id => setStatuses(prev => {
    const opts = ["Conectado", "Pendiente", "No configurado", "Error"];
    const idx = (opts.indexOf(prev[id]) + 1) % opts.length;
    return { ...prev, [id]: opts[idx] };
  });

  return (
    <div>
      <MktSectionHeader title="Integraciones" subtitle="Estado de todas las integraciones · disponible en ventas y marketing" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(row => (
          <MktCard key={row.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 28 }}>{row.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{row.name}</div>
              <div style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginTop: 2 }}>{row.description}</div>
              <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 4 }}>Último sync: {lastSync[row.id]}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: statusColor(statuses[row.id]) }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: statusColor(statuses[row.id]) }}>{statuses[row.id]}</span>
            </div>
            <button onClick={() => cycle(row.id)}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", fontSize: 12, cursor: "pointer" }}>
              Configurar
            </button>
          </MktCard>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  MktSegmentHealthNew, MktIcpInsights, MktLists,
  MktPipelineView, MktLeadVelocity,
  MktAnalytics, MktCalendar, MktAbm,
  MktDigest, MktRoi, MktExport,
  IntegrationsScreen,
});
