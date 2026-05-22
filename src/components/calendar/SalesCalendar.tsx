"use client";

import React, { useEffect, useState, useCallback } from "react";

type EventType = "Llamada" | "Reunión" | "Follow-up" | "Email" | "Otro";

interface CalEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  type: EventType;
  contactId?: string;
  contactName?: string;
  notes: string;
  source: "activity" | "local" | "google";
  htmlLink?: string;
}

interface GoogleEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  allDay: boolean;
  htmlLink: string;
}

interface ActivityRow {
  id: string;
  type: string;
  description: string;
  contactId: string;
  contactName: string | null;
  scheduledAt: number | string | Date | null;
  completedAt: number | string | Date | null;
}

const TYPE_COLORS: Record<EventType, { bg: string; color: string }> = {
  "Llamada":   { bg: "rgba(59,130,246,0.18)",  color: "#3b82f6" },
  "Reunión":   { bg: "rgba(34,197,94,0.18)",   color: "#22c55e" },
  "Follow-up": { bg: "rgba(245,158,11,0.18)",  color: "#f59e0b" },
  "Email":     { bg: "rgba(168,85,247,0.18)",  color: "#a855f7" },
  "Otro":      { bg: "rgba(113,128,150,0.18)", color: "#718096" },
};

const ACTIVITY_TO_LABEL: Record<string, EventType> = {
  call: "Llamada", meeting: "Reunión", follow_up: "Follow-up", email: "Email", note: "Otro",
};

const LS_KEY = "nexus_sales_calendar_events";

