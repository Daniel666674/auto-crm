"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Globe, Bell, MessageSquare, CheckSquare, Thermometer, Tag, GitBranch, Sparkles } from "lucide-react";
import { BSLoading } from "../ui/BSLoading";

type ActionType = "send_webhook" | "notify_slack" | "notify_inapp" | "create_followup" | "set_temperature" | "set_lifecycle" | "add_tag" | "log";

interface Action {
  type: ActionType;
  url?: string;
  method?: string;
  message?: string;
  body?: string;
  value?: string;
  delayDays?: number;
}

interface Workflow {
  id: string;
  name: string;
  eventType: string;
  conditions: string;
  actions: string;
  active: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  lead_created: "Nuevo lead creado",
  contact_score_reached: "Contacto alcanza score",
  contact_tier_reached: "Contacto alcanza Tier",
  became_mql: "Se convierte en MQL",
  became_sql: "Se convierte en SQL",
  lifecycle_changed: "Cambia de etapa (lifecycle)",
  contact_replied: "Contacto responde email",
  meeting_booked: "Reunión agendada",
  deal_created: "Nuevo deal creado",
  deal_stage_changed: "Deal cambia de etapa",
  deal_won: "Deal ganado",
  deal_lost: "Deal perdido",
  followup_overdue: "Seguimiento vencido",
  campaign_created: "Campaña creada",
  campaign_completed: "Campaña completada",
  mkt_handoff: "Handoff a ventas",
  mkt_engagement_changed: "Cambia engagement (mkt)",
};

const EVENTS = Object.keys(EVENT_LABELS);

const ACTION_LABELS: Record<ActionType, string> = {
  send_webhook: "Enviar Webhook",
  notify_slack: "Notificar Slack",
  notify_inapp: "Notificación in-app",
  create_followup: "Crear seguimiento",
  set_temperature: "Cambiar temperatura",
  set_lifecycle: "Cambiar etapa lifecycle",
  add_tag: "Agregar etiqueta",
  log: "Solo registrar",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  send_webhook: <Globe size={13} />,
  notify_slack: <Bell size={13} />,
  notify_inapp: <MessageSquare size={13} />,
  create_followup: <CheckSquare size={13} />,
  set_temperature: <Thermometer size={13} />,
  set_lifecycle: <GitBranch size={13} />,
  add_tag: <Tag size={13} />,
  log: <Zap size={13} />,
};

// One-click recommended automations — high-value defaults the team can enable.
const TEMPLATES: Array<{ name: string; eventType: string; conditions: Record<string, string>; actions: Action[] }> = [
  { name: "Lead responde → crear seguimiento mañana", eventType: "contact_replied", conditions: {}, actions: [{ type: "create_followup", value: "Responder a {{subject}}", delayDays: 1 }, { type: "notify_inapp", message: "Respuesta recibida de un contacto" }] },
  { name: "Se vuelve SQL → notificar al equipo", eventType: "became_sql", conditions: {}, actions: [{ type: "notify_inapp", message: "Nuevo SQL: {{name}}" }, { type: "add_tag", value: "SQL" }] },
  { name: "Score ≥ 60 → marcar caliente", eventType: "contact_score_reached", conditions: { score: ">=60" }, actions: [{ type: "set_temperature", value: "hot" }] },
  { name: "Deal ganado → notificar Slack", eventType: "deal_won", conditions: {}, actions: [{ type: "notify_slack", message: "🎉 Deal ganado: {{dealTitle}} ({{value}})" }] },
  { name: "Reunión agendada → etiqueta + seguimiento", eventType: "meeting_booked", conditions: {}, actions: [{ type: "add_tag", value: "reunión" }, { type: "create_followup", value: "Preparar reunión con {{name}}", delayDays: 0 }] },
  { name: "Seguimiento vencido → recordatorio in-app", eventType: "followup_overdue", conditions: {}, actions: [{ type: "notify_inapp", message: "Seguimiento vencido con {{name}}" }] },
];

function ActionBadge({ action }: { action: Action }) {
  return (
    <span className="flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
      {ACTION_ICONS[action.type]}
      {action.type === "send_webhook" && (action.url ? safeHost(action.url) : "webhook")}
      {action.type === "notify_slack" && "Slack"}
      {action.type === "notify_inapp" && "In-app"}
      {action.type === "create_followup" && "Seguimiento"}
      {action.type === "set_temperature" && `Temp: ${action.value ?? ""}`}
      {action.type === "set_lifecycle" && `Etapa: ${action.value ?? ""}`}
      {action.type === "add_tag" && `#${action.value ?? ""}`}
      {action.type === "log" && "Log"}
    </span>
  );
}

