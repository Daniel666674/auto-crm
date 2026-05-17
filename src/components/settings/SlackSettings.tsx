"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, RefreshCw, Save, Send, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const S = {
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6, display: "block" },
  input: { width: "100%", padding: "8px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--foreground)", outline: "none", boxSizing: "border-box" as const },
  btn: (variant: "primary" | "outline" | "ghost" | "danger" = "outline"): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.12s",
    ...(variant === "primary" ? { background: "var(--primary)", color: "var(--primary-foreground)", border: "none" } : {}),
    ...(variant === "ghost" ? { background: "transparent", color: "var(--muted-foreground)", border: "none" } : {}),
    ...(variant === "danger" ? { background: "rgba(239,68,68,0.12)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" } : {}),
    ...(variant === "outline" ? { background: "transparent", color: "var(--foreground)" } : {}),
  }),
};

interface SlackConfig {
  webhookUrl: string;
  notifyDealWon: boolean;
  notifyDealLost: boolean;
  notifyLeadHot: boolean;
  notifyDealAged: boolean;
  notifyCampaignLaunched: boolean;
  notifyMktHandoff: boolean;
}

const EMPTY_CONFIG: SlackConfig = {
  webhookUrl: "",
  notifyDealWon: true,
  notifyDealLost: false,
  notifyLeadHot: true,
  notifyDealAged: false,
  notifyCampaignLaunched: true,
  notifyMktHandoff: true,
};

interface NotifyToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

