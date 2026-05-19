"use client";
import { BSSpinner } from "./BSSpinner";

export function BSCardLoader({ loading, label, children, minHeight = 180 }: { loading: boolean; label?: string; children: React.ReactNode; minHeight?: number }) {
  if (!loading) return <>{children}</>;
  return (
    <div style={{ position: "relative", minHeight, display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="bs-skeleton" style={{ height: 14, borderRadius: 6, width: "60%" }} />
      <div className="bs-skeleton" style={{ height: 10, borderRadius: 6, width: "80%", marginTop: 4 }} />
      <div className="bs-skeleton" style={{ height: 10, borderRadius: 6, width: "45%", marginTop: 4 }} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 16 }}>
        <BSSpinner size="md" label={label || "Cargando datos…"} />
      </div>
    </div>
  );
}
