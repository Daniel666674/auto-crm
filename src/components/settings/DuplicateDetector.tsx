"use client";

import { useState, useEffect, useCallback } from "react";
import { GitMerge, Trash2, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  temperature: string;
  score: number;
}

interface DuplicateGroup {
  reason: "email" | "name_company";
  contacts: Contact[];
}

const TEMP_LABEL: Record<string, string> = {
  hot: "Caliente",
  warm: "Tibio",
  cold: "Frío",
};

const TEMP_COLOR: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-amber-400",
  cold: "text-blue-400",
};

export function DuplicateDetector() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/duplicates");
      const data = await res.json();
      setGroups(data.groups ?? []);
    } catch {
      showToast("Error al cargar duplicados", false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dismiss = (idx: number) => {
    setDismissed((prev) => new Set([...prev, String(idx)]));
  };

  const merge = async (group: DuplicateGroup, winnerId: string, groupIdx: number) => {
    const losers = group.contacts.filter((c) => c.id !== winnerId);
    setMerging(`${groupIdx}-${winnerId}`);
    try {
      for (const loser of losers) {
        const res = await fetch("/api/contacts/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winnerId, loserId: loser.id }),
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.error ?? "Error al fusionar", false);
          return;
        }
      }
      showToast(`Fusionado con éxito — ${losers.length} contacto${losers.length > 1 ? "s" : ""} eliminado${losers.length > 1 ? "s" : ""}`);
      await load();
    } finally {
      setMerging(null);
    }
  };

  const visible = groups.filter((_, i) => !dismissed.has(String(i)));

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Detección de duplicados</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Contactos con mismo email o nombre+empresa
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {loading && (
        <div className="text-center py-10 text-zinc-500 text-sm">Analizando contactos…</div>
      )}

      {!loading && visible.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-zinc-500">
          <CheckCircle size={32} className="text-green-500" />
          <p className="text-sm">Sin duplicados detectados</p>
        </div>
      )}

      {!loading && visible.map((group, idx) => (
        <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs text-zinc-400">
              <AlertTriangle size={13} className="text-amber-400" />
              {group.reason === "email"
                ? `Mismo email: ${group.contacts[0]?.email}`
                : `Mismo nombre + empresa: ${group.contacts[0]?.name} @ ${group.contacts[0]?.company}`}
            </span>
            <button
              onClick={() => dismiss(idx)}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Ignorar
            </button>
          </div>

          <div className="grid gap-2">
            {group.contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  <p className="text-xs text-zinc-400 truncate">
                    {[c.email, c.company, c.phone].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className={`text-xs ${TEMP_COLOR[c.temperature] ?? "text-zinc-400"}`}>
                    {TEMP_LABEL[c.temperature] ?? c.temperature}
                  </span>
                  <span className="text-xs text-zinc-500">Score {c.score}</span>
                  <button
                    onClick={() => merge(group, c.id, idx)}
                    disabled={!!merging}
                    className="flex items-center gap-1 rounded-md bg-[#C39A4C]/20 px-2 py-1 text-xs text-[#C39A4C] hover:bg-[#C39A4C]/30 disabled:opacity-50 transition-colors"
                  >
                    <GitMerge size={12} />
                    Conservar
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-600">
            Haz clic en &quot;Conservar&quot; en el contacto ganador. Los demás se eliminarán y sus actividades/deals se moverán al ganador.
          </p>
        </div>
      ))}

      {!loading && groups.length > 0 && visible.length < groups.length && (
        <p className="text-xs text-zinc-600 text-center">
          {groups.length - visible.length} grupo{groups.length - visible.length > 1 ? "s" : ""} ignorado{groups.length - visible.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
