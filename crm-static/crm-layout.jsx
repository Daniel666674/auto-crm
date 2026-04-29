// CRM Layout Shell — grouped sidebar + notification bell
function CRMLayout({ children, currentPage, onNavigate }) {
  const crm = useCRM();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [bellOpen, setBellOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState([
    { id: "n1", read: false, msg: "Julian envió 3 handoffs nuevos a ventas", type: "handoff", time: Date.now() - 2*3600000 },
    { id: "n2", read: false, msg: "FoodTech CO: renovación en 10 días", type: "renewal", time: Date.now() - 5*3600000 },
    { id: "n3", read: false, msg: "Deal 'Agencia Creativa' sin actividad hace 8 días", type: "risk", time: Date.now() - 24*3600000 },
    { id: "n4", read: true, msg: "Inmobiliaria Rodríguez: renovación en 25 días", type: "renewal", time: Date.now() - 48*3600000 },
  ]);

  const unread = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const NAV_GROUPS = [
    {
      label: null,
      items: [
        { id: "dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
        { id: "pipeline", label: "Pipeline", icon: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" },
        { id: "contacts", label: "Contactos", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
        { id: "deals", label: "Deals", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
        { id: "activities", label: "Actividades", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
      ],
    },
    {
      label: "Revenue Intelligence",
      items: [
        { id: "forecast", label: "Forecast", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
        { id: "deal-intelligence", label: "Deal Intelligence", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
        { id: "win-loss", label: "Win / Loss", icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" },
      ],
    },
    {
      label: "Prospecting Engine",
      items: [
        { id: "icp-scorer", label: "ICP Scorer", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
        { id: "sequences", label: "Secuencias", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
        { id: "radar", label: "Radar", icon: "M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" },
      ],
    },
    {
      label: "Account Management",
      items: [
        { id: "clients", label: "Clientes", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
        { id: "renewals", label: "Renovaciones", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
        { id: "deliverables", label: "Entregables", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
      ],
    },
    {
      label: "Propuestas & Precios",
      items: [
        { id: "proposals", label: "Propuestas", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
        { id: "calculator", label: "Calculadora", icon: "M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M16 5a2 2 0 114 0v1a1 1 0 01-1 1h-2a1 1 0 01-1-1V5zM12 12h4m-4 4h2" },
      ],
    },
    {
      label: "Reportes Internos",
      items: [
        { id: "revenue", label: "Revenue", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
        { id: "activity-metrics", label: "Métricas", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
        { id: "pipeline-health", label: "Pipeline Health", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
      ],
    },
    {
      label: null,
      items: [
        { id: "settings", label: "Ajustes", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
      ],
    },
  ];

  const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);
  const overdueCount = crm.activities.filter(a => !a.completedAt && a.scheduledAt && a.scheduledAt < Date.now()).length;
  const currentLabel = ALL_ITEMS.find(n => n.id === currentPage)?.label || "Dashboard";

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return crm.contacts.filter(c => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q)).slice(0, 5);
  }, [searchQuery, crm.contacts]);

  const SvgIcon = ({ path, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {path.split(" M").map((seg, i) => <path key={i} d={i === 0 ? seg : "M" + seg} />)}
    </svg>
  );

  const typeIcon = t => t === "handoff" ? "🤝" : t === "renewal" ? "📅" : t === "risk" ? "⚠" : "🔔";

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--crm-bg)", color: "var(--crm-text)" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, minHeight: "100vh", background: "var(--crm-sidebar)", borderRight: "1px solid var(--crm-border)", display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 40, overflowY: "auto" }} className="crm-sidebar">
        {/* Logo */}
        <div style={{ height: 64, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", borderBottom: "1px solid var(--crm-border)", flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--crm-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--crm-accent-text)", fontWeight: 700, fontSize: 14 }}>B</div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>BlackScale CRM</span>
        </div>

        {/* Nav groups */}
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: group.label ? 4 : 0 }}>
              {group.label && (
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--crm-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 12px 5px", marginTop: gi > 0 ? 6 : 0 }}>
                  {group.label}
                </div>
              )}
              {group.items.map(item => {
                const isActive = currentPage === item.id;
                return (
                  <button key={item.id} onClick={() => { onNavigate(item.id); setMobileMenuOpen(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 7, border: "none", cursor: "pointer", width: "100%", textAlign: "left", fontSize: 13, fontWeight: isActive ? 600 : 400, transition: "all 0.12s", background: isActive ? "var(--crm-nav-active-bg)" : "transparent", color: isActive ? "var(--crm-nav-active-text)" : "var(--crm-text-muted)", position: "relative", marginBottom: 1 }}
                    className="crm-nav-item">
                    <SvgIcon path={item.icon} size={16} />
                    <span style={{ fontSize: 12.5 }}>{item.label}</span>
                    {item.id === "activities" && overdueCount > 0 && (
                      <span style={{ position: "absolute", right: 10, width: 16, height: 16, borderRadius: 8, background: "var(--crm-danger)", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{overdueCount}</span>
                    )}
                  </button>
                );
              })}
              {group.label && gi < NAV_GROUPS.length - 2 && (
                <div style={{ height: 1, background: "var(--crm-border)", margin: "6px 12px 0" }} />
              )}
            </div>
          ))}
        </nav>

        {/* Switch to Nexus */}
        <div style={{ padding: "8px", borderTop: "1px solid var(--crm-border)", flexShrink: 0 }}>
          <button onClick={() => window.location.href = "Marketing Command Center.html"}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", width: "100%", borderRadius: 8, border: "1px solid var(--crm-border)", background: "transparent", color: "var(--crm-text-muted)", fontSize: 12, cursor: "pointer", textAlign: "left" }}
            className="crm-nav-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            Abrir BlackScale Nexus
          </button>
        </div>

        {/* Logout */}
          {/* Logout */}
          <button onClick={() => { sessionStorage.clear(); localStorage.clear(); window.location.reload(); }}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", width:"100%", borderRadius:8,
              border:"1px solid var(--crm-border)", background:"transparent", color:"var(--crm-text-muted)",
              fontSize:12, cursor:"pointer", textAlign:"left", marginBottom:4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Cerrar sesión
          </button>
        {/* Profile */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--crm-border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--crm-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--crm-accent-text)", fontWeight: 600, fontSize: 12 }}>DG</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Daniel G.</div>
              <div style={{ fontSize: 11, color: "var(--crm-text-muted)" }}>Sales</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Header */}
        <header style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid var(--crm-border)", background: "var(--crm-surface)", position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(12px)", flexShrink: 0 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>{currentLabel}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setSearchOpen(!searchOpen)}
                style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--crm-border)", background: "transparent", color: "var(--crm-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              </button>
              {searchOpen && (
                <div style={{ position: "absolute", right: 0, top: 42, width: 300, background: "var(--crm-surface)", border: "1px solid var(--crm-border)", borderRadius: 12, padding: 8, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar contactos..." autoFocus
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--crm-border)", background: "var(--crm-bg)", color: "var(--crm-text)", fontSize: 13, outline: "none" }} />
                  {searchResults.map(c => (
                    <button key={c.id} onClick={() => { onNavigate("contact-detail", c.id); setSearchOpen(false); setSearchQuery(""); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", width: "100%", border: "none", background: "transparent", borderRadius: 6, cursor: "pointer", color: "var(--crm-text)", textAlign: "left", marginTop: 4 }}
                      className="crm-nav-item">
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--crm-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--crm-accent-text)", fontSize: 10, fontWeight: 600 }}>
                        {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div><div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--crm-text-muted)" }}>{c.company}</div></div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bell */}
            <div style={{ position: "relative" }}>
              <button onClick={() => { setBellOpen(!bellOpen); if (!bellOpen) markAllRead(); }}
                style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--crm-border)", background: "transparent", color: "var(--crm-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {unread > 0 && (
                  <span style={{ position: "absolute", top: 4, right: 4, width: 14, height: 14, borderRadius: 7, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>
                )}
              </button>
              {bellOpen && (
                <div style={{ position: "absolute", right: 0, top: 42, width: 320, background: "var(--crm-surface)", border: "1px solid var(--crm-border)", borderRadius: 12, boxShadow: "0 20px 40px rgba(0,0,0,0.3)", overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--crm-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Notificaciones</span>
                    <button onClick={markAllRead} style={{ fontSize: 11, color: "var(--crm-accent)", background: "none", border: "none", cursor: "pointer" }}>Marcar todas como leídas</button>
                  </div>
                  {notifications.map(n => (
                    <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--crm-border)", background: n.read ? "transparent" : "rgba(209,156,21,0.03)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{typeIcon(n.type)}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, lineHeight: 1.4, color: n.read ? "var(--crm-text-muted)" : "var(--crm-text)" }}>{n.msg}</div>
                        <div style={{ fontSize: 10, color: "var(--crm-text-muted)", marginTop: 3 }}>{Math.floor((Date.now() - n.time) / 3600000)}h atrás</div>
                      </div>
                      {!n.read && <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--crm-accent)", flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  ))}
                  {!notifications.length && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--crm-text-muted)" }}>Sin notificaciones</div>}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {children}
        </main>
      </div>

      {mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 35 }} />}
    </div>
  );
}

Object.assign(window, { CRMLayout });
