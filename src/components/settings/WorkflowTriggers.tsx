"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Globe, Bell } from "lucide-react";

interface Action {
  type: "send_webhook" | "notify_slack" | "log";
  url?: string;
  method?: string;
  message?: string;
  body?: string;
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
  deal_stage_changed: "Deal cambia de etapa",
  contact_score_reached: "Contacto alcanza score",
  lead_created: "Nuevo lead creado",
  deal_created: "Nuevo deal creado",
  followup_overdue: "Seguimiento vencido",
};

const EVENTS = Object.keys(EVENT_LABELS);

const ACTION_ICONS: Record<string, React.ReactNode> = {
  send_webhook: <Globe size={13} />,
  notify_slack: <Bell size={13} />,
  log: <Zap size={13} />,
};

function ActionBadge({ action }: { action: Action }) {
  return (
    <span className="flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
      {ACTION_ICONS[action.type]}
      {action.type === "send_webhook" && (action.url ? new URL(action.url).hostname : "webhook")}
      {action.type === "notify_slack" && "Slack"}
      {action.type === "log" && "Log"}
    </span>
  );
}

export function WorkflowTriggers({ role }: { role: string }) {
  const canEdit = role === "superadmin" || role === "marketing";
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // New workflow form state
  const [form, setForm] = useState({
    name: "",
    eventType: "deal_stage_changed",
    actionType: "send_webhook" as Action["type"],
    webhookUrl: "",
    webhookMethod: "POST",
    slackMessage: "",
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

  const create = async () => {
    if (!form.name.trim()) return showToast("El nombre es requerido", false);

    const actions: Action[] = [];
    if (form.actionType === "send_webhook") {
      if (!form.webhookUrl) return showToast("URL del webhook requerida", false);
      actions.push({ type: "send_webhook", url: form.webhookUrl, method: form.webhookMethod });
    } else if (form.actionType === "notify_slack") {
      actions.push({ type: "notify_slack", message: form.slackMessage || "Trigger: {{event}}" });
    } else {
      actions.push({ type: "log" });
    }

    const conditions: Record<string, string> = {};
    if (form.conditionKey && form.conditionVal) {
      conditions[form.conditionKey] = form.conditionVal;
    }

    const res = await fetch("/api/settings/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        eventType: form.eventType,
        conditions,
        actions,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return showToast(err.error ?? "Error al crear", false);
    }

    setForm({ name: "", eventType: "deal_stage_changed", actionType: "send_webhook", webhookUrl: "", webhookMethod: "POST", slackMessage: "", conditionKey: "", conditionVal: "" });
    setShowForm(false);
    showToast("Workflow creado");
    await load();
  };

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
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-lg bg-[#C39A4C]/20 px-3 py-1.5 text-xs text-[#C39A4C] hover:bg-[#C39A4C]/30 transition-colors"
          >
            <Plus size={13} />
            Nuevo workflow
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
          <p className="text-sm font-medium text-white">Nuevo workflow</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-zinc-400 mb-1 block">Nombre</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C39A4C]"
                placeholder="Ej: Notificar Slack al cerrar deal"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Evento disparador</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C39A4C]"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              >
                {EVENTS.map((e) => (
                  <option key={e} value={e}>{EVENT_LABELS[e]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Acción</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C39A4C]"
                value={form.actionType}
                onChange={(e) => setForm({ ...form, actionType: e.target.value as Action["type"] })}
              >
                <option value="send_webhook">Enviar Webhook</option>
                <option value="notify_slack">Notificar Slack</option>
                <option value="log">Solo registrar</option>
              </select>
            </div>
          </div>

          {form.actionType === "send_webhook" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 mb-1 block">URL destino</label>
                <input
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C39A4C]"
                  placeholder="https://hooks.zapier.com/..."
                  value={form.webhookUrl}
                  onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Método</label>
                <select
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C39A4C]"
                  value={form.webhookMethod}
                  onChange={(e) => setForm({ ...form, webhookMethod: e.target.value })}
                >
                  <option>POST</option>
                  <option>PUT</option>
                  <option>GET</option>
                </select>
              </div>
            </div>
          )}

          {form.actionType === "notify_slack" && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Mensaje (usa {`{{field}}`} para datos del evento)</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C39A4C]"
                placeholder="Deal {{dealTitle}} cambió a {{stageName}}"
                value={form.slackMessage}
                onChange={(e) => setForm({ ...form, slackMessage: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Condición (campo, opcional)</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C39A4C]"
                placeholder="isWon"
                value={form.conditionKey}
                onChange={(e) => setForm({ ...form, conditionKey: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Condición (valor)</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C39A4C]"
                placeholder="true"
                value={form.conditionVal}
                onChange={(e) => setForm({ ...form, conditionVal: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-sm text-zinc-400 hover:text-white px-3 py-1.5">
              Cancelar
            </button>
            <button
              onClick={create}
              className="rounded-lg bg-[#C39A4C] px-4 py-1.5 text-sm font-medium text-black hover:bg-[#d4aa5c] transition-colors"
            >
              Crear workflow
            </button>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-zinc-500 text-sm">Cargando…</div>}

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
              <button
                onClick={() => setExpanded(isExpanded ? null : wf.id)}
                className="flex-1 flex items-center gap-3 text-left"
              >
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
                    {wf.active
                      ? <ToggleRight size={20} className="text-[#C39A4C]" />
                      : <ToggleLeft size={20} className="text-zinc-600" />}
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
