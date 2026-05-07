"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, CheckCircle2, ExternalLink, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/constants";

interface CalEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
}

export default function CalendarSettingsPage() {
  return (
    <Suspense fallback={null}>
      <CalendarSettingsInner />
    </Suspense>
  );
}

function CalendarSettingsInner() {
  const searchParams = useSearchParams();
  const connected = searchParams.get("connected") === "true";
  const authError = searchParams.get("error");

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setLoadingEvents(true);
    fetch("/api/google/calendar/events")
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? []);
        setIsConnected(!d.error);
      })
      .finally(() => setLoadingEvents(false));
  }, []);

  const handleConnect = () => {
    window.location.href = "/api/google/calendar/auth";
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calendar className="w-6 h-6" /> Google Calendar
        </h1>
        <p className="text-muted-foreground">
          Sincroniza tus reuniones y eventos con el CRM
        </p>
      </div>

      {connected && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Calendario conectado exitosamente.
        </div>
      )}
      {authError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Error al conectar: {authError}. Intenta de nuevo.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado de conexión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Calendario conectado</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Conecta tu Google Calendar para ver tus próximas reuniones directamente en el CRM.
              </p>
              <Button onClick={handleConnect}>
                <Calendar className="w-4 h-4 mr-2" />
                Conectar Google Calendar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximas reuniones</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay próximas reuniones en tu calendario.</p>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => {
                  const startRaw = ev.start?.dateTime ?? ev.start?.date;
                  const start = startRaw ? new Date(startRaw) : null;
                  return (
                    <div key={ev.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.summary ?? "(Sin título)"}</p>
                        {start && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {start.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}
                            {" · "}
                            {start.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                      {ev.htmlLink && (
                        <a href={ev.htmlLink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
