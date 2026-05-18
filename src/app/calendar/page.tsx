import { SalesCalendar } from "@/components/calendar/SalesCalendar";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
        <p className="text-muted-foreground">Actividades programadas, follow-ups y reuniones</p>
      </div>
      <SalesCalendar />
    </div>
  );
}
