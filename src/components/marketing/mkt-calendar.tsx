"use client";

import React, { useEffect, useState, useCallback } from "react";

type EventType = "Campaña" | "Reunión" | "Contenido" | "Evento";

interface CalEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  type: EventType;
  participants: string[];
  notes: string;
}

const PARTICIPANTS = [
  { label: "Daniel", email: "daniel@blackscale.consulting", initials: "D" },
  { label: "Julian", email: "julian@blackscale.consulting", initials: "J" },
];

const TYPE_COLORS: Record<EventType, { bg: string; color: string }> = {
  Campaña:   { bg: "rgba(195,154,76,0.18)",  color: "#C39A4C" },
  Reunión:   { bg: "rgba(66,153,225,0.18)",  color: "#4299e1" },
  Contenido: { bg: "rgba(159,122,234,0.18)", color: "#9f7aea" },
  Evento:    { bg: "rgba(72,187,120,0.18)",  color: "#48bb78" },
};

const LS_KEY = "nexus_calendar_events";

function loadEvents(): CalEvent[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function saveEvents(evs: CalEvent[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(evs));
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

function toGCalDate(date: string, time: string, durationMin: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const start = new Date(y, m - 1, d, hh, mm, 0);
  const end = new Date(start.getTime() + durationMin * 60000);
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}T${pad2(dt.getHours())}${pad2(dt.getMinutes())}00`;
  return `${fmt(start)}/${fmt(end)}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #1e1e1e", background: "#0a0a0a", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 };

export function MktCalendar() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "", date: new Date().toISOString().split("T")[0],
    time: "10:00", duration: 60,
    type: "Reunión" as EventType,
    participants: [] as string[],
    notes: "",
  });

  useEffect(() => { setEvents(loadEvents()); }, []);

  const refresh = useCallback(() => setEvents(loadEvents()), []);

  const handleDelete = (id: string) => {
    const updated = loadEvents().filter(e => e.id !== id);
    saveEvents(updated); refresh();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const ev: CalEvent = { ...form, id: `evt_${Date.now()}` };
    const all = [...loadEvents(), ev];
    saveEvents(all); refresh();

    // Open Google Calendar pre-filled
    const dates = toGCalDate(form.date, form.time, form.duration);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: form.title,
      dates,
      details: form.notes,
    });
    if (form.participants.length > 0) params.set("add", form.participants.join(","));
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank");

    setShowModal(false);
    setForm({ title: "", date: new Date().toISOString().split("T")[0], time: "10:00", duration: 60, type: "Reunión", participants: [], notes: "" });
  };

  const toggleParticipant = (email: string) => {
    setForm(f => ({
      ...f,
      participants: f.participants.includes(email)
        ? f.participants.filter(p => p !== email)
        : [...f.participants, email],
    }));
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsForDay = (day: number) => {
    const iso = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    return events.filter(e => e.date === iso);
  };

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={prevMonth} style={{ background: "transparent", border: "1px solid #1e1e1e", borderRadius: 6, color: "#718096", width: 28, height: 28, cursor: "pointer", fontSize: 14 }}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", minWidth: 180, textAlign: "center" }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={nextMonth} style={{ background: "transparent", border: "1px solid #1e1e1e", borderRadius: 6, color: "#718096", width: 28, height: 28, cursor: "pointer", fontSize: 14 }}>›</button>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#C39A4C", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Agregar actividad
        </button>
      </div>

      {/* Grid */}
      <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid #1e1e1e" }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontSize: 10, fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {cells.map((day, idx) => {
            const isToday = day !== null && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            const dayEvents = day ? eventsForDay(day) : [];
            return (
              <div key={idx} style={{
                minHeight: 80, padding: "6px 8px",
                borderRight: (idx + 1) % 7 !== 0 ? "1px solid #1e1e1e" : "none",
                borderBottom: idx < cells.length - 7 ? "1px solid #1e1e1e" : "none",
                background: !day ? "rgba(255,255,255,0.01)" : "transparent",
              }}>
                {day && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? "#C39A4C" : "#718096", marginBottom: 4,
                      ...(isToday ? { background: "#C39A4C", color: "#0a0a0a", width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" } : {}) }}>
                      {day}
                    </div>
                    {dayEvents.map(ev => (
                      <EventChip key={ev.id} ev={ev} onDelete={handleDelete} />
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => setShowModal(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
          <div style={{ position: "relative", width: 500, maxHeight: "90vh", overflowY: "auto", background: "#111111", border: "1px solid #1e1e1e", borderRadius: 14, padding: 24, boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 18 }}>Agregar actividad</h2>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ej: Lanzamiento campaña Q2" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hora (HH:MM)</label>
                  <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Duración (min)</label>
                  <input type="number" min={5} value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["Campaña", "Reunión", "Contenido", "Evento"] as EventType[]).map(t => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                      style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer",
                        border: `1px solid ${form.type === t ? "#C39A4C" : "#1e1e1e"}`,
                        background: form.type === t ? "rgba(195,154,76,0.15)" : "transparent",
                        color: form.type === t ? "#C39A4C" : "#718096" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Participantes</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {PARTICIPANTS.map(p => (
                    <label key={p.email} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#e2e8f0", cursor: "pointer" }}>
                      <input type="checkbox" checked={form.participants.includes(p.email)} onChange={() => toggleParticipant(p.email)} style={{ accentColor: "#C39A4C" }} />
                      <span style={{ fontWeight: 600 }}>{p.label}</span>
                      <span style={{ fontSize: 10, color: "#718096" }}>{p.email}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notas</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3} placeholder="Descripción del evento…"
                  style={{ ...inputStyle, resize: "vertical", height: 72, fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #1e1e1e", background: "transparent", color: "#718096", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#C39A4C", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Guardar + Abrir Google Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EventChip({ ev, onDelete }: { ev: CalEvent; onDelete: (id: string) => void }) {
  const [hover, setHover] = useState(false);
  const tc = TYPE_COLORS[ev.type] ?? { bg: "rgba(113,128,150,0.18)", color: "#718096" };
  const parts = PARTICIPANTS.filter(p => ev.participants.includes(p.email));
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: "relative", marginBottom: 3, padding: "3px 6px", borderRadius: 5, background: tc.bg, display: "flex", alignItems: "center", gap: 4, cursor: "default" }}
    >
      <span style={{ fontSize: 9, fontWeight: 600, color: tc.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }}>{ev.title}</span>
      <div style={{ display: "flex", gap: 2, marginLeft: "auto", flexShrink: 0 }}>
        {parts.map(p => (
          <div key={p.email} style={{ width: 14, height: 14, borderRadius: "50%", background: "#C39A4C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#0a0a0a" }}>{p.initials}</div>
        ))}
      </div>
      {hover && (
        <button onClick={e => { e.stopPropagation(); onDelete(ev.id); }}
          style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "#6D1F2E", border: "none", color: "#fff", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
          ×
        </button>
      )}
    </div>
  );
}
