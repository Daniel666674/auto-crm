"use client";

import { useState, useEffect, useCallback } from "react";
import { Key, Plus, Trash2, Copy, Eye, EyeOff, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface TokenRow {
  id: string;
  name: string;
  tokenPreview: string;
  scopes: string;
  createdBy: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

const SCOPE_OPTIONS = [
  { value: "read:all",    label: "Solo lectura (todo)" },
  { value: "write:all",   label: "Lectura + escritura (todo)" },
  { value: "read:contacts,read:deals", label: "Lectura: contactos + deals" },
];

export function ApiTokensSettings() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("read:all");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/api-tokens");
      setTokens(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return showToast("El nombre es requerido", false);
    setCreating(true);
    try {
      const res = await fetch("/api/settings/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes }),
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error ?? "Error", false);
      setNewToken(data.token);
      setName("");
      setShowForm(false);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string, tokenName: string) => {
    if (!confirm(`¿Revocar el token "${tokenName}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/settings/api-tokens/${id}`, { method: "DELETE" });
    showToast("Token revocado");
    await load();
  };

  const copyToken = () => {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const active = tokens.filter((t) => !t.revokedAt);
  const revoked = tokens.filter((t) => t.revokedAt);

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* One-time token reveal */}
      {newToken && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <p className="text-sm font-semibold text-amber-300">Guarda este token ahora — no lo verás de nuevo</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-green-400 font-mono break-all">
              {newToken}
            </code>
            <button onClick={copyToken} className="shrink-0 rounded-lg bg-zinc-800 p-2 hover:bg-zinc-700 transition-colors">
              {copied ? <CheckCircle size={15} className="text-green-400" /> : <Copy size={15} className="text-zinc-300" />}
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Úsalo como: <code className="text-zinc-300">Authorization: Bearer {newToken.slice(0, 12)}…</code>
          </p>
          <button onClick={() => setNewToken(null)} className="text-xs text-zinc-500 hover:text-white">
            Entendido, cerrar
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">API Tokens</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Bearer tokens para integraciones externas (Zapier, n8n, scripts)</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-[#C39A4C]/20 px-3 py-1.5 text-xs text-[#C39A4C] hover:bg-[#C39A4C]/30 transition-colors"
        >
          <Plus size={13} /> Nuevo token
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Nombre del token</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C39A4C]"
                placeholder="Ej: Zapier integration"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Permisos</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C39A4C]"
                value={scopes}
                onChange={(e) => setScopes(e.target.value)}
              >
                {SCOPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-sm text-zinc-400 hover:text-white px-3 py-1.5">
              Cancelar
            </button>
            <button
              onClick={create}
              disabled={creating}
              className="rounded-lg bg-[#C39A4C] px-4 py-1.5 text-sm font-medium text-black hover:bg-[#d4aa5c] disabled:opacity-50 transition-colors"
            >
              {creating ? "Creando…" : "Crear token"}
            </button>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-zinc-500 text-sm"><RefreshCw size={14} className="inline animate-spin mr-1" /> Cargando…</div>}

      {!loading && active.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-2 py-10 text-zinc-600">
          <Key size={28} />
          <p className="text-sm">Sin tokens activos</p>
        </div>
      )}

      {active.map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">{t.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              ••••{t.tokenPreview} · {t.scopes} · {t.lastUsedAt ? `Usado ${new Date(t.lastUsedAt).toLocaleDateString("es-CO")}` : "Nunca usado"}
            </p>
          </div>
          <button
            onClick={() => revoke(t.id, t.name)}
            className="ml-3 text-zinc-600 hover:text-red-400 transition-colors"
            title="Revocar token"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      {revoked.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-2">
            {revoked.length} token{revoked.length > 1 ? "s" : ""} revocado{revoked.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-2 space-y-2">
            {revoked.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-zinc-800/50 bg-zinc-900/20 px-4 py-3 opacity-50">
                <div>
                  <p className="text-sm text-zinc-500 line-through">{t.name}</p>
                  <p className="text-xs text-zinc-600">Revocado {new Date(t.revokedAt!).toLocaleDateString("es-CO")}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