function loadLocal(): CalEvent[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function saveLocal(evs: CalEvent[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(evs));
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

function toMs(val: number | string | Date | null | undefined): number | null {
  if (!val) return null;
  if (val instanceof Date) return val.getTime();
  if (typeof val === "string") {
    const t = Date.parse(val); return Number.isNaN(t) ? null : t;
  }
  return val < 1e10 ? val * 1000 : val;
}

function toGCalDate(date: string, time: string, durationMin: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const start = new Date(y, m - 1, d, hh, mm, 0);
  const end = new Date(start.getTime() + durationMin * 60000);
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}T${pad2(dt.getHours())}${pad2(dt.getMinutes())}00`;
  return `${fmt(start)}/${fmt(end)}`;
}

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--background)",
  color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6,
};

export function SalesCalendar() {
  const [activityEvents, setActivityEvents] = useState<CalEvent[]>([]);
  const [localEvents, setLocalEvents] = useState<CalEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalEvent[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", date: new Date().toISOString().split("T")[0],
    time: "10:00", duration: 30,
    type: "Reunión" as EventType,
    contactName: "",
    notes: "",
  });

  const loadActivities = useCallback(() => {
    fetch("/api/activities")
      .then(r => r.ok ? r.json() : [])
      .then((rows: ActivityRow[]) => {
        if (!Array.isArray(rows)) { setActivityEvents([]); return; }
        const mapped: CalEvent[] = rows
          .filter(a => a.scheduledAt)
          .map(a => {
            const ms = toMs(a.scheduledAt)!;
            const d = new Date(ms);
            return {
              id: `act_${a.id}`,
              title: a.description,
              date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
              time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
              duration: 30,
              type: ACTIVITY_TO_LABEL[a.type] ?? "Otro",
              contactId: a.contactId,
              contactName: a.contactName ?? "",
              notes: a.description,
              source: "activity",
            };
          });
        setActivityEvents(mapped);
      })
      .catch(() => setActivityEvents([]));
  }, []);

  const loadGoogle = useCallback((y: number, mo: number) => {
    const timeMin = new Date(y, mo, 1).toISOString();
    const timeMax = new Date(y, mo + 1, 0, 23, 59, 59).toISOString();
    fetch(`/api/calendar/google?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
      .then(r => r.ok ? r.json() : { connected: false, events: [] })
      .then((d: { connected: boolean; events: GoogleEvent[] }) => {
        setGoogleConnected(!!d.connected);
        const mapped: CalEvent[] = (d.events ?? []).map(e => ({
          id: `g_${e.id}`,
          title: e.title,
          date: e.date,
          time: e.allDay ? "" : e.time,
          duration: e.duration,
          type: "Reunión",
          notes: "",
          source: "google",
          htmlLink: e.htmlLink,
        }));
        setGoogleEvents(mapped);
      })
      .catch(() => { setGoogleConnected(false); setGoogleEvents([]); });
  }, []);

  useEffect(() => {
    setLocalEvents(loadLocal());
    loadActivities();
  }, [loadActivities]);

  useEffect(() => { loadGoogle(year, month); }, [year, month, loadGoogle]);

  const allEvents = [...googleEvents, ...activityEvents, ...localEvents];

  const handleDelete = (id: string) => {
    if (id.startsWith("act_")) return; // can't delete activity-backed events here
    const updated = loadLocal().filter(e => e.id !== id);
    saveLocal(updated); setLocalEvents(updated);
  };

  const resetForm = () =>
    setForm({ title: "", date: new Date().toISOString().split("T")[0], time: "10:00", duration: 30, type: "Reunión", contactName: "", notes: "" });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    // Connected → create the real Workspace event via the API, then refresh from Google.
    if (googleConnected) {
      setSaving(true);
      try {
        const res = await fetch("/api/calendar/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            date: form.date,
            time: form.time,
            duration: form.duration,
            notes: form.notes,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "No se pudo crear el evento en Google Calendar");
        }
        loadGoogle(year, month);
        setShowModal(false);
        resetForm();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al crear evento");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Not connected → keep local + open the Google Calendar compose template (fallback).
    const ev: CalEvent = { ...form, id: `evt_${Date.now()}`, source: "local" };
    const all = [...loadLocal(), ev];
    saveLocal(all); setLocalEvents(all);

    const dates = toGCalDate(form.date, form.time, form.duration);
    const params = new URLSearchParams({ action: "TEMPLATE", text: form.title, dates, details: form.notes });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank");

    setShowModal(false);
    resetForm();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1);
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsForDay = (day: number) => {
    const iso = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    return allEvents.filter(e => e.date === iso);
  };

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };
  const goToday = () => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prevMonth} style={navBtnStyle}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 700, minWidth: 180, textAlign: "center" }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={nextMonth} style={navBtnStyle}>›</button>
          <button onClick={goToday} style={{ ...navBtnStyle, width: "auto", padding: "0 12px", fontSize: 12 }}>Hoy</button>
          <span title={googleConnected ? "Sincronizado con Google Workspace" : "Conecta Google en Ajustes › Integraciones para sincronizar"}
            style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5,
              background: googleConnected ? "rgba(66,133,244,0.12)" : "rgba(113,128,150,0.12)",
              color: googleConnected ? "#4285f4" : "var(--muted-foreground)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: googleConnected ? "#4285f4" : "#718096" }} />
            {googleConnected ? "Google sincronizado" : "Google no conectado"}
          </span>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          padding: "8px 16px", borderRadius: 8, border: "none",
          background: "var(--primary)", color: "var(--primary-foreground)",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          + Nueva actividad
        </button>
      </div>

      {/* Grid */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--border)" }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {cells.map((day, idx) => {
            const isToday = day !== null && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            const dayEvents = day ? eventsForDay(day) : [];
            return (
              <div key={idx}
                onClick={() => {
                  if (!day) return;
                  const iso = `${year}-${pad2(month + 1)}-${pad2(day)}`;
                  setForm(f => ({ ...f, date: iso }));
                  setShowModal(true);
                }}
                style={{
                  minHeight: 90, padding: "6px 8px",
                  borderRight: (idx + 1) % 7 !== 0 ? "1px solid var(--border)" : "none",
                  borderBottom: idx < cells.length - 7 ? "1px solid var(--border)" : "none",
                  background: !day ? "rgba(255,255,255,0.01)" : "transparent",
                  cursor: day ? "pointer" : "default",
                }}>
                {day && (
                  <>
                    <div style={{
                      fontSize: 11, fontWeight: isToday ? 700 : 400,
                      color: isToday ? "var(--primary-foreground)" : "var(--muted-foreground)",
                      marginBottom: 4,
                      ...(isToday ? { background: "var(--primary)", width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" } : {}),
                    }}>
                      {day}
                    </div>
                    {dayEvents.slice(0, 3).map(ev => (
                      <EventChip key={ev.id} ev={ev} onDelete={handleDelete} />
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: 9, color: "var(--muted-foreground)", marginTop: 2 }}>+{dayEvents.length - 3} más</div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "var(--muted-foreground)" }}>
        {(Object.keys(TYPE_COLORS) as EventType[]).map(t => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLORS[t].color }} />
            {t}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={() => setShowModal(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Nueva actividad</h2>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ej: Llamada con Cliente X" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div><label style={labelStyle}>Fecha</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Hora</label><input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Duración (min)</label><input type="number" min={5} value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} style={inputStyle} /></div>
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(Object.keys(TYPE_COLORS) as EventType[]).map(t => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                      style={{
                        padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer",
                        border: `1px solid ${form.type === t ? "var(--primary)" : "var(--border)"}`,
                        background: form.type === t ? "rgba(209,156,21,0.12)" : "transparent",
                        color: form.type === t ? "var(--primary)" : "var(--muted-foreground)",
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Contacto (opcional)</label>
                <input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} placeholder="Nombre del contacto" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Notas</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Detalles..." style={{ ...inputStyle, resize: "vertical", height: 72, fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, cursor: saving ? "not-allowed" : "pointer" }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Guardando…" : googleConnected ? "Guardar en Google Calendar" : "Guardar + Abrir Google Calendar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--border)", borderRadius: 6,
  color: "var(--muted-foreground)", width: 28, height: 28, cursor: "pointer", fontSize: 14,
};

function EventChip({ ev, onDelete }: { ev: CalEvent; onDelete: (id: string) => void }) {
  const [hover, setHover] = useState(false);
  const isGoogle = ev.source === "google";
  const tc = isGoogle ? { bg: "rgba(66,133,244,0.18)", color: "#4285f4" } : (TYPE_COLORS[ev.type] ?? TYPE_COLORS["Otro"]);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => { if (isGoogle && ev.htmlLink) { e.stopPropagation(); window.open(ev.htmlLink, "_blank"); } }}
      title={`${ev.time ? ev.time + " · " : ""}${ev.title}${ev.contactName ? ` · ${ev.contactName}` : ""}${isGoogle ? " · Google Calendar" : ""}`}
      style={{ position: "relative", marginBottom: 3, padding: "3px 6px", borderRadius: 5, background: tc.bg, display: "flex", alignItems: "center", gap: 4, cursor: isGoogle ? "pointer" : "inherit" }}
    >
      {isGoogle && <span style={{ fontSize: 8, fontWeight: 800, color: tc.color, flexShrink: 0 }}>G</span>}
      <span style={{ fontSize: 9, fontWeight: 600, color: tc.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {ev.time} {ev.title}
      </span>
      {hover && ev.source === "local" && (
        <button onClick={e => { e.stopPropagation(); onDelete(ev.id); }}
          style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "#6D1F2E", border: "none", color: "#fff", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
          ×
        </button>
      )}
    </div>
  );
}
