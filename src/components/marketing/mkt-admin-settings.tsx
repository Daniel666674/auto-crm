"use client";

import React, { useCallback, useEffect, useState } from "react";

// ── Shared marketing-themed style helpers ────────────────────────────────────
const card: React.CSSProperties = { background: "var(--mkt-card)", border: "1px solid var(--mkt-border)", borderRadius: 12, padding: 20 };
const input: React.CSSProperties = { width: "100%", padding: "8px 12px", background: "var(--mkt-bg)", border: "1px solid var(--mkt-border)", borderRadius: 8, fontSize: 13, color: "var(--mkt-text)", outline: "none", boxSizing: "border-box" };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block" };
const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 4 };
const sectionHint: React.CSSProperties = { fontSize: 12, color: "var(--mkt-text-muted)", marginBottom: 14, lineHeight: 1.5 };
const btn = (v: "primary" | "outline" | "danger" = "outline"): React.CSSProperties => ({
  padding: "7px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: "pointer",
  border: "1px solid var(--mkt-border)", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.12s",
  background: v === "primary" ? "var(--mkt-accent)" : v === "danger" ? "rgba(239,68,68,0.12)" : "transparent",
  color: v === "primary" ? "#0a0a0a" : v === "danger" ? "#ef4444" : "var(--mkt-text-muted)",
  ...(v === "danger" ? { borderColor: "rgba(239,68,68,0.3)" } : {}),
});

