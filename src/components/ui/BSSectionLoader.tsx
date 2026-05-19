"use client";
import { useEffect, useState } from "react";
import { BSSpinner } from "./BSSpinner";

export function BSSectionLoader({ loading, label, children }: { loading: boolean; label?: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(loading);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (!loading && visible) {
      setFading(true);
      const t = setTimeout(() => { setVisible(false); setFading(false); }, 320);
      return () => clearTimeout(t);
    }
    if (loading) setVisible(true);
  }, [loading, visible]);
  return (
    <div style={{ position: "relative" }}>
      {children}
      {visible && (
        <div className={`bs-section-overlay${fading ? " fade-out" : ""}`}>
          <div className="bs-section-grid" />
          <div className="bs-section-glow" />
          <BSSpinner size="lg" label={label || "Cargando sección…"} />
        </div>
      )}
    </div>
  );
}
