"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, Mail, Users, List, Send, Webhook, AtSign, Search, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { BSLoading } from "../ui/BSLoading";

const GOLD = "#C39A4C";

interface HubData {
  account: {
    email: string;
    companyName: string;
    plan?: any[];
    marketingAutomation?: any;
    relay?: any;
  } | null;
  campaigns: {
    total: number;
    byStatus: Record<string, number>;
    totals: { sent: number; delivered: number; opens: number; clicks: number; hardBounces: number; softBounces: number; unsubs: number; complaints: number };
    items: Array<{
      id: number; name: string; subject?: string; status: string; type?: string;
      sender?: { email: string; name: string };
      sentDate?: string; scheduledAt?: string; createdAt?: string;
      recipients?: any;
      statistics?: { sent?: number; delivered?: number; uniqueViews?: number; uniqueClicks?: number; hardBounces?: number; softBounces?: number; unsubscriptions?: number; complaints?: number } | null;
    }>;
  };
  lists: {
    total: number;
    totalSubscribers: number;
    totalBlacklisted: number;
    items: Array<{ id: number; name: string; totalSubscribers: number; uniqueSubscribers: number; totalBlacklisted: number; folderId?: number; createdAt?: string }>;
  };
  contacts: {
    total: number | null;
    attributes: Array<{ name: string; category: string; type: string }>;
  };
  senders: Array<{ id: number; name: string; email: string; active: boolean; ips?: any[] }>;
  webhooks: Array<{ id: number; url: string; events: string[]; type: string; createdAt?: string }>;
  transactional: null | {
    range?: string;
    requests: number; delivered: number;
    hardBounces: number; softBounces: number;
    clicks: number; uniqueClicks: number;
    opens: number; uniqueOpens: number;
    spamReports: number; blocked: number; invalid: number; unsubscribed: number;
  };
  fetchedAt: string;
  error?: string;
}

type Tab = "overview" | "campaigns" | "lists" | "transactional" | "config";

function n(v: any): number { const x = Number(v); return isNaN(x) ? 0 : x; }
function pct(num: number, den: number): string { if (den === 0) return "—"; return ((num / den) * 100).toFixed(1) + "%"; }
function fmtDate(iso?: string): string { if (!iso) return "—"; return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" }); }

const Stat = ({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) => (
  <div style={{ background: "var(--mkt-card, #111111)", border: "1px solid var(--mkt-border, #1e1e1e)", borderRadius: 10, padding: "14px 16px" }}>
    <div style={{ fontSize: 11, color: "var(--mkt-text-muted, #718096)", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color: accent ?? "var(--mkt-text, #e2e8f0)" }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: "var(--mkt-text-muted, #718096)", marginTop: 3 }}>{sub}</div>}
  </div>
);

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
  border: `1px solid ${active ? GOLD : "var(--mkt-border, #1e1e1e)"}`,
  background: active ? "rgba(195,154,76,0.12)" : "transparent",
  color: active ? GOLD : "var(--mkt-text-muted, #718096)",
  display: "inline-flex", alignItems: "center", gap: 6,
});

