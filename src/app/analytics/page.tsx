"use client";

import { useState, useEffect } from "react";
import { BarChart3, RefreshCw, Send, MousePointerClick, Eye, Mail, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BrevoCampaign {
  id: number;
  name: string;
  status: string;
  statistics?: {
    globalStats?: {
      sent?: number;
      delivered?: number;
      uniqueOpens?: number;
      uniqueClicks?: number;
      hardBounces?: number;
      softBounces?: number;
      unsubscriptions?: number;
    };
  };
}

interface GA4Data {
  sessions: number;
  pageviews: number;
  activeUsers: number;
  bounceRate: number;
  newUsers: number;
  topPages: { page: string; views: number }[];
  trafficSources: { source: string; sessions: number }[];
  daily: { date: string; sessions: number; pageviews: number }[];
  fetchedAt: string;
  error?: string;
  message?: string;
}

function safeN(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function pct(num: number, den: number): string {
  if (den === 0) return "—";
  return ((num / den) * 100).toFixed(1) + "%";
}

const GOLD = "#D19C15";

function Sparkbar({ values, color = GOLD }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 36 }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, background: color, opacity: i === values.length - 1 ? 1 : 0.4, borderRadius: 2, height: `${Math.max(4, (v / max) * 36)}px` }} />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<BrevoCampaign[]>([]);
  const [brevoLoading, setBrevoLoading] = useState(true);
  const [brevoError, setBrevoError] = useState("");
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const [ga4, setGa4] = useState<GA4Data | null>(null);
  const [ga4Loading, setGa4Loading] = useState(true);

  const loadBrevo = () => {
    setBrevoLoading(true);
    setBrevoError("");
    fetch("/api/brevo/campaigns")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setBrevoError(d.error); return; }
        setCampaigns(d.campaigns || []);
        setFetchedAt(new Date());
      })
      .catch(() => setBrevoError("Error de red al conectar con Brevo"))
      .finally(() => setBrevoLoading(false));
  };

  const loadGA4 = (bypass = false) => {
    setGa4Loading(true);
    fetch(`/api/ga4${bypass ? "?bypass=1" : ""}`)
      .then(r => r.json())
      .then(setGa4)
      .catch(() => setGa4({ error: "network", message: "Error de red", sessions: 0, pageviews: 0, activeUsers: 0, bounceRate: 0, newUsers: 0, topPages: [], trafficSources: [], daily: [], fetchedAt: "" }))
      .finally(() => setGa4Loading(false));
  };

  useEffect(() => {
    loadBrevo();
    loadGA4();
  }, []);

  const totals = campaigns.reduce(
    (acc, c) => {
      const gs = c.statistics?.globalStats ?? {};
      return {
        sent: acc.sent + safeN(gs.sent),
        delivered: acc.delivered + safeN(gs.delivered),
        opens: acc.opens + safeN(gs.uniqueOpens),
        clicks: acc.clicks + safeN(gs.uniqueClicks),
        bounces: acc.bounces + safeN(gs.hardBounces) + safeN(gs.softBounces),
        unsubs: acc.unsubs + safeN(gs.unsubscriptions),
      };
    },
    { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubs: 0 }
  );

  const kpis = [
    { label: "Campañas", value: campaigns.length, icon: Mail, color: "blue" },
    { label: "Total enviados", value: totals.sent.toLocaleString("es-CO"), icon: Send, color: "purple" },
    { label: "Open Rate", value: pct(totals.opens, totals.sent), icon: Eye, color: "green" },
    { label: "Click Rate", value: pct(totals.clicks, totals.sent), icon: MousePointerClick, color: "amber" },
  ];

  const ga4Connected = ga4 && !ga4.error;
  const ga4NotConnected = ga4?.error === "ga4_not_connected";

  // Build daily sparkline data (last 14 days)
  const dailyLast14 = (ga4?.daily ?? []).slice(-14);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Analytics
          </h1>
          <p className="text-muted-foreground text-sm">
            Brevo Email Marketing
            {fetchedAt && <span className="ml-2 text-xs opacity-60">· actualizado {fetchedAt.toLocaleTimeString("es-CO")}</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadBrevo(); loadGA4(true); }} disabled={brevoLoading || ga4Loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${(brevoLoading || ga4Loading) ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {brevoError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{brevoError}</div>
      )}

      {/* Brevo KPIs */}
      {brevoLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(k => (
            <Card key={k.label}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 bg-${k.color}-100`}>
                    <k.icon className={`w-4 h-4 text-${k.color}-600`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className="text-xl font-bold">{k.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* GA4 Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold flex items-center gap-2">
            <span style={{ fontSize: 16, color: "#ea4335" }}>G</span> Google Analytics 4
            {ga4Connected && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>CONECTADO</span>}
          </h2>
          {ga4Connected && (
            <p className="text-xs text-muted-foreground">Últimos 30 días · Property {process.env.NEXT_PUBLIC_GA4_PROPERTY_ID ?? "530528809"}</p>
          )}
        </div>

        {ga4Loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : ga4NotConnected ? (
          <Card>
            <CardContent className="pt-6 pb-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Conecta Google Analytics para ver sesiones, páginas vistas y fuentes de tráfico directamente en el CRM.
              </p>
              <button
                onClick={() => { window.location.href = "/api/auth/signin/google?callbackUrl=/analytics"; }}
                style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: GOLD, color: "#0a0a0a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Conectar GA4
              </button>
              <p className="text-xs text-muted-foreground mt-3">
                También puedes conectarlo desde Configuración → Integraciones
              </p>
            </CardContent>
          </Card>
        ) : ga4 && ga4Connected ? (
          <>
            {/* GA4 KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {[
                { label: "Sesiones (30d)", value: ga4.sessions.toLocaleString("es-CO"), sub: `${ga4.newUsers.toLocaleString()} nuevos usuarios` },
                { label: "Páginas vistas", value: ga4.pageviews.toLocaleString("es-CO"), sub: `${ga4.activeUsers.toLocaleString()} usuarios activos` },
                { label: "Bounce Rate", value: `${(ga4.bounceRate * 100).toFixed(1)}%`, sub: "tasa de rebote" },
                { label: "Páginas/sesión", value: ga4.sessions > 0 ? (ga4.pageviews / ga4.sessions).toFixed(1) : "—", sub: "promedio" },
              ].map(card => (
                <Card key={card.label}>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                    <p className="text-xl font-bold" style={{ color: GOLD }}>{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Daily sessions sparkline */}
            {dailyLast14.length > 0 && (
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Sesiones diarias — últimos 14 días
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 60 }}>
                    {dailyLast14.map((d, i) => {
                      const max = Math.max(...dailyLast14.map(x => x.sessions), 1);
                      const h = Math.max(4, (d.sessions / max) * 60);
                      const dateLabel = `${d.date.slice(6, 8)}/${d.date.slice(4, 6)}`;
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ width: "100%", background: GOLD, opacity: i === dailyLast14.length - 1 ? 1 : 0.5, borderRadius: 3, height: h }} />
                          {(i === 0 || i === dailyLast14.length - 1 || i === 6) && (
                            <span style={{ fontSize: 9, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{dateLabel}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Top pages */}
              {ga4.topPages.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top páginas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {ga4.topPages.slice(0, 8).map((p, i) => {
                        const max = ga4.topPages[0].views;
                        const pctW = Math.round((p.views / max) * 100);
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="truncate max-w-[70%] text-muted-foreground">{p.page}</span>
                              <span className="font-semibold">{p.views.toLocaleString()}</span>
                            </div>
                            <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                              <div className="h-full rounded-full" style={{ width: `${pctW}%`, background: GOLD }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Traffic sources */}
              {ga4.trafficSources.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Fuentes de tráfico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {ga4.trafficSources.map((s, i) => {
                        const total = ga4.trafficSources.reduce((sum, x) => sum + x.sessions, 0);
                        const pctW = total > 0 ? Math.round((s.sessions / total) * 100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground flex-1 truncate">{s.source}</span>
                            <span className="font-semibold w-8 text-right">{s.sessions}</span>
                            <div className="w-16 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                              <div className="h-full rounded-full" style={{ width: `${pctW}%`, background: "#3b82f6" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        ) : (
          <Card className="opacity-50">
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">No se pudo cargar GA4. Intenta reconectar desde Configuración → Integraciones.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Brevo campaign table */}
      {!brevoLoading && (
        <>
          {totals.sent > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Totales acumulados — todas las campañas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
                  {[
                    { label: "Enviados", v: totals.sent },
                    { label: "Entregados", v: totals.delivered },
                    { label: "Abiertos únicos", v: totals.opens },
                    { label: "Clicks únicos", v: totals.clicks },
                    { label: "Rebotes", v: totals.bounces },
                    { label: "Desuscritos", v: totals.unsubs },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="text-lg font-bold">{s.v.toLocaleString("es-CO")}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {campaigns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detalle por campaña</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        {["Nombre", "Estado", "Enviados", "Abiertos", "Clicks", "Open%", "Click%"].map(h => (
                          <th key={h} className="px-4 py-2 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => {
                        const gs = c.statistics?.globalStats ?? {};
                        const sent = safeN(gs.sent);
                        const opens = safeN(gs.uniqueOpens);
                        const clicks = safeN(gs.uniqueClicks);
                        return (
                          <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2 font-medium max-w-[220px] truncate">{c.name}</td>
                            <td className="px-4 py-2 text-muted-foreground capitalize">{c.status}</td>
                            <td className="px-4 py-2">{sent.toLocaleString("es-CO")}</td>
                            <td className="px-4 py-2">{opens.toLocaleString("es-CO")}</td>
                            <td className="px-4 py-2">{clicks.toLocaleString("es-CO")}</td>
                            <td className="px-4 py-2">{pct(opens, sent)}</td>
                            <td className="px-4 py-2">{pct(clicks, sent)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {campaigns.length === 0 && !brevoError && (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              No se encontraron campañas en Brevo.
            </div>
          )}
        </>
      )}
    </div>
  );
}
