// Marketing Data Layer — real data from Brevo
const MKT_CONTACTS_SEED = [];
const MKT_CAMPAIGNS_SEED = [];

const MKT_INDUSTRIES = ["Tecnología","Inmobiliaria","Consultoría","E-commerce","Marketing","Logística","Salud","Alimentos","Finanzas","Educación","Construcción","Seguros","SaaS","Otro"];
const MKT_TIERS      = [1, 2, 3];
const MKT_SOURCES    = ["website","referido","redes_sociales","formulario","evento","llamada_fria","whatsapp","email","otro"];
const MKT_SOURCE_LABELS = {
  website:"Sitio Web", referido:"Referido", redes_sociales:"Redes Sociales",
  formulario:"Formulario", evento:"Evento", llamada_fria:"Llamada Fría",
  whatsapp:"WhatsApp", email:"Email", otro:"Otro",
};

function mapBrevoToMktContact(b, index) {
  const attrs = b.attributes || {};
  const name  = [attrs.FIRSTNAME, attrs.LASTNAME].filter(Boolean).join(" ") || b.email.split("@")[0];
  const score = parseInt(attrs.SCORE || "0") || 15;
  return {
    id:               `m${b.id || index}`,
    name,
    email:            b.email || "",
    phone:            attrs.SMS || attrs.PHONE || "",
    company:          attrs.COMPANY || attrs.EMPRESA || "",
    source:           (attrs.SOURCE || "otro").toLowerCase().replace(/ /g,"_"),
    tier:             parseInt(attrs.TIER || "3") || 3,
    temperature:      attrs.TEMPERATURE || "cold",
    score,
    brevo_cadence:    attrs.CADENCE || attrs.CADENCIA || "Cold Welcome",
    engagement_status: score >= 70 ? "hot" : score >= 40 ? "warm" : score >= 15 ? "cold" : "dead",
    email_opens:      parseInt(attrs.EMAIL_OPENS || "0") || 0,
    email_clicks:     parseInt(attrs.EMAIL_CLICKS || "0") || 0,
    lead_source_detail: attrs.SOURCE_DETAIL || "",
    marketing_notes:  attrs.NOTES || attrs.NOTAS || "",
    ready_for_sales:  attrs.READY_FOR_SALES === "true" || false,
    passed_to_sales_at: null,
    industry:         attrs.INDUSTRY || attrs.INDUSTRIA || "Otro",
    lastActivity:     new Date(b.modifiedAt || b.createdAt || Date.now()).getTime(),
  };
}

function mapBrevoToCampaign(c, i) {
  const stats = c.statistics?.globalStats || {};
  const sent  = stats.sent || c.statistics?.campaignStats?.[0]?.sent || 0;
  return {
    id:            `camp${c.id || i}`,
    name:          c.name || `Campaña ${i+1}`,
    status:        c.status === "sent" ? "completed" : c.status === "scheduled" ? "active" : "draft",
    startDate:     new Date(c.scheduledAt || c.createdAt || Date.now()).getTime(),
    targetSegment: c.recipients?.listIds?.join(", ") || "Todos",
    cadenceType:   "outreach",
    openRate:      sent > 0 ? Math.round(((stats.uniqueOpens||0)/sent)*100) : 0,
    clickRate:     sent > 0 ? Math.round(((stats.uniqueClicks||0)/sent)*100) : 0,
    replyRate:     0,
    totalContacts: sent,
    conversions:   stats.softBounces || 0,
    lastSent:      c.sentDate ? new Date(c.sentDate).getTime() : null,
  };
}

const MarketingContext = React.createContext(null);

function MarketingProvider({ children }) {
  const [contacts,  setContacts]  = React.useState([]);
  const [campaigns, setCampaigns] = React.useState([]);
  const [loading,   setLoading]   = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/brevo/contacts").then(r=>r.json()).catch(()=>({})),
      fetch("/api/brevo/campaigns").then(r=>r.json()).catch(()=>({})),
    ]).then(([cData, campData]) => {
      if (cData.contacts) setContacts(cData.contacts.map(mapBrevoToMktContact));
      if (campData.campaigns) setCampaigns(campData.campaigns.map(mapBrevoToCampaign));
    }).finally(() => setLoading(false));
  }, []);

  const updateEngagement = React.useCallback((id, status) =>
    setContacts(p=>p.map(c=>c.id===id?{...c,engagement_status:status}:c)), []);

  const passToSales = React.useCallback((id) =>
    setContacts(p=>p.map(c=>c.id===id?{...c,ready_for_sales:true,passed_to_sales_at:Date.now()}:c)), []);

  const addContact = React.useCallback((c) => {
    const n = { ...c, id:`c${Date.now()}`, score:c.tier===1?60:c.tier===2?35:15,
      engagement_status:"cold", email_opens:0, email_clicks:0,
      ready_for_sales:false, passed_to_sales_at:null, lastActivity:Date.now() };
    setContacts(p=>[n,...p]); return n;
  }, []);

  const addCampaign = React.useCallback((c) => {
    const n = { ...c, id:`camp${Date.now()}`, openRate:0, clickRate:0, replyRate:0, conversions:0, lastSent:null };
    setCampaigns(p=>[n,...p]); return n;
  }, []);

  return React.createElement(MarketingContext.Provider,
    { value: { contacts, campaigns, loading, updateEngagement, passToSales, addContact, addCampaign } },
    children
  );
}

function useMarketing() { return React.useContext(MarketingContext); }

function mktFormatCOP(v) {
  return new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(v);
}

Object.assign(window, {
  MarketingProvider, useMarketing, MarketingContext,
  MKT_CONTACTS_SEED, MKT_CAMPAIGNS_SEED,
  MKT_INDUSTRIES, MKT_TIERS, MKT_SOURCES, MKT_SOURCE_LABELS,
  mktFormatCOP,
});
