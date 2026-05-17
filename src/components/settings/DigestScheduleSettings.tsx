"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Clock, Calendar, CheckCircle } from "lucide-react";

interface DigestSchedule {
  enabled: boolean;
  hour: number;
  frequency: "daily" | "weekly" | "monthly";
  weekday?: number;
  email: string;
}

const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const FREQ_LABELS: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual (día 1)",
};

export function DigestScheduleSettings({ role }: { role: string }) {
  const isSuperadmin = role === "superadmin";
  const [schedule, setSchedule] = useState<DigestSchedule>({
    enabled: false,
    hour: 7,
    frequency: "daily",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/digest-schedule");
      setSchedule(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/digest-schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error ?? "Error al guardar", false);
      } else {
        showToast("Configuración guardada");
      }
    } finally {
      setSaving(false);
    }
  };

  const sendTestDigest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/digest", { method: "POST" });
      if (res.ok) {
        showToast("Digest de prueba enviado");
      } else {
        const err = await res.json();
        showToast(err.error ?? "Error al enviar", false);
      }
    } finally {
      setTesting(false);
    }
  };

  const timeLabel = () => {
    const h = schedule.hour;
    const suffix = h < 12 ? "AM" : "PM";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}:00 ${suffix}`;
  };

  if (loading) return <div className="py-6 text-center text-sm text-zinc-500">Cargando…</div>;

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white">Digest programado</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Resumen automático vía email (requiere RESEND_API_KEY)</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{schedule.enabled ? "Activo" : "Inactivo"}</span>
          <button
            onClick={() => isSuperadmin && setSchedule({ ...schedule, enabled: !schedule.enabled })}
            disabled={!isSuperadmin}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${schedule.enabled ? "bg-[#C39A4C]" : "bg-zinc-700"} ${!isSuperadmin ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span
              className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${schedule.enabled ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <Mail size={12} /> Email destino
          </label>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C39A4C] disabled:opacity-50"
            type="email"
            placeholder="tu@empresa.com"
            value={schedule.email}
            onChange={(e) => setSchedule({ ...schedule, email: e.target.value })}
            disabled={!isSuperadmin}
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <Calendar size={12} /> Frecuencia
          </label>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C39A4C] disabled:opacity-50"
            value={schedule.frequency}
            onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value as DigestSchedule["frequency"] })}
            disabled={!isSuperadmin}
          >
            {Object.entries(FREQ_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {schedule.frequency === "weekly" && (
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Día de la semana</label>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C39A4C] disabled:opacity-50"
              value={schedule.weekday ?? 1}
              onChange={(e) => setSchedule({ ...schedule, weekday: Number(e.target.value) })}
              disabled={!isSuperadmin}
            >
              {WEEKDAY_LABELS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <Clock size={12} /> Hora de envío — <span className="text-[#C39A4C]">{timeLabel()}</span>
          </label>
          <input
            className="w-full accent-[#C39A4C]"
            type="range"
            min={0}
            max={23}
            value={schedule.hour}
            onChange={(e) => setSchedule({ ...schedule, hour: Number(e.target.value) })}
            disabled={!isSuperadmin}
          />
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
          </div>
        </div>
      </div>

      {schedule.enabled && schedule.email && (
        <div className="flex items-center gap-2 rounded-lg bg-green-900/20 border border-green-800/30 px-3 py-2.5">
          <CheckCircle size={14} className="text-green-500 shrink-0" />
          <p className="text-xs text-green-400">
            Digest programado para enviar {FREQ_LABELS[schedule.frequency].toLowerCase()} a las {timeLabel()} → {schedule.email}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        {isSuperadmin && (
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[#C39A4C] px-4 py-2 text-sm font-medium text-black hover:bg-[#d4aa5c] disabled:opacity-50 transition-colors"
          >
            {saving ? "Guardando…" : "Guardar configuración"}
          </button>
        )}
        <button
          onClick={sendTestDigest}
          disabled={testing}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50 transition-colors"
        >
          {testing ? "Enviando…" : "Enviar digest ahora"}
        </button>
        <p className="text-xs text-zinc-600">Envía el digest actual independientemente del horario</p>
      </div>

      {!isSuperadmin && (
        <p className="text-xs text-zinc-600">Solo superadmin puede modificar la programación.</p>
      )}
    </div>
  );
}