export function MktBrevoHub() {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = () => {
    setLoading(true); setErr("");
    fetch("/api/brevo/hub")
      .then(r => r.json())
      .then(d => { if (d.error) setErr(d.error); else setData(d); })
      .catch(() => setErr("Error de red al consultar Brevo"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const totals = data?.campaigns.totals ?? { sent: 0, delivered: 0, opens: 0, clicks: 0, hardBounces: 0, softBounces: 0, unsubs: 0, complaints: 0 };

  const filteredCampaigns = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.campaigns.items.filter(c => !q || c.name.toLowerCase().includes(q) || (c.subject || "").toLowerCase().includes(q));
  }, [data, search]);

  if (loading) {
    return <BSLoading label="Cargando Brevo Hub…" />;
  }
  if (err) {
    return (
      <div style={{ padding: "16px 20px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
        {err}
        <button onClick={load} style={{ marginLeft: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", cursor: "pointer" }}>Reintentar</button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--mkt-text)", margin: 0 }}>Brevo Data Hub</h2>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(72,187,120,0.12)", color: "#48bb78" }}>CONECTADO</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>
            {data.account?.companyName || data.account?.email || "Cuenta Brevo"} · actualizado {new Date(data.fetchedAt).toLocaleTimeString("es-CO")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", fontSize: 12, cursor: "pointer" }}>
            <RefreshCw size={12} /> Actualizar
          </button>
          <button onClick={() => window.open("https://app.brevo.com", "_blank")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", fontSize: 12, cursor: "pointer" }}>
            <ExternalLink size={12} /> Abrir Brevo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--mkt-border)", paddingBottom: 12, flexWrap: "wrap" }}>
        <button style={tabBtn(tab === "overview")} onClick={() => setTab("overview")}><Mail size={12} /> Overview</button>
        <button style={tabBtn(tab === "campaigns")} onClick={() => setTab("campaigns")}><Send size={12} /> Campañas ({data.campaigns.total})</button>
        <button style={tabBtn(tab === "lists")} onClick={() => setTab("lists")}><List size={12} /> Listas ({data.lists.total})</button>
        <button style={tabBtn(tab === "transactional")} onClick={() => setTab("transactional")}><AtSign size={12} /> Transactional</button>
        <button style={tabBtn(tab === "config")} onClick={() => setTab("config")}><Webhook size={12} /> Config / Webhooks</button>
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            <Stat label="Contactos totales" value={data.contacts.total?.toLocaleString("es-CO") ?? "—"} accent={GOLD} />
            <Stat label="Subscriptores en listas" value={data.lists.totalSubscribers.toLocaleString("es-CO")} sub={`${data.lists.total} listas`} />
            <Stat label="Blacklisted" value={data.lists.totalBlacklisted.toLocaleString("es-CO")} accent="#f87171" />
            <Stat label="Campañas totales" value={data.campaigns.total} sub={Object.entries(data.campaigns.byStatus).map(([s, n]) => `${s}: ${n}`).join(" · ")} />
            <Stat label="Enviados totales" value={totals.sent.toLocaleString("es-CO")} />
            <Stat label="Open rate global" value={pct(totals.opens, totals.sent)} accent={totals.sent > 0 ? "#22c55e" : undefined} />
            <Stat label="Click rate global" value={pct(totals.clicks, totals.sent)} />
            <Stat label="Bajas / unsubs" value={totals.unsubs.toLocaleString("es-CO")} sub={pct(totals.unsubs, totals.sent)} />
          </div>

          {data.account && (
            <div style={{ background: "var(--mkt-card)", border: "1px solid var(--mkt-border)", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--mkt-text)" }}>Cuenta</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 12 }}>
                <div><span style={{ color: "var(--mkt-text-muted)" }}>Email: </span><span style={{ fontWeight: 600 }}>{data.account.email}</span></div>
                <div><span style={{ color: "var(--mkt-text-muted)" }}>Empresa: </span><span style={{ fontWeight: 600 }}>{data.account.companyName || "—"}</span></div>
                {data.account.plan?.[0] && (
                  <div>
                    <span style={{ color: "var(--mkt-text-muted)" }}>Plan: </span>
                    <span style={{ fontWeight: 600 }}>{data.account.plan[0].type || "—"}</span>
                    {data.account.plan[0].credits != null && <span style={{ color: "var(--mkt-text-muted)", marginLeft: 6 }}>· {Number(data.account.plan[0].credits).toLocaleString("es-CO")} créditos</span>}
                  </div>
                )}
                <div><span style={{ color: "var(--mkt-text-muted)" }}>Senders: </span><span style={{ fontWeight: 600 }}>{data.senders.length}</span></div>
                <div><span style={{ color: "var(--mkt-text-muted)" }}>Webhooks: </span><span style={{ fontWeight: 600 }}>{data.webhooks.length}</span></div>
                <div><span style={{ color: "var(--mkt-text-muted)" }}>Atributos: </span><span style={{ fontWeight: 600 }}>{data.contacts.attributes.length}</span></div>
              </div>
            </div>
          )}

          {/* Top lists */}
          <div style={{ background: "var(--mkt-card)", border: "1px solid var(--mkt-border)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--mkt-text)" }}>Top listas por subscriptores</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...data.lists.items].sort((a, b) => (b.uniqueSubscribers || 0) - (a.uniqueSubscribers || 0)).slice(0, 6).map(l => {
                const max = Math.max(...data.lists.items.map(x => x.uniqueSubscribers || 0), 1);
                const w = Math.round(((l.uniqueSubscribers || 0) / max) * 100);
                return (
                  <div key={l.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: "var(--mkt-text)" }}>{l.name}</span>
                      <span style={{ color: "var(--mkt-text-muted)" }}>{(l.uniqueSubscribers || 0).toLocaleString("es-CO")} · ID {l.id}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                      <div style={{ height: "100%", borderRadius: 2, width: `${w}%`, background: GOLD }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* CAMPAIGNS */}
      {tab === "campaigns" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            <Stat label="Enviados" value={totals.sent.toLocaleString("es-CO")} />
            <Stat label="Entregados" value={totals.delivered.toLocaleString("es-CO")} sub={pct(totals.delivered, totals.sent)} />
            <Stat label="Abiertos" value={totals.opens.toLocaleString("es-CO")} sub={pct(totals.opens, totals.sent)} accent="#22c55e" />
            <Stat label="Clicks" value={totals.clicks.toLocaleString("es-CO")} sub={pct(totals.clicks, totals.sent)} />
            <Stat label="Hard bounces" value={totals.hardBounces.toLocaleString("es-CO")} sub={pct(totals.hardBounces, totals.sent)} accent={totals.hardBounces > 0 ? "#f87171" : undefined} />
            <Stat label="Soft bounces" value={totals.softBounces.toLocaleString("es-CO")} sub={pct(totals.softBounces, totals.sent)} />
            <Stat label="Bajas" value={totals.unsubs.toLocaleString("es-CO")} sub={pct(totals.unsubs, totals.sent)} />
            <Stat label="Spam reports" value={totals.complaints.toLocaleString("es-CO")} accent={totals.complaints > 0 ? "#f87171" : undefined} />
          </div>

          <div style={{ position: "relative", maxWidth: 320 }}>
            <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--mkt-text-muted)" }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar campaña…"
              style={{ width: "100%", paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 8, border: "1px solid var(--mkt-border)", background: "var(--mkt-card)", color: "var(--mkt-text)", fontSize: 12, outline: "none" }}
            />
          </div>

          <div style={{ background: "var(--mkt-card)", border: "1px solid var(--mkt-border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--mkt-border)", background: "rgba(255,255,255,0.02)" }}>
                    {["Campaña", "Asunto", "Estado", "Fecha", "Enviados", "Open%", "Click%", "Bajas", ""].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--mkt-text-muted)", fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map(c => {
                    const s = c.statistics ?? {};
                    const sent = n(s.sent); const opens = n(s.uniqueViews); const clicks = n(s.uniqueClicks);
                    const exp = expanded === c.id;
                    const openRate = sent > 0 ? (opens / sent) * 100 : 0;
                    return (
                      <React.Fragment key={c.id}>
                        <tr onClick={() => setExpanded(exp ? null : c.id)} style={{ borderBottom: "1px solid var(--mkt-border)", cursor: "pointer" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</td>
                          <td style={{ padding: "10px 12px", color: "var(--mkt-text-muted)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject || "—"}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: c.status === "sent" ? "rgba(72,187,120,0.12)" : "rgba(195,154,76,0.12)", color: c.status === "sent" ? "#48bb78" : GOLD, textTransform: "capitalize" }}>{c.status}</span>
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--mkt-text-muted)", whiteSpace: "nowrap" }}>{fmtDate(c.sentDate || c.scheduledAt || c.createdAt)}</td>
                          <td style={{ padding: "10px 12px" }}>{sent.toLocaleString("es-CO")}</td>
                          <td style={{ padding: "10px 12px", color: openRate >= 30 ? "#22c55e" : openRate >= 20 ? GOLD : "var(--mkt-text-muted)", fontWeight: 600 }}>{pct(opens, sent)}</td>
                          <td style={{ padding: "10px 12px" }}>{pct(clicks, sent)}</td>
                          <td style={{ padding: "10px 12px", color: "var(--mkt-text-muted)" }}>{n(s.unsubscriptions)}</td>
                          <td style={{ padding: "10px 12px", color: "var(--mkt-text-muted)" }}>{exp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</td>
                        </tr>
                        {exp && (
                          <tr style={{ background: "rgba(195,154,76,0.03)", borderBottom: "1px solid var(--mkt-border)" }}>
                            <td colSpan={9} style={{ padding: "14px 18px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, fontSize: 11 }}>
                                <div><span style={{ color: "var(--mkt-text-muted)" }}>ID Brevo: </span><span style={{ fontWeight: 600 }}>{c.id}</span></div>
                                <div><span style={{ color: "var(--mkt-text-muted)" }}>Sender: </span><span style={{ fontWeight: 600 }}>{c.sender?.name || "—"}</span></div>
                                <div><span style={{ color: "var(--mkt-text-muted)" }}>Email: </span><span style={{ fontWeight: 600 }}>{c.sender?.email || "—"}</span></div>
                                <div><span style={{ color: "var(--mkt-text-muted)" }}>Tipo: </span><span style={{ fontWeight: 600 }}>{c.type || "—"}</span></div>
                                <div><span style={{ color: "var(--mkt-text-muted)" }}>Entregados: </span><span style={{ fontWeight: 600 }}>{n(s.delivered).toLocaleString("es-CO")} · {pct(n(s.delivered), sent)}</span></div>
                                <div><span style={{ color: "var(--mkt-text-muted)" }}>Hard bounces: </span><span style={{ fontWeight: 600 }}>{n(s.hardBounces)}</span></div>
                                <div><span style={{ color: "var(--mkt-text-muted)" }}>Soft bounces: </span><span style={{ fontWeight: 600 }}>{n(s.softBounces)}</span></div>
                                <div><span style={{ color: "var(--mkt-text-muted)" }}>Spam: </span><span style={{ fontWeight: 600, color: n(s.complaints) > 0 ? "#f87171" : undefined }}>{n(s.complaints)}</span></div>
                                <div><span style={{ color: "var(--mkt-text-muted)" }}>Click/Open: </span><span style={{ fontWeight: 600 }}>{opens > 0 ? ((clicks / opens) * 100).toFixed(1) + "%" : "—"}</span></div>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); window.open(`https://app.brevo.com/camp/show/${c.id}`, "_blank"); }} style={{ marginTop: 10, padding: "5px 12px", borderRadius: 6, border: "1px solid var(--mkt-border)", background: "transparent", color: GOLD, fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                                <ExternalLink size={11} /> Abrir en Brevo
                              </button>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* LISTS */}
      {tab === "lists" && (
        <div style={{ background: "var(--mkt-card)", border: "1px solid var(--mkt-border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--mkt-border)", background: "rgba(255,255,255,0.02)" }}>
                {["Lista", "ID", "Subscriptores únicos", "Total subscriptores", "Blacklisted", "Health"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--mkt-text-muted)", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.lists.items.map(l => {
                const tot = (l.uniqueSubscribers || 0) + (l.totalBlacklisted || 0);
                const health = tot === 0 ? 100 : Math.round(((l.uniqueSubscribers || 0) / tot) * 100);
                const healthColor = health >= 80 ? "#48bb78" : health >= 60 ? GOLD : "#f87171";
                return (
                  <tr key={l.id} style={{ borderBottom: "1px solid var(--mkt-border)" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{l.name}</td>
                    <td style={{ padding: "10px 14px", color: "var(--mkt-text-muted)" }}>{l.id}</td>
                    <td style={{ padding: "10px 14px", color: GOLD, fontWeight: 600 }}>{(l.uniqueSubscribers || 0).toLocaleString("es-CO")}</td>
                    <td style={{ padding: "10px 14px" }}>{(l.totalSubscribers || 0).toLocaleString("es-CO")}</td>
                    <td style={{ padding: "10px 14px", color: (l.totalBlacklisted || 0) > 0 ? "#f87171" : "var(--mkt-text-muted)" }}>{l.totalBlacklisted || 0}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                          <div style={{ height: "100%", borderRadius: 2, width: `${health}%`, background: healthColor }} />
                        </div>
                        <span style={{ color: healthColor, fontWeight: 600, fontSize: 11 }}>{health}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TRANSACTIONAL */}
      {tab === "transactional" && (
        <>
          {data.transactional ? (
            <>
              <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>Últimos 30 días · API transaccional (SMTP)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                <Stat label="Solicitudes" value={data.transactional.requests.toLocaleString("es-CO")} accent={GOLD} />
                <Stat label="Entregados" value={data.transactional.delivered.toLocaleString("es-CO")} sub={pct(data.transactional.delivered, data.transactional.requests)} />
                <Stat label="Hard bounces" value={data.transactional.hardBounces.toLocaleString("es-CO")} accent={data.transactional.hardBounces > 0 ? "#f87171" : undefined} />
                <Stat label="Soft bounces" value={data.transactional.softBounces.toLocaleString("es-CO")} />
                <Stat label="Aperturas únicas" value={data.transactional.uniqueOpens.toLocaleString("es-CO")} sub={pct(data.transactional.uniqueOpens, data.transactional.delivered)} accent="#22c55e" />
                <Stat label="Clicks únicos" value={data.transactional.uniqueClicks.toLocaleString("es-CO")} sub={pct(data.transactional.uniqueClicks, data.transactional.delivered)} />
                <Stat label="Spam reports" value={data.transactional.spamReports.toLocaleString("es-CO")} accent={data.transactional.spamReports > 0 ? "#f87171" : undefined} />
                <Stat label="Bloqueados" value={data.transactional.blocked.toLocaleString("es-CO")} />
                <Stat label="Inválidos" value={data.transactional.invalid.toLocaleString("es-CO")} />
                <Stat label="Unsubscribed" value={data.transactional.unsubscribed.toLocaleString("es-CO")} />
              </div>
            </>
          ) : (
            <div style={{ padding: 32, textAlign: "center", color: "var(--mkt-text-muted)", background: "var(--mkt-card)", borderRadius: 10, border: "1px solid var(--mkt-border)" }}>
              No hay estadísticas transactional disponibles en este momento.
            </div>
          )}
        </>
      )}

      {/* CONFIG */}
      {tab === "config" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Senders */}
          <div style={{ background: "var(--mkt-card)", border: "1px solid var(--mkt-border)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--mkt-text)" }}>Senders ({data.senders.length})</div>
            {data.senders.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>Sin senders configurados.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.senders.map(s => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--mkt-border)" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{s.email}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: s.active ? "rgba(72,187,120,0.12)" : "rgba(239,68,68,0.1)", color: s.active ? "#48bb78" : "#f87171" }}>
                      {s.active ? "ACTIVO" : "INACTIVO"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Webhooks */}
          <div style={{ background: "var(--mkt-card)", border: "1px solid var(--mkt-border)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--mkt-text)" }}>Webhooks ({data.webhooks.length})</div>
            {data.webhooks.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>No hay webhooks configurados.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.webhooks.map(w => (
                  <div key={w.id} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--mkt-border)" }}>
                    <div style={{ fontSize: 11, fontFamily: "monospace", marginBottom: 4, color: "var(--mkt-text)" }}>{w.url}</div>
                    <div style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>Eventos: {(w.events || []).join(", ")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact attributes */}
          <div style={{ background: "var(--mkt-card)", border: "1px solid var(--mkt-border)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--mkt-text)" }}>Atributos de contacto ({data.contacts.attributes.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {data.contacts.attributes.map((a, i) => (
                <span key={i} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(195,154,76,0.08)", border: "1px solid rgba(195,154,76,0.2)", color: GOLD }}>
                  {a.name} <span style={{ color: "var(--mkt-text-muted)" }}>· {a.type}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