// ═══════════════════════════════════════════════════════════════════════════
// NEGOCIO — company profile (currency lives in CurrencySettings, embedded by caller)
// ═══════════════════════════════════════════════════════════════════════════
const INDUSTRIES = ["Tecnología", "Servicios profesionales", "Finanzas", "Consultoría", "E-commerce", "Manufactura", "Salud", "Educación", "Otro"];
const SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export function MktBusinessSettings() {
  const [form, setForm] = useState({ company_name: "", company_industry: "", company_type: "", company_size: "", timezone: "", language: "es" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings/business").then(r => r.json()).then((d: Record<string, string>) => {
      if (d && !d.error) setForm(f => ({ ...f, ...Object.fromEntries(Object.keys(f).map(k => [k, d[k] ?? (f as Record<string, string>)[k]])) }));
    }).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const r = await fetch("/api/settings/business", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await r.json();
      setMsg(d.error ? `Error: ${d.error}` : "✓ Guardado");
    } catch { setMsg("Error al guardar"); }
    finally { setSaving(false); setTimeout(() => setMsg(""), 4000); }
  };

  return (
    <div style={card}>
      <div style={sectionTitle}>Perfil del negocio</div>
      <p style={sectionHint}>Datos de la empresa usados en propuestas, portales y reportes.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div><span style={label}>Nombre de la empresa</span><input style={input} value={form.company_name} onChange={e => set("company_name", e.target.value)} /></div>
        <div><span style={label}>Industria</span>
          <select style={input} value={form.company_industry} onChange={e => set("company_industry", e.target.value)}>
            <option value="">—</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div><span style={label}>Tipo de negocio</span><input style={input} value={form.company_type} onChange={e => set("company_type", e.target.value)} placeholder="B2B, agencia, SaaS…" /></div>
        <div><span style={label}>Tamaño</span>
          <select style={input} value={form.company_size} onChange={e => set("company_size", e.target.value)}>
            <option value="">—</option>
            {SIZES.map(s => <option key={s} value={s}>{s} empleados</option>)}
          </select>
        </div>
        <div><span style={label}>Zona horaria</span><input style={input} value={form.timezone} onChange={e => set("timezone", e.target.value)} placeholder="America/Bogota" /></div>
        <div><span style={label}>Idioma</span>
          <select style={input} value={form.language} onChange={e => set("language", e.target.value)}>
            <option value="es">Español</option><option value="en">English</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button style={btn("primary")} onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar negocio"}</button>
        {msg && <span style={{ fontSize: 12, color: "var(--mkt-accent)" }}>{msg}</span>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// USUARIOS — list / invite / role / activate. Privilege-escalation guarded.
// ═══════════════════════════════════════════════════════════════════════════
interface UserRow { id: string; email: string; name: string | null; role: string; lastLogin: number | null; }
const ROLE_LABELS: Record<string, string> = { superadmin: "Superadmin", marketing: "Marketing", sales: "Sales" };

export function MktUsersSettings({ actorRole, currentUserId }: { actorRole: string; currentUserId: string }) {
  const [list, setList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState({ email: "", name: "", role: "sales" });
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState("");
  const isSuper = actorRole === "superadmin";
  // Marketing may assign sales/marketing only; superadmin may assign anything.
  const assignableRoles = isSuper ? ["superadmin", "marketing", "sales"] : ["marketing", "sales"];

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/settings/users").then(r => r.json()).then((d) => {
      setList(Array.isArray(d) ? d : []);
    }).catch(() => setList([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const baseRole = (r: string) => r.replace(/^inactive:/, "");
  const isActive = (r: string) => !r.startsWith("inactive:");
  const isTargetSuper = (r: string) => baseRole(r) === "superadmin";
  const canManage = (u: UserRow) => isSuper || (!isTargetSuper(u.role) && u.id !== currentUserId);

  const doInvite = async () => {
    if (!invite.email.trim()) return;
    setInviting(true); setMsg("");
    try {
      const r = await fetch("/api/settings/users/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invite) });
      const d = await r.json();
      if (d.error) setMsg(`Error: ${d.error}`);
      else { setMsg(`✓ ${d.email} invitado`); setInvite({ email: "", name: "", role: "sales" }); load(); }
    } catch { setMsg("Error al invitar"); }
    finally { setInviting(false); setTimeout(() => setMsg(""), 5000); }
  };

  const changeRole = async (id: string, role: string) => {
    const r = await fetch(`/api/settings/users/${id}/role`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    const d = await r.json();
    if (d.error) { setMsg(`Error: ${d.error}`); setTimeout(() => setMsg(""), 5000); } else load();
  };
  const toggleActive = async (id: string, active: boolean) => {
    const r = await fetch(`/api/settings/users/${id}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    const d = await r.json();
    if (d.error) { setMsg(`Error: ${d.error}`); setTimeout(() => setMsg(""), 5000); } else load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={card}>
        <div style={sectionTitle}>Invitar usuario</div>
        <p style={sectionHint}>El usuario podrá entrar con Google usando su correo @blackscale.consulting.{!isSuper && " Marketing no puede crear superadmins."}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.8fr auto", gap: 10, alignItems: "end" }}>
          <div><span style={label}>Email</span><input style={input} value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} placeholder="nombre@blackscale.consulting" /></div>
          <div><span style={label}>Nombre</span><input style={input} value={invite.name} onChange={e => setInvite({ ...invite, name: e.target.value })} /></div>
          <div><span style={label}>Rol</span>
            <select style={input} value={invite.role} onChange={e => setInvite({ ...invite, role: e.target.value })}>
              {assignableRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <button style={btn("primary")} onClick={doInvite} disabled={inviting}>{inviting ? "…" : "Invitar"}</button>
        </div>
        {msg && <p style={{ fontSize: 12, color: msg.startsWith("Error") ? "#ef4444" : "var(--mkt-accent)", marginTop: 10 }}>{msg}</p>}
      </div>

      <div style={card}>
        <div style={sectionTitle}>Usuarios ({list.length})</div>
        <div style={{ marginTop: 10, border: "1px solid var(--mkt-border)", borderRadius: 8, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--mkt-text-muted)" }}>Cargando…</div>
          ) : list.map(u => {
            const active = isActive(u.role);
            const manage = canManage(u);
            return (
              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid var(--mkt-border)", opacity: active ? 1 : 0.55 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--mkt-text)" }}>{u.name || u.email}{u.id === currentUserId && <span style={{ color: "var(--mkt-text-muted)", fontWeight: 400 }}> · tú</span>}</div>
                  <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{u.email}{!active && " · inactivo"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {manage ? (
                    <select style={{ ...input, width: "auto", padding: "4px 8px", fontSize: 12 }} value={baseRole(u.role)} onChange={e => changeRole(u.id, e.target.value)}>
                      {assignableRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  ) : (
                    <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "var(--mkt-text-muted)" }}>{ROLE_LABELS[baseRole(u.role)] ?? baseRole(u.role)}</span>
                  )}
                  {manage && (
                    <button style={btn(active ? "danger" : "outline")} onClick={() => toggleActive(u.id, !active)}>{active ? "Desactivar" : "Activar"}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE — stages CRUD (close reasons + deal aging embedded by caller)
// ═══════════════════════════════════════════════════════════════════════════
interface Stage { id: string; name: string; color: string; order: number; isWon: boolean; isLost: boolean; }

export function MktPipelineSettings() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#64748b");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#64748b");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch("/api/pipeline").then(r => r.json()).then((d: Stage[]) => {
      setStages(Array.isArray(d) ? [...d].sort((a, b) => a.order - b.order) : []);
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };
  const add = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/pipeline/stages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), color: newColor }) });
      const d = await r.json();
      if (d.error) flash(`Error: ${d.error}`); else { setNewName(""); setNewColor("#64748b"); load(); }
    } finally { setBusy(false); }
  };
  const saveEdit = async (id: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/pipeline/stages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, color: editColor }) });
      const d = await r.json();
      if (d.error) flash(`Error: ${d.error}`); else { setEditId(null); load(); }
    } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta etapa?")) return;
    const r = await fetch(`/api/pipeline/stages/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.error) flash(`Error: ${d.error}`); else load();
  };

  return (
    <div style={card}>
      <div style={sectionTitle}>Etapas del pipeline</div>
      <p style={sectionHint}>Configura las etapas de venta. No se puede eliminar una etapa con deals activos.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {stages.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--mkt-surface)", borderRadius: 8 }}>
            {editId === s.id ? (
              <>
                <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer" }} />
                <input style={{ ...input, flex: 1 }} value={editName} onChange={e => setEditName(e.target.value)} />
                <button style={btn("primary")} onClick={() => saveEdit(s.id)} disabled={busy}>Guardar</button>
                <button style={btn()} onClick={() => setEditId(null)}>Cancelar</button>
              </>
            ) : (
              <>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--mkt-text)" }}>{s.name}</span>
                {s.isWon && <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>WON</span>}
                {s.isLost && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>LOST</span>}
                <button style={btn()} onClick={() => { setEditId(s.id); setEditName(s.name); setEditColor(s.color); }}>Editar</button>
                <button style={btn("danger")} onClick={() => remove(s.id)}>✕</button>
              </>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 14, borderTop: "1px solid var(--mkt-border)" }}>
        <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer" }} />
        <input style={{ ...input, flex: 1 }} placeholder="Nueva etapa…" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <button style={btn("primary")} onClick={add} disabled={busy}>Agregar etapa</button>
      </div>
      {msg && <p style={{ fontSize: 12, color: msg.startsWith("Error") ? "#ef4444" : "var(--mkt-accent)", marginTop: 10 }}>{msg}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTALES — client portal manager
// ═══════════════════════════════════════════════════════════════════════════
interface Portal { id: string; token: string; title: string; clientCompany: string | null; contactName: string | null; contactCompany: string | null; createdAt: number; }
interface PickContact { id: string; name: string; company: string | null; }

export function MktPortalsSettings() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [contacts, setContacts] = useState<PickContact[]>([]);
  const [form, setForm] = useState({ contactId: "", title: "Portal del Cliente", clientCompany: "" });
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/portals").then(r => r.json()).then((d) => setPortals(Array.isArray(d) ? d : [])).catch(() => setPortals([]));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/contacts?limit=500").then(r => r.json()).then((d) => {
      const arr = Array.isArray(d) ? d : (Array.isArray(d?.contacts) ? d.contacts : []);
      setContacts(arr.map((c: { id: string; name: string; company?: string | null }) => ({ id: c.id, name: c.name, company: c.company ?? null })));
    }).catch(() => setContacts([]));
  }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };
  const create = async () => {
    if (!form.contactId) { flash("Selecciona un contacto"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/portals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.error) flash(`Error: ${d.error}`); else { setForm({ contactId: "", title: "Portal del Cliente", clientCompany: "" }); setSearch(""); load(); }
    } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este portal? El enlace dejará de funcionar.")) return;
    await fetch(`/api/portals/${id}`, { method: "DELETE" });
    load();
  };
  const copyLink = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard?.writeText(url).then(() => { setCopied(token); setTimeout(() => setCopied(null), 2000); }).catch(() => {});
  };

  const filtered = search ? contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.company || "").toLowerCase().includes(search.toLowerCase())).slice(0, 50) : contacts.slice(0, 50);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={card}>
        <div style={sectionTitle}>Crear portal de cliente</div>
        <p style={sectionHint}>Genera un enlace privado para que el cliente vea su progreso, sin acceso al CRM.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <span style={label}>Contacto</span>
            <input style={{ ...input, marginBottom: 6 }} placeholder="Buscar contacto…" value={search} onChange={e => setSearch(e.target.value)} />
            <select style={input} size={5} value={form.contactId} onChange={e => setForm({ ...form, contactId: e.target.value })}>
              {filtered.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>Título del portal</span>
            <input style={{ ...input, marginBottom: 12 }} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <span style={label}>Empresa cliente (opcional)</span>
            <input style={input} value={form.clientCompany} onChange={e => setForm({ ...form, clientCompany: e.target.value })} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={btn("primary")} onClick={create} disabled={busy}>{busy ? "Creando…" : "Crear portal"}</button>
          {msg && <span style={{ fontSize: 12, color: msg.startsWith("Error") ? "#ef4444" : "var(--mkt-accent)" }}>{msg}</span>}
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Portales activos ({portals.length})</div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {portals.length === 0 ? (
            <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: "var(--mkt-text-muted)" }}>Sin portales todavía</div>
          ) : portals.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--mkt-surface)", borderRadius: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--mkt-text)" }}>{p.title}</div>
                <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{p.contactName || "—"}{(p.clientCompany || p.contactCompany) ? ` · ${p.clientCompany || p.contactCompany}` : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button style={btn()} onClick={() => copyLink(p.token)}>{copied === p.token ? "✓ Copiado" : "Copiar enlace"}</button>
                <a style={{ ...btn(), textDecoration: "none" }} href={`/portal/${p.token}`} target="_blank" rel="noopener noreferrer">Abrir</a>
                <button style={btn("danger")} onClick={() => remove(p.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
