"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Briefcase, Kanban, Webhook, Bell, Copy, User, Key, LogOut,
  RefreshCw, CheckCircle, AlertCircle, Database,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationToggle } from "@/components/shared/NotificationToggle";
import { useSession, signOut } from "next-auth/react";
import type { CrmConfig } from "@/types";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [config, setConfig] = useState<CrmConfig | null>(null);
  const [stages, setStages] = useState<
    Array<{ id: string; name: string; color: string; order: number }>
  >([]);

  // API keys state
  const [brevoKey, setBrevoKey] = useState("");
  const [savingBrevo, setSavingBrevo] = useState(false);
  const [brevoStatus, setBrevoStatus] = useState<"idle" | "ok" | "error">("idle");

  // Apollo API key state
  const [apolloKey, setApolloKey] = useState("");
  const [savingApollo, setSavingApollo] = useState(false);
  const [apolloStatus, setApolloStatus] = useState<"idle" | "ok" | "error">("idle");

  // Brevo sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<null | { synced: number; total: number }>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<null | Record<string, unknown>>(null);

  const userName = session?.user?.name || "Usuario";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;
  const userRole = (session?.user as { role?: string })?.role || "sales";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    fetch("/app/crm-config.json").then(r => r.json()).then(setConfig).catch(() => {});
    fetch("/app/api/pipeline").then(r => r.json()).then(setStages).catch(() => {});
  }, []);

  const handleSaveApollo = async () => {
    if (!apolloKey.trim()) return;
    setSavingApollo(true);
    try {
      const res = await fetch("https://api.apollo.io/v1/auth/health", {
        method: "GET",
        headers: { "X-Api-Key": apolloKey, "Content-Type": "application/json" },
      });
      if (res.ok) {
        setApolloStatus("ok");
        toast.success("Apollo API key válida. Actualiza APOLLO_API_KEY en el .env de tu servidor.");
      } else {
        setApolloStatus("error");
        toast.error("Apollo API key inválida.");
      }
    } catch {
      setApolloStatus("error");
      toast.error("No se pudo verificar la key de Apollo.");
    } finally {
      setSavingApollo(false);
    }
  };

  const handleSaveBrevo = async () => {
    if (!brevoKey.trim()) return;
    setSavingBrevo(true);
    // Store in settings API (or just show instructions since env var is needed)
    try {
      // Test the key
      const res = await fetch("https://api.brevo.com/v3/account", {
        headers: { "api-key": brevoKey },
      });
      if (res.ok) {
        setBrevoStatus("ok");
        toast.success("Brevo API key válida. Actualiza BREVO_API_KEY en el .env de tu servidor.");
      } else {
        setBrevoStatus("error");
        toast.error("Brevo API key inválida.");
      }
    } catch {
      setBrevoStatus("error");
      toast.error("No se pudo verificar la key.");
    } finally {
      setSavingBrevo(false);
    }
  };

  const handleSyncBrevo = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/app/api/brevo/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setSyncResult({ synced: data.synced, total: data.total });
      toast.success(`${data.synced} contactos sincronizados desde Brevo`);
    } catch {
      toast.error("Error al sincronizar con Brevo");
    } finally {
      setSyncing(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setRecalcResult(null);
    try {
      const res = await fetch("/app/api/brevo/recalculate-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushToBrevo: true }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setRecalcResult(data);
      toast.success(`Scores recalculados: ${data.processed} contactos`);
    } catch {
      toast.error("Error al recalcular scores");
    } finally {
      setRecalculating(false);
    }
  };

  const roleBadge = userRole === "superadmin" ? "Admin" : userRole === "marketing" ? "Marketing" : "Sales";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Perfil, integraciones y configuración del CRM</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userImage} alt={userName} className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-lg">
                  {userInitials}
                </div>
              )}
              <div>
                <div className="font-semibold text-base">{userName}</div>
                <div className="text-sm text-muted-foreground">{userEmail}</div>
                <Badge variant="outline" className="text-xs mt-1">{roleBadge}</Badge>
              </div>
            </div>
            <Separator />
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => signOut({ callbackUrl: "/app/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>

        {/* Business config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Negocio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {config ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="capitalize">{config.business.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Industria</span>
                  <span className="capitalize">{config.business.industry}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Equipo</span>
                  <span>{config.business.teamSize}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Idioma</span>
                  <span>{config.preferences.language === "es" ? "Español" : "Inglés"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tema</span>
                  <span className="capitalize">{config.preferences.theme}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ejecuta <code className="bg-muted px-1 rounded">/setup</code> en Claude Code para configurar.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Brevo Integration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" />
              Integración Brevo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verifica tu API key de Brevo y sincroniza los 796 contactos. El score ICP se calcula automáticamente.
            </p>

            <div className="flex gap-2">
              <input
                type="password"
                placeholder="xkeysib-..."
                value={brevoKey}
                onChange={e => setBrevoKey(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-md border bg-muted/50 outline-none focus:ring-1 ring-primary"
              />
              <Button size="sm" onClick={handleSaveBrevo} disabled={savingBrevo || !brevoKey.trim()}>
                {savingBrevo ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Verificar"}
              </Button>
              {brevoStatus === "ok" && <CheckCircle className="w-5 h-5 text-green-500 self-center" />}
              {brevoStatus === "error" && <AlertCircle className="w-5 h-5 text-red-500 self-center" />}
            </div>

            <p className="text-xs text-muted-foreground">
              Para activar la key en producción, actualiza <code className="bg-muted px-1 rounded">BREVO_API_KEY</code> en el archivo <code className="bg-muted px-1 rounded">.env.local</code> del servidor y reinicia PM2.
            </p>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Sincronizar contactos</h4>
                <p className="text-xs text-muted-foreground">
                  Importa todos los contactos de Brevo al módulo de Marketing con sus atributos SCORE, TIER e INDUSTRY.
                </p>
                <Button size="sm" variant="outline" onClick={handleSyncBrevo} disabled={syncing} className="w-full">
                  {syncing ? <><RefreshCw className="w-3 h-3 mr-2 animate-spin" />Sincronizando…</> : "Sincronizar desde Brevo"}
                </Button>
                {syncResult && (
                  <p className="text-xs text-green-600">✓ {syncResult.synced} de {syncResult.total} contactos sincronizados</p>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Recalcular ICP Scores</h4>
                <p className="text-xs text-muted-foreground">
                  Aplica el algoritmo completo (rol, industria, tamaño empresa, engagement) a todos los contactos y actualiza TIER en Brevo.
                </p>
                <Button size="sm" variant="outline" onClick={handleRecalculate} disabled={recalculating} className="w-full">
                  {recalculating ? <><RefreshCw className="w-3 h-3 mr-2 animate-spin" />Calculando…</> : "Recalcular Scores ICP"}
                </Button>
                {recalcResult && (
                  <p className="text-xs text-green-600">
                    ✓ {String(recalcResult.processed)} procesados —
                    T1: {String((recalcResult.tierBreakdown as Record<string, unknown>)?.tier1 || 0)},
                    T2: {String((recalcResult.tierBreakdown as Record<string, unknown>)?.tier2 || 0)},
                    T3: {String((recalcResult.tierBreakdown as Record<string, unknown>)?.tier3 || 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Apollo Integration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Integración Apollo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Apollo es la fuente primaria de scoring. Configura tu API key para habilitar la sincronización de contactos y el enriquecimiento de datos.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Apollo API key…"
                value={apolloKey}
                onChange={e => setApolloKey(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-md border bg-muted/50 outline-none focus:ring-1 ring-primary"
              />
              <Button size="sm" onClick={handleSaveApollo} disabled={savingApollo || !apolloKey.trim()}>
                {savingApollo ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Verificar"}
              </Button>
              {apolloStatus === "ok" && <CheckCircle className="w-5 h-5 text-green-500 self-center" />}
              {apolloStatus === "error" && <AlertCircle className="w-5 h-5 text-red-500 self-center" />}
            </div>
            <p className="text-xs text-muted-foreground">
              Para activar en producción, actualiza <code className="bg-muted px-1 rounded">APOLLO_API_KEY</code> en <code className="bg-muted px-1 rounded">.env.local</code> y reinicia PM2.
            </p>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-1">Apollo CSV Sync</h4>
              <p className="text-xs text-muted-foreground mb-2">
                El botón de sincronización Apollo CSV está disponible en la barra lateral izquierda del CRM. Sube el archivo <code className="bg-muted px-1 rounded">apollo-contacts-export.csv</code> para importar contactos al pipeline de Brevo.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Stages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Kanban className="h-4 w-4" />
              Etapas del Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stages.map((stage) => (
                <div key={stage.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm flex-1">{stage.name}</span>
                  <Badge variant="outline" className="text-xs">#{stage.order}</Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Usa <code className="bg-muted px-1 rounded">/customize</code> en Claude Code para modificar las etapas.
            </p>
          </CardContent>
        </Card>

        {/* Webhook config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhook de leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Recibe leads automáticamente desde Typeform, Tally, formularios web, etc.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted p-2 rounded font-mono truncate">
                POST {typeof window !== "undefined" ? window.location.origin : "https://crm.blackscale.consulting"}/app/api/webhook
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/app/api/webhook`);
                  toast.success("URL copiada");
                }}
                className="p-2 rounded hover:bg-muted cursor-pointer"
                title="Copiar URL"
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NotificationToggle />
            <p className="text-xs text-muted-foreground">
              Las notificaciones te avisan cuando tienes seguimientos vencidos. Se verifican cada 5 minutos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
