// Marketing Layout — grouped sidebar + notification bell (Julian's view)
function MarketingLayout({ children, currentSection, onNavigate, onSwitchToSales }) {
  const mkt = useMarketing();
  const [bellOpen, setBellOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState([
    { id: "mn1", read: false, msg: "Deal 'Agencia Creativa' avanzó a Negociación", type: "deal", time: Date.now() - 1*3600000 },
    { id: "mn2", read: false, msg: "Entregable 'Capacitación equipo' vencido hace 1d", type: "delivery", time: Date.now() - 3*3600000 },
    { id: "mn3", read: false, msg: "Deal 'CRM Inmobiliaria' marcado como ganado", type: "deal", time: Date.now() - 10*3600000 },
    { id: "mn4", read: true, msg: "3 contactos pasados a ventas desde Handoff Center", type: "handoff", time: Date.now() - 24*3600000 },
  ]);
  const unread = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const readyCount = mkt.contacts.filter(c => c.ready_for_sales && !c.passed_to_sales_at).length;

  const NAV_GROUPS = [
    {
      label: null,
      items: [
        { id: "engagement", label: "Engagement Board", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
        { id: "campaigns", label: "Campañas", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
        { id: "attribution", label: "Atribución", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
        { id: "handoff", label: "Handoff Center", icon: "M17 8l4 4m0 0l-4 4m4-4H3", badge: readyCount },
      ],
    },
    {
      label: "Audience Intelligence",
      items: [
        { id: "segment-health", label: "Segment Health", icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" },
        { id: "icp-insights", label: "ICP Insights", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
        { id: "lists", label: "Listas Brevo", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
      ],
    },
    {
      label: "Pipeline Visibility",
      items: [
        { id: "pipeline-view", label: "Vista Pipeline", icon: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" },
        { id: "lead-velocity", label: "Lead Velocity", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
      ],
    },
    {
      label: "Performance 360",
      items: [
        { id: "analytics", label: "Analytics", icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
      ],
    },
    {
      label: "Content & Planning",
      items: [
        { id: "calendar", label: "Calendario", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
        { id: "abm", label: "ABM Board", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
      ],
    },
    {
      label: "Reportes",
      items: [
        { id: "digest", label: "Digest Semanal", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
        { id: "roi", label: "ROI", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
        { id: "export", label: "Exportar", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
      ],
    },
    {
      label: null,
      items: [
        { id: "integrations", label: "Integraciones", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
      ],
    },
  ];

  const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);
  const currentLabel = ALL_ITEMS.find(n => n.id === currentSection)?.label || "Engagement Board";

  const SvgIcon = ({ path, size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {path.split(" M").map((seg, i) => <path key={i} d={i === 0 ? seg : "M" + seg} />)}
    </svg>
  );

  const typeIcon = t => t === "deal" ? "💼" : t === "delivery" ? "📋" : t === "handoff" ? "🤝" : "🔔";

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--mkt-bg)", color: "var(--mkt-text)" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, minHeight: "100vh", background: "var(--mkt-sidebar)", borderRight: "1px solid var(--mkt-border)", display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 40, overflowY: "auto" }}>
        {/* Logo */}
        <div style={{ height: 64, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", borderBottom: "1px solid var(--mkt-border)", flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--mkt-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0a0a0a", fontWeight: 800, fontSize: 13 }}>M</div>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "-0.02em" }}>BlackScale Nexus</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: group.label ? 4 : 0 }}>
              {group.label && (
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 12px 5px", marginTop: gi > 0 ? 6 : 0 }}>
                  {group.label}
                </div>
              )}
              {group.items.map(item => {
                const isActive = currentSection === item.id;
                return (
                  <button key={item.id} onClick={() => onNavigate(item.id)}
                    style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 7, border: "none", cursor: "pointer", width: "100%", textAlign: "left", fontSize: 12.5, fontWeight: isActive ? 600 : 400, transition: "all 0.12s", background: isActive ? "var(--mkt-nav-active-bg)" : "transparent", color: isActive ? "var(--mkt-nav-active-text)" : "var(--mkt-text-muted)", position: "relative", marginBottom: 1 }}
                    className="mkt-nav-item">
                    <SvgIcon path={item.icon} />
                    {item.label}
                    {item.badge > 0 && (
                      <span style={{ position: "absolute", right: 10, minWidth: 16, height: 16, borderRadius: 8, background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{item.badge}</span>
                    )}
                  </button>
                );
              })}
              {group.label && gi < NAV_GROUPS.length - 2 && (
                <div style={{ height: 1, background: "var(--mkt-border)", margin: "6px 12px 0" }} />
              )}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding:"8px", flexShrink:0 }}>
        <button onClick={() => { sessionStorage.clear(); localStorage.clear(); window.location.reload(); }}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", width:"100%", borderRadius:8,
            border:"1px solid var(--mkt-border)", background:"transparent", color:"var(--mkt-text-muted)",
            fontSize:12, cursor:"pointer", textAlign:"left", marginBottom:4 }}
          className="mkt-nav-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          Cerrar sesión
        </button>
        </div>
        {/* Switch to CRM */}
        <div style={{ padding: "8px", borderTop: "1px solid var(--mkt-border)", flexShrink: 0 }}>
          <button onClick={onSwitchToSales} className="mkt-nav-item"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", width: "100%", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", fontSize: 12, cursor: "pointer", textAlign: "left" }}>
            <SvgIcon path="M10 19l-7-7m0 0l7-7m-7 7h18" size={13} />
            Ver Pipeline de Ventas
          </button>
        </div>

        {/* Profile */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--mkt-border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--mkt-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0a0a0a", fontWeight: 600, fontSize: 12 }}>JM</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Julian M.</div>
              <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>Head of Marketing</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid var(--mkt-border)", background: "var(--mkt-surface)", position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(12px)", flexShrink: 0 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>{currentLabel}</h1>

          {/* Bell */}
          <div style={{ position: "relative" }}>
            <button onClick={() => { setBellOpen(!bellOpen); if (!bellOpen) markAllRead(); }}
              style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unread > 0 && <span style={{ position: "absolute", top: 4, right: 4, width: 14, height: 14, borderRadius: 7, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>}
            </button>
            {bellOpen && (
              <div style={{ position: "absolute", right: 0, top: 42, width: 320, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", borderRadius: 12, boxShadow: "0 20px 40px rgba(0,0,0,0.3)", overflow: "hidden", zIndex: 100 }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--mkt-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Notificaciones</span>
                  <button onClick={markAllRead} style={{ fontSize: 11, color: "var(--mkt-accent)", background: "none", border: "none", cursor: "pointer" }}>Marcar todas leídas</button>
                </div>
                {notifications.map(n => (
                  <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--mkt-border)", background: n.read ? "transparent" : "rgba(209,156,21,0.03)", display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{typeIcon(n.type)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, lineHeight: 1.4, color: n.read ? "var(--mkt-text-muted)" : "var(--mkt-text)" }}>{n.msg}</div>
                      <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginTop: 3 }}>{Math.floor((Date.now() - n.time) / 3600000)}h atrás</div>
                    </div>
                    {!n.read && <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--mkt-accent)", flexShrink: 0, marginTop: 4 }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { MarketingLayout });
