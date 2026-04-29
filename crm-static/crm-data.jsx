// CRM Data Layer — real data from Brevo, no seed data
const CRM_SEED_CONTACTS = [];
const CRM_SEED_STAGES = [
  { id: "s1", name: "Prospecto",     order: 0, color: "#64748b", isWon: false, isLost: false },
  { id: "s2", name: "Contactado",    order: 1, color: "#3b82f6", isWon: false, isLost: false },
  { id: "s3", name: "Propuesta",     order: 2, color: "#a855f7", isWon: false, isLost: false },
  { id: "s4", name: "Negociación",   order: 3, color: "#f59e0b", isWon: false, isLost: false },
  { id: "s5", name: "Cerrado Ganado",order: 4, color: "#22c55e", isWon: true,  isLost: false },
  { id: "s6", name: "Perdido",       order: 5, color: "#ef4444", isWon: false, isLost: true  },
];
const CRM_SEED_DEALS      = [];
const CRM_SEED_ACTIVITIES = [];
const CRM_NEXT_STEPS      = {};

// Map Brevo contact → CRM contact
function mapBrevoContact(b, index) {
  const attrs = b.attributes || {};
  const name  = [attrs.FIRSTNAME, attrs.LASTNAME].filter(Boolean).join(" ") || b.email.split("@")[0];
  return {
    id:          `b${b.id || index}`,
    name,
    email:       b.email || "",
    phone:       attrs.SMS || attrs.PHONE || "",
    company:     attrs.COMPANY || attrs.EMPRESA || "",
    source:      (attrs.SOURCE || "website").toLowerCase().replace(/ /g,"_"),
    temperature: attrs.TEMPERATURE || "cold",
    score:       parseInt(attrs.SCORE || "0") || 20,
    notes:       attrs.NOTES || attrs.NOTAS || "",
    createdAt:   new Date(b.createdAt || Date.now()).getTime(),
    updatedAt:   Date.now(),
  };
}

const CRMContext = React.createContext(null);

function CRMProvider({ children }) {
  const [contacts,   setContacts]   = React.useState([]);
  const [deals,      setDeals]      = React.useState(CRM_SEED_DEALS);
  const [stages]                    = React.useState(CRM_SEED_STAGES);
  const [activities, setActivities] = React.useState([]);
  const [nextSteps,  setNextSteps]  = React.useState(CRM_NEXT_STEPS);
  const [sheetConfig, setSheetConfig] = React.useState({ isConnected: false, lastSync: null });
  const [loading, setLoading]       = React.useState(true);

  // Fetch contacts from Brevo via Next.js proxy
  React.useEffect(() => {
    fetch("/api/brevo/contacts")
      .then(r => r.json())
      .then(data => {
        if (data.contacts) setContacts(data.contacts.map(mapBrevoContact));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addContact    = React.useCallback((c)  => { const n = { ...c, id:`c${Date.now()}`, createdAt:Date.now(), updatedAt:Date.now() }; setContacts(p=>[n,...p]); return n; }, []);
  const updateContact = React.useCallback((id,u)=> setContacts(p=>p.map(c=>c.id===id?{...c,...u,updatedAt:Date.now()}:c)), []);
  const deleteContact = React.useCallback((id)  => { setContacts(p=>p.filter(c=>c.id!==id)); setDeals(p=>p.filter(d=>d.contactId!==id)); }, []);
  const addDeal       = React.useCallback((d)   => { const n={...d,id:`d${Date.now()}`,createdAt:Date.now()}; setDeals(p=>[n,...p]); return n; }, []);
  const moveDeal      = React.useCallback((id,stageId)=>setDeals(p=>p.map(d=>d.id===id?{...d,stageId}:d)),[]);
  const addActivity   = React.useCallback((a)   => { const n={...a,id:`a${Date.now()}`,createdAt:Date.now()}; setActivities(p=>[n,...p]); return n; }, []);
  const completeActivity = React.useCallback((id)=>setActivities(p=>p.map(a=>a.id===id?{...a,completedAt:Date.now()}:a)),[]);
  const connectSheet  = React.useCallback(async()=>({ success:false, error:"Use Brevo integration" }),[]);

  const value = { contacts, deals, stages, activities, nextSteps, sheetConfig, loading,
    addContact, updateContact, deleteContact, addDeal, moveDeal, addActivity, completeActivity, connectSheet };

  return React.createElement(CRMContext.Provider, { value }, children);
}

function useCRM() { return React.useContext(CRMContext); }

function formatCRM(v) {
  return new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(v);
}
function formatDateCRM(ts) {
  if (!ts) return "-";
  return new Intl.DateTimeFormat("es-CO",{day:"numeric",month:"short",year:"numeric"}).format(new Date(ts));
}
function formatRelative(ts) {
  const d = Math.floor((Date.now()-ts)/86400000);
  if (d===0) return "Hoy"; if (d===1) return "Ayer";
  if (d<7) return `Hace ${d} días`; if (d<30) return `Hace ${Math.floor(d/7)} sem`;
  return formatDateCRM(ts);
}
function daysUntil(ts) { return Math.ceil((ts-Date.now())/86400000); }

const SOURCE_LABELS_CRM = {
  website:"Sitio web", whatsapp:"WhatsApp", referido:"Referido",
  redes_sociales:"Redes sociales", llamada_fria:"Llamada fría",
  email:"Email", formulario:"Formulario", evento:"Evento", otro:"Otro",
};
const ACTIVITY_ICONS  = { call:"📞", email:"✉️", meeting:"👥", note:"📝", follow_up:"⏰" };
const ACTIVITY_LABELS = { call:"Llamada", email:"Email", meeting:"Reunión", note:"Nota", follow_up:"Seguimiento" };

Object.assign(window, {
  CRMProvider, useCRM, CRMContext,
  formatCRM, formatDateCRM, formatRelative, daysUntil,
  SOURCE_LABELS_CRM, ACTIVITY_ICONS, ACTIVITY_LABELS,
  CRM_SEED_CONTACTS, CRM_SEED_STAGES, CRM_SEED_DEALS, CRM_SEED_ACTIVITIES,
});
