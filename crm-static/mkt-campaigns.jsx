// Campaign Performance Wall
function CampaignWall() {
  const mkt = useMarketing();
  const [showForm, setShowForm] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState(null);
  const [animated, setAnimated] = React.useState(false);
  React.useEffect(() => { setTimeout(() => setAnimated(true), 100); }, []);

  const rateColor = (rate, thresholds) => {
    if (rate >= thresholds[0]) return "#22c55e";
    if (rate >= thresholds[1]) return "#f59e0b";
    return "#ef4444";
  };

  const StatusBadge = ({ status }) => {
    const cfg = { active: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Activa" }, paused: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Pausada" }, completed: { bg: "rgba(100,116,139,0.12)", color: "#94a3b8", label: "Completada" } };
    const c = cfg[status] || cfg.active;
    return <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }}>{c.label}</span>;
  };

  const AnimatedNum = ({ value, suffix = "" }) => {
    const [display, setDisplay] = React.useState(0);
    React.useEffect(() => {
      if (!animated) return;
      let start = 0; const end = value; const duration = 800; const startTime = Date.now();
      const tick = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(start + (end - start) * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      tick();
    }, [animated, value]);
    return <>{display}{suffix}</>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>{mkt.campaigns.length} campañas registradas</p>
        <button onClick={() => setShowForm(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Nueva Campaña</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {mkt.campaigns.map((camp, i) => (
          <div key={camp.id} className="mkt-card mkt-campaign-card"
            style={{ padding: 18, borderRadius: 12, cursor: "pointer", transition: "all 0.2s", animationDelay: `${i * 60}ms` }}
            onClick={() => setExpandedId(expandedId === camp.id ? null : camp.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{camp.name}</div>
                <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{camp.targetSegment}</div>
              </div>
              <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
                <StatusBadge status={camp.status} />
                {camp.channel && (
                  <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:20,
                    background:"rgba(209,156,21,0.1)", color:"var(--mkt-accent)", border:"1px solid rgba(209,156,21,0.2)",
                    whiteSpace:"nowrap" }}>
                    {camp.channel}
                  </span>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[
                { label: "Open Rate", value: camp.openRate, thresholds: [30, 15] },
                { label: "Click Rate", value: camp.clickRate, thresholds: [10, 5] },
                { label: "Reply Rate", value: camp.replyRate, thresholds: [5, 2] },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: rateColor(m.value, m.thresholds) }}>
                    <AnimatedNum value={m.value} suffix="%" />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--mkt-text-muted)", paddingTop: 10, borderTop: "1px solid var(--mkt-border)" }}>
              <span>{camp.totalContacts} contactos</span>
              <span style={{ color: camp.conversions > 0 ? "var(--mkt-accent)" : "var(--mkt-text-muted)", fontWeight: 600 }}>
                {camp.conversions} al pipeline
              </span>
              {camp.lastSent && <span>{formatRelative(camp.lastSent)}</span>}
            </div>

            {/* Expanded timeline */}
            {expandedId === camp.id && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--mkt-border)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Timeline de actividad</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { date: "Hace 2 días", text: `Batch enviado a ${Math.round(camp.totalContacts * 0.3)} contactos` },
                    { date: "Hace 5 días", text: `${Math.round(camp.totalContacts * camp.openRate / 100)} aperturas registradas` },
                    { date: "Hace 7 días", text: `Campaña ${camp.status === "active" ? "activada" : camp.status === "paused" ? "pausada" : "completada"}` },
                    { date: formatRelative(camp.startDate), text: "Campaña creada" },
                  ].map((ev, j) => (
                    <div key={j} style={{ display: "flex", gap: 10, fontSize: 12 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--mkt-accent)", marginTop: 5, flexShrink: 0 }} />
                      <div>
                        <span style={{ color: "var(--mkt-text-muted)" }}>{ev.date}</span>
                        <span style={{ marginLeft: 8 }}>{ev.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Campaign Modal */}
      {showForm && <CampaignFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}

function CampaignFormModal({ onClose, onCreated }) {
  const mkt = useMarketing();
  const [lists, setLists] = React.useState([]);
  const [step, setStep] = React.useState(1); // 1=details, 2=content, 3=review
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [form, setForm] = React.useState({
    name: "", subject: "", htmlContent: "",
    listIds: [], senderEmail: "daniel.acosta@blackscale.consulting",
    splitSend: false, scheduledAt: "", scheduleTime: "09:00",
  });

  React.useEffect(() => {
    fetch("/api/brevo/lists").then(r=>r.json()).then(d => setLists(d.lists||[])).catch(()=>{});
  }, []);

  const fStyle = { width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid var(--mkt-border)", background:"var(--mkt-bg)", color:"var(--mkt-text)", fontSize:13, outline:"none" };
  const lStyle = { fontSize:11, color:"var(--mkt-text-muted)", display:"block", marginBottom:4, fontWeight:500 };

  const toggleList = (id) => setForm(p => ({
    ...p, listIds: p.listIds.includes(id) ? p.listIds.filter(x=>x!==id) : [...p.listIds, id]
  }));

  const handleSend = async () => {
    if (!form.name || !form.subject || !form.htmlContent || !form.listIds.length) return;
    setSending(true);
    try {
      let scheduledAt = null;
      if (form.scheduledAt) {
        const [y,mo,d] = form.scheduledAt.split("-");
        const [h,mi] = form.scheduleTime.split(":");
        scheduledAt = new Date(y, mo-1, d, h, mi).toISOString();
      }
      const res = await fetch("/api/brevo/campaigns/create", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ ...form, scheduledAt }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        mkt.addCampaign({ name: form.name, status: scheduledAt ? "active" : "completed",
          startDate: Date.now(), targetSegment: `${form.listIds.length} lista(s)`,
          totalContacts: 0, openRate:0, clickRate:0, replyRate:0, conversions:0,
          channel: "Brevo Email", lastSent: scheduledAt ? null : Date.now() });
      }
    } catch(e) {
      setResult({ error: e.message });
    }
    setSending(false);
  };

  const canNext1 = form.name && form.subject && form.listIds.length > 0;
  const canNext2 = form.htmlContent.length > 20;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)" }} />
      <div style={{ position:"relative", width:600, maxHeight:"90vh", overflowY:"auto", background:"var(--mkt-surface)", borderRadius:16, border:"1px solid var(--mkt-border)", padding:28, boxShadow:"0 24px 48px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:17, fontWeight:700, marginBottom:2 }}>Nueva Campaña Brevo</h2>
            <div style={{ fontSize:11, color:"var(--mkt-text-muted)" }}>Paso {step} de 3</div>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {[1,2,3].map(s => <div key={s} style={{ width:24, height:4, borderRadius:2, background: s<=step ? "var(--mkt-accent)" : "var(--mkt-border)" }} />)}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div style={{ padding:16, borderRadius:10, marginBottom:20,
            background: result.success ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${result.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: result.success ? "#22c55e" : "#fca5a5", fontSize:13 }}>
            {result.success ? (form.splitSend ? "✓ 2 campañas creadas en Brevo (split 50/50)" : "✓ Campaña creada en Brevo") : "✗ " + result.error}
          </div>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={lStyle}>Nombre de la campaña *</label>
              <input style={fStyle} placeholder="Ej: Outreach Wave 3 — Mayo 2026" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
            </div>
            <div>
              <label style={lStyle}>Asunto del email *</label>
              <input style={fStyle} placeholder="Ej: ¿Tu equipo comercial está dejando deals sobre la mesa?" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))} />
            </div>
            <div>
              <label style={lStyle}>Listas de Brevo *</label>
              <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:160, overflowY:"auto", padding:4 }}>
                {lists.length === 0 && <div style={{ fontSize:12, color:"var(--mkt-text-muted)" }}>Cargando listas...</div>}
                {lists.map(l => (
                  <label key={l.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:7, border:`1px solid ${form.listIds.includes(l.id) ? "var(--mkt-accent)" : "var(--mkt-border)"}`, background: form.listIds.includes(l.id) ? "rgba(209,156,21,0.06)" : "transparent", cursor:"pointer" }}>
                    <input type="checkbox" checked={form.listIds.includes(l.id)} onChange={()=>toggleList(l.id)} style={{ accentColor:"var(--mkt-accent)" }} />
                    <span style={{ fontSize:13, flex:1 }}>{l.name}</span>
                    <span style={{ fontSize:11, color:"var(--mkt-text-muted)" }}>{l.totalSubscribers || 0} contactos</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={lStyle}>Remitente</label>
              <div style={{ display:"flex", gap:8 }}>
                {["daniel.acosta@blackscale.consulting","julian.vallejo@blackscale.consulting"].map(e => (
                  <button key={e} onClick={()=>setForm(p=>({...p,senderEmail:e,splitSend:false}))}
                    style={{ flex:1, padding:"9px 12px", borderRadius:8, border:`1px solid ${form.senderEmail===e&&!form.splitSend?"var(--mkt-accent)":"var(--mkt-border)"}`,
                      background:form.senderEmail===e&&!form.splitSend?"rgba(209,156,21,0.08)":"transparent",
                      color:form.senderEmail===e&&!form.splitSend?"var(--mkt-accent)":"var(--mkt-text-muted)", fontSize:12, cursor:"pointer", textAlign:"left" }}>
                    {e.split("@")[0].replace("."," ").replace(/\w/g,c=>c.toUpperCase())}
                    <div style={{ fontSize:10, opacity:0.7 }}>{e}</div>
                  </button>
                ))}
                <button onClick={()=>setForm(p=>({...p,splitSend:!p.splitSend}))}
                  style={{ flex:1, padding:"9px 12px", borderRadius:8, border:`1px solid ${form.splitSend?"var(--mkt-accent)":"var(--mkt-border)"}`,
                    background:form.splitSend?"rgba(209,156,21,0.08)":"transparent",
                    color:form.splitSend?"var(--mkt-accent)":"var(--mkt-text-muted)", fontSize:12, cursor:"pointer" }}>
                  Split 50/50
                  <div style={{ fontSize:10, opacity:0.7 }}>Ambos remitentes</div>
                </button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <label style={lStyle}>Programar envío (opcional)</label>
                <input type="date" style={fStyle} value={form.scheduledAt} onChange={e=>setForm(p=>({...p,scheduledAt:e.target.value}))} />
              </div>
              <div>
                <label style={lStyle}>Hora</label>
                <input type="time" style={fStyle} value={form.scheduleTime} onChange={e=>setForm(p=>({...p,scheduleTime:e.target.value}))} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Content */}
        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ padding:12, borderRadius:8, background:"rgba(209,156,21,0.06)", border:"1px solid rgba(209,156,21,0.15)", fontSize:12, color:"var(--mkt-text-muted)" }}>
              Escribe el HTML de tu email. Usa <code style={{color:"var(--mkt-accent)"}}>{`{{contact.FIRSTNAME}}`}</code> para personalizar con el nombre del contacto.
            </div>
            <div>
              <label style={lStyle}>Contenido HTML *</label>
              <textarea value={form.htmlContent} onChange={e=>setForm(p=>({...p,htmlContent:e.target.value}))}
                style={{...fStyle, height:320, resize:"vertical", fontFamily:"monospace", fontSize:12, lineHeight:1.6}}
                placeholder={`<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2>Hola {{contact.FIRSTNAME}},</h2>
  <p>Tu mensaje aquí...</p>
  <p>Saludos,<br>Daniel</p>
</body>
</html>`} />
            </div>
            {form.htmlContent && (
              <details>
                <summary style={{ fontSize:12, color:"var(--mkt-accent)", cursor:"pointer", marginBottom:8 }}>Vista previa</summary>
                <div style={{ border:"1px solid var(--mkt-border)", borderRadius:8, overflow:"hidden", height:240 }}>
                  <iframe srcDoc={form.htmlContent} style={{ width:"100%", height:"100%", border:"none", background:"#fff" }} title="preview" />
                </div>
              </details>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                ["Campaña", form.name],
                ["Asunto", form.subject],
                ["Listas", `${form.listIds.length} seleccionada(s)`],
                ["Remitente", form.splitSend ? "Split 50/50 — Daniel + Julian" : form.senderEmail],
                ["Envío", form.scheduledAt ? `Programado: ${form.scheduledAt} ${form.scheduleTime}` : "Inmediato"],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--mkt-border)", fontSize:13 }}>
                  <span style={{ color:"var(--mkt-text-muted)" }}>{k}</span>
                  <span style={{ fontWeight:500, textAlign:"right", maxWidth:320 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding:12, borderRadius:8, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", fontSize:12, color:"#fca5a5" }}>
              Esta acción creará la campaña en Brevo. {form.scheduledAt ? "Se enviará en la fecha programada." : "Se enviará inmediatamente si haces clic en Enviar."}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display:"flex", gap:8, marginTop:20 }}>
          {result?.success ? (
            <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:8, border:"none", background:"var(--mkt-accent)", color:"#0a0a0a", fontSize:13, fontWeight:600, cursor:"pointer" }}>Cerrar</button>
          ) : (
            <>
              <button onClick={()=>step>1?setStep(step-1):onClose()} style={{ padding:"11px 18px", borderRadius:8, border:"1px solid var(--mkt-border)", background:"transparent", color:"var(--mkt-text-muted)", fontSize:13, cursor:"pointer" }}>
                {step===1?"Cancelar":"Atrás"}
              </button>
              {step < 3 && (
                <button onClick={()=>setStep(step+1)} disabled={step===1?!canNext1:!canNext2}
                  style={{ flex:1, padding:"11px", borderRadius:8, border:"none", background:"var(--mkt-accent)", color:"#0a0a0a", fontSize:13, fontWeight:600, cursor:"pointer", opacity:(step===1?canNext1:canNext2)?1:0.4 }}>
                  Siguiente →
                </button>
              )}
              {step === 3 && (
                <button onClick={handleSend} disabled={sending}
                  style={{ flex:1, padding:"11px", borderRadius:8, border:"none", background: sending?"#666":"var(--mkt-accent)", color:"#0a0a0a", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  {sending ? "Creando en Brevo..." : form.scheduledAt ? "Programar campaña" : "Enviar campaña"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CampaignWall, CampaignFormModal });