function NotifyToggle({ label, description, checked, onChange, disabled }: NotifyToggleProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{description}</div>
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        aria-checked={checked}
        role="switch"
        style={{
          flexShrink: 0,
          width: 40,
          height: 22,
          borderRadius: 11,
          border: "none",
          padding: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          background: checked ? "#C39A4C" : "var(--muted)",
          position: "relative",
          transition: "background 0.2s",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{
          position: "absolute",
          top: 3,
          left: checked ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

interface Props {
  role: string;
}

const INSTRUCTIONS = [
  {
    step: "1",
    title: "Crear la app de Slack",
    body: 'Ir a api.slack.com/apps → "Create New App" → "From scratch". Dale un nombre como "BLACKSCALE NEXUS CRM" y selecciona tu workspace.',
  },
  {
    step: "2",
    title: "Agregar al workspace",
    body: 'En el panel de tu app, ve a "Incoming Webhooks" y activa la opcion. Luego haz clic en "Add New Webhook to Workspace" y selecciona el canal donde quieres recibir notificaciones.',
  },
  {
    step: "3",
    title: "Copiar la Webhook URL",
    body: 'Una vez creado el webhook, copia la URL que empieza con "https://hooks.slack.com/services/..." y pegala en el campo de arriba.',
  },
];

export function SlackSettings({ role }: Props) {
  const isSuperadmin = role === "superadmin";
  const [config, setConfig] = useState<SlackConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/slack");
      if (!res.ok) throw new Error();
      const data: SlackConfig = await res.json();
      setConfig(data);
    } catch {
      // Silently fall back to empty config — may not be configured yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/slack", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      toast.success("Configuracion de Slack guardada");
    } catch {
      toast.error("Error al guardar la configuracion");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.webhookUrl) {
      toast.error("Ingresa una Webhook URL antes de probar");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/settings/slack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: config.webhookUrl }),
      });
      if (!res.ok) throw new Error();
      toast.success("Mensaje de prueba enviado a Slack");
    } catch {
      toast.error("Error al enviar mensaje de prueba — verifica la URL del webhook");
    } finally {
      setTesting(false);
    }
  };

  const isConnected = Boolean(config.webhookUrl);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Notificaciones de Slack</h3>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Recibe alertas en tiempo real en tu canal de Slack
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Connection status badge */}
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
            display: "inline-flex", alignItems: "center", gap: 5,
            ...(isConnected
              ? { background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }
              : { background: "var(--muted)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }
            ),
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: isConnected ? "#22c55e" : "var(--muted-foreground)",
            }} />
            {isConnected ? "Conectado" : "No configurado"}
          </span>
          <button onClick={fetchConfig} style={S.btn("ghost")} disabled={loading}>
            <RefreshCw size={14} style={{ ...(loading ? { animation: "spin 1s linear infinite" } : {}) }} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ ...S.card, textAlign: "center", padding: 48, color: "var(--muted-foreground)" }}>
          <RefreshCw size={22} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <>
          {/* Webhook URL */}
          <div style={S.card}>
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 16px" }}>Configuracion del webhook</h4>
            <div>
              <span style={S.label}>Webhook URL</span>
              <div style={{ position: "relative" }}>
                <input
                  type={showUrl ? "text" : "password"}
                  value={config.webhookUrl}
                  onChange={e => setConfig(c => ({ ...c, webhookUrl: e.target.value }))}
                  placeholder="https://hooks.slack.com/services/..."
                  disabled={!isSuperadmin}
                  style={{
                    ...S.input,
                    paddingRight: 42,
                    fontFamily: config.webhookUrl && !showUrl ? "monospace" : undefined,
                    opacity: isSuperadmin ? 1 : 0.7,
                    cursor: isSuperadmin ? "text" : "not-allowed",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowUrl(v => !v)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    color: "var(--muted-foreground)",
                  }}
                  title={showUrl ? "Ocultar URL" : "Mostrar URL"}
                >
                  {showUrl ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {!isSuperadmin && (
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "6px 0 0" }}>
                  Solo superadmin puede modificar la webhook URL
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {isSuperadmin && (
                <button onClick={handleSave} disabled={saving} style={S.btn("primary")}>
                  {saving
                    ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
                    : <Save size={13} />
                  }
                  Guardar
                </button>
              )}
              <button
                onClick={handleTest}
                disabled={testing || !config.webhookUrl}
                style={{
                  ...S.btn("outline"),
                  opacity: !config.webhookUrl ? 0.5 : 1,
                }}
              >
                {testing
                  ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
                  : <Send size={13} />
                }
                Enviar mensaje de prueba
              </button>
            </div>
          </div>

          {/* Notification toggles */}
          <div style={S.card}>
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Eventos de notificacion</h4>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 4px" }}>
              Selecciona que eventos generan una notificacion en Slack
            </p>

            <div style={{ marginTop: 8 }}>
              <NotifyToggle
                label="Deal ganado"
                description="Notifica cuando un deal cierra como ganado"
                checked={config.notifyDealWon}
                onChange={v => setConfig(c => ({ ...c, notifyDealWon: v }))}
                disabled={!isSuperadmin}
              />
              <NotifyToggle
                label="Deal perdido"
                description="Notifica cuando un deal se marca como perdido"
                checked={config.notifyDealLost}
                onChange={v => setConfig(c => ({ ...c, notifyDealLost: v }))}
                disabled={!isSuperadmin}
              />
              <NotifyToggle
                label="Lead caliente"
                description="Notifica cuando el score de un lead supera el umbral configurado"
                checked={config.notifyLeadHot}
                onChange={v => setConfig(c => ({ ...c, notifyLeadHot: v }))}
                disabled={!isSuperadmin}
              />
              <NotifyToggle
                label="Deal estancado"
                description="Notifica cuando un deal no tiene movimiento por N dias"
                checked={config.notifyDealAged}
                onChange={v => setConfig(c => ({ ...c, notifyDealAged: v }))}
                disabled={!isSuperadmin}
              />
              <NotifyToggle
                label="Campaña lanzada"
                description="Notifica cuando se lanza una campaña de marketing (status activa)"
                checked={config.notifyCampaignLaunched}
                onChange={v => setConfig(c => ({ ...c, notifyCampaignLaunched: v }))}
                disabled={!isSuperadmin}
              />
              <NotifyToggle
                label="Handoff a ventas"
                description="Notifica cuando marketing entrega un contacto a ventas"
                checked={config.notifyMktHandoff}
                onChange={v => setConfig(c => ({ ...c, notifyMktHandoff: v }))}
                disabled={!isSuperadmin}
              />
            </div>

            {isSuperadmin && (
              <div style={{ marginTop: 16 }}>
                <button onClick={handleSave} disabled={saving} style={S.btn("primary")}>
                  {saving
                    ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
                    : <Save size={13} />
                  }
                  Guardar preferencias
                </button>
              </div>
            )}
          </div>

          {/* Setup instructions */}
          <div style={S.card}>
            <button
              type="button"
              onClick={() => setShowInstructions(v => !v)}
              style={{
                width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                Como configurar la integracion con Slack
              </span>
              {showInstructions
                ? <ChevronUp size={16} style={{ color: "var(--muted-foreground)" }} />
                : <ChevronDown size={16} style={{ color: "var(--muted-foreground)" }} />
              }
            </button>

            {showInstructions && (
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                {INSTRUCTIONS.map(({ step, title, body }) => (
                  <div key={step} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span style={{
                      flexShrink: 0,
                      width: 26, height: 26,
                      borderRadius: "50%",
                      background: "rgba(195,154,76,0.15)",
                      color: "#C39A4C",
                      fontWeight: 700,
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(195,154,76,0.3)",
                    }}>
                      {step}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>
                        {title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                        {body}
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginTop: 4,
                  padding: "10px 14px", borderRadius: 8,
                  background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
                }}>
                  <CheckCircle size={14} style={{ color: "#22c55e", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    Una vez configurado, usa el boton "Enviar mensaje de prueba" para verificar que la integracion funciona correctamente.
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