function safeHost(url: string): string {
  try { return new URL(url).hostname; } catch { return "webhook"; }
}

const VALUE_ACTIONS = new Set<ActionType>(["create_followup", "set_temperature", "set_lifecycle", "add_tag"]);

export function WorkflowTriggers({ role }: { role: string }) {
  const canEdit = role === "superadmin" || role === "marketing";
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [form, setForm] = useState({
    name: "",
    eventType: "contact_replied",
    actionType: "notify_inapp" as ActionType,
    webhookUrl: "",
    webhookMethod: "POST",
    message: "",
    actionValue: "",
    delayDays: "1",
    conditionKey: "",
    conditionVal: "",
  });

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/workflows");
      setWorkflows(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (wf: Workflow) => {
    await fetch(`/api/settings/workflows/${wf.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !wf.active }),
    });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este workflow?")) return;
    await fetch(`/api/settings/workflows/${id}`, { method: "DELETE" });
    await load();
  };

  const persist = async (name: string, eventType: string, conditions: Record<string, string>, actions: Action[]) => {
    const res = await fetch("/api/settings/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, eventType, conditions, actions }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "Error al crear", false);
      return false;
    }
    return true;
  };

  const create = async () => {
    if (!form.name.trim()) return showToast("El nombre es requerido", false);

    const action: Action = { type: form.actionType };
    if (form.actionType === "send_webhook") {
      if (!form.webhookUrl) return showToast("URL del webhook requerida", false);
      action.url = form.webhookUrl;
      action.method = form.webhookMethod;
    } else if (form.actionType === "notify_slack" || form.actionType === "notify_inapp") {
      action.message = form.message || "Trigger: {{event}}";
    } else if (VALUE_ACTIONS.has(form.actionType)) {
      if (!form.actionValue) return showToast("Valor requerido para esta acción", false);
      action.value = form.actionValue;
      if (form.actionType === "create_followup") action.delayDays = parseInt(form.delayDays) || 0;
    }

    const conditions: Record<string, string> = {};
    if (form.conditionKey && form.conditionVal) conditions[form.conditionKey] = form.conditionVal;

    const ok = await persist(form.name, form.eventType, conditions, [action]);
    if (!ok) return;

    setForm({ name: "", eventType: "contact_replied", actionType: "notify_inapp", webhookUrl: "", webhookMethod: "POST", message: "", actionValue: "", delayDays: "1", conditionKey: "", conditionVal: "" });
    setShowForm(false);
    showToast("Workflow creado");
    await load();
  };

  const addTemplate = async (t: typeof TEMPLATES[number]) => {
    const ok = await persist(t.name, t.eventType, t.conditions, t.actions);
    if (ok) { showToast("Automatización agregada"); await load(); }
  };

  const inputCls = "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C39A4C]";

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Automatizaciones</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Dispara acciones cuando ocurren eventos en el CRM</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-[#C39A4C]/20 px-3 py-1.5 text-xs text-[#C39A4C] hover:bg-[#C39A4C]/30 transition-colors">
            <Plus size={13} /> Nuevo workflow
          </button>
        )}
      </div>

      {/* Recommended templates */}
      {canEdit && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#C39A4C] mb-3"><Sparkles size={13} /> Plantillas recomendadas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button key={t.name} onClick={() => addTemplate(t)} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-left text-xs text-zinc-300 hover:border-[#C39A4C]/50 transition-colors">
                <span>{t.name}</span>
                <Plus size={13} className="text-[#C39A4C] shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && canEdit && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
          <p className="text-sm font-medium text-white">Nuevo workflow</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-zinc-400 mb-1 block">Nombre</label>
              <input className={inputCls} placeholder="Ej: Notificar Slack al cerrar deal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Evento disparador</label>
              <select className={inputCls} value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
                {EVENTS.map((e) => <option key={e} value={e}>{EVENT_LABELS[e]}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Acción</label>
              <select className={inputCls} value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value as ActionType })}>
                {(Object.keys(ACTION_LABELS) as ActionType[]).map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
              </select>
            </div>
          </div>

          {form.actionType === "send_webhook" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 mb-1 block">URL destino</label>
                <input className={inputCls} placeholder="https://hooks.zapier.com/..." value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Método</label>
                <select className={inputCls} value={form.webhookMethod} onChange={(e) => setForm({ ...form, webhookMethod: e.target.value })}>
                  <option>POST</option><option>PUT</option><option>GET</option>
                </select>
              </div>
            </div>
          )}

          {(form.actionType === "notify_slack" || form.actionType === "notify_inapp") && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Mensaje (usa {`{{campo}}`} para datos del evento)</label>
              <input className={inputCls} placeholder="Nuevo SQL: {{name}}" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
          )}

          {VALUE_ACTIONS.has(form.actionType) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">
                  {form.actionType === "set_temperature" ? "Temperatura (hot/warm/cold)" :
                   form.actionType === "set_lifecycle" ? "Etapa (MQL/SQL/opportunity…)" :
                   form.actionType === "add_tag" ? "Etiqueta" : "Texto del seguimiento"}
                </label>
                <input className={inputCls} placeholder={form.actionType === "set_temperature" ? "hot" : form.actionType === "add_tag" ? "SQL" : "Responder a {{subject}}"} value={form.actionValue} onChange={(e) => setForm({ ...form, actionValue: e.target.value })} />
              </div>
              {form.actionType === "create_followup" && (
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Días de espera</label>
                  <input type="number" className={inputCls} value={form.delayDays} onChange={(e) => setForm({ ...form, delayDays: e.target.value })} />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Condición (campo, opcional)</label>
              <input className={inputCls} placeholder="score / fitTier / industry" value={form.conditionKey} onChange={(e) => setForm({ ...form, conditionKey: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Condición (valor — admite {">"}=, {"<"}=, !=, contains:)</label>
              <input className={inputCls} placeholder=">=60  ó  A  ó  contains:fintech" value={form.conditionVal} onChange={(e) => setForm({ ...form, conditionVal: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-sm text-zinc-400 hover:text-white px-3 py-1.5">Cancelar</button>
            <button onClick={create} className="rounded-lg bg-[#C39A4C] px-4 py-1.5 text-sm font-medium text-black hover:bg-[#d4aa5c] transition-colors">Crear workflow</button>
          </div>
        </div>
      )}

      {loading && <BSLoading label="Cargando workflows…" />}

      {!loading && workflows.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-zinc-600">
          <Zap size={32} />
          <p className="text-sm">Sin workflows configurados</p>
        </div>
      )}

      {!loading && workflows.map((wf) => {
        const actions: Action[] = JSON.parse(wf.actions || "[]");
        const isExpanded = expanded === wf.id;
        return (
          <div key={wf.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => setExpanded(isExpanded ? null : wf.id)} className="flex-1 flex items-center gap-3 text-left">
                <Zap size={15} className={wf.active ? "text-[#C39A4C]" : "text-zinc-600"} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{wf.name}</p>
                  <p className="text-xs text-zinc-400">{EVENT_LABELS[wf.eventType] ?? wf.eventType}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {actions.map((a, i) => <ActionBadge key={i} action={a} />)}
                </div>
                {isExpanded ? <ChevronUp size={14} className="text-zinc-500 shrink-0" /> : <ChevronDown size={14} className="text-zinc-500 shrink-0" />}
              </button>

              {canEdit && (
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggle(wf)} title={wf.active ? "Desactivar" : "Activar"}>
                    {wf.active ? <ToggleRight size={20} className="text-[#C39A4C]" /> : <ToggleLeft size={20} className="text-zinc-600" />}
                  </button>
                  <button onClick={() => remove(wf.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-950/30 space-y-2">
                <div className="text-xs text-zinc-500 font-mono">
                  <p className="text-zinc-400 mb-1">Condiciones:</p>
                  <pre className="rounded bg-zinc-800/50 p-2 overflow-x-auto">{JSON.stringify(JSON.parse(wf.conditions || "{}"), null, 2)}</pre>
                </div>
                <div className="text-xs text-zinc-500 font-mono">
                  <p className="text-zinc-400 mb-1">Acciones:</p>
                  <pre className="rounded bg-zinc-800/50 p-2 overflow-x-auto">{JSON.stringify(JSON.parse(wf.actions || "[]"), null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
