"use client";

import { useState, useEffect } from "react";
import { BarChart3, RefreshCw, Send, MousePointerClick, Eye, Mail } from "lucide-react";
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

function safeN(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function pct(num: number, den: number): string {
  if (den === 0) return "—";
  return ((num / den) * 100).toFixed(1) + "%";
}

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<BrevoCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const load = () => {
    setLoading(true);
    setError("");
    fetch("/api/brevo/campaigns")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setCampaigns(d.campaigns || []);
        setFetchedAt(new Date());
      })
      .catch(() => setError("Error de red al conectar con Brevo"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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

  const disabledChannels = [
    { label: "Google Analytics 4", note: "Configura GA4_PROPERTY_ID y GA4_CREDENTIALS para habilitar" },
    { label: "Meta Ads", note: "API no conectada" },
    { label: "LinkedIn Ads", note: "API no conectada" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Analytics
          </h1>
          <p className="text-muted-foreground text-sm">
            Brevo Email Marketing
            {fetchedAt && (
              <span className="ml-2 text-xs opacity-60">
                · actualizado {fetchedAt.toLocaleTimeString("es-CO")}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI cards */}
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

          {/* Aggregate totals */}
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

          {/* Per-campaign table */}
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

          {campaigns.length === 0 && !error && (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              No se encontraron campañas en Brevo. Verifica que{" "}
              <code className="bg-muted px-1 rounded">BREVO_API_KEY</code> esté configurada.
            </div>
          )}

          {/* Disabled channels */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {disabledChannels.map(ch => (
              <Card key={ch.label} className="opacity-40">
                <CardContent className="pt-5">
                  <p className="text-sm font-semibold">{ch.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{ch.note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
