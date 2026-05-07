"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserById } from "@/db/users";

export function PrivacyPolicyModal() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    // Check if policy has been acknowledged via API (client-side check)
    fetch("/api/policy-status")
      .then((r) => r.json())
      .then((d) => {
        if (!d.acknowledged) setOpen(true);
      })
      .catch(() => { /* silent */ });
  }, [status, session]);

  const handleAcknowledge = async () => {
    await fetch("/api/policy-acknowledge", { method: "POST" });
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl p-8 shadow-2xl"
        style={{ background: "#1e293b", border: "1px solid #334155" }}
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-full mb-4"
            style={{ background: "rgba(37,99,235,0.15)", border: "1px solid #2563eb" }}
          >
            <Shield className="w-7 h-7" style={{ color: "#2563eb" }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "#f8fafc" }}>
            Política de tratamiento de datos
          </h2>
        </div>

        <p className="text-sm leading-relaxed mb-6" style={{ color: "#94a3b8" }}>
          <strong style={{ color: "#cbd5e1" }}>BlackScale Consulting</strong> trata datos personales
          conforme a la{" "}
          <strong style={{ color: "#cbd5e1" }}>Ley 1581 de 2012</strong> de Protección de Datos
          Personales de Colombia y su Decreto Reglamentario 1377 de 2013.
          <br />
          <br />
          Los datos registrados en este sistema son utilizados exclusivamente para la gestión
          comercial y comunicación con clientes y prospectos de BlackScale Consulting. Tienes
          derecho a conocer, actualizar, rectificar y suprimir tu información personal.
          <br />
          <br />
          Consulta nuestra política completa en{" "}
          <a
            href="https://blackscale.consulting/politica-datos"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#60a5fa" }}
          >
            blackscale.consulting/politica-datos
          </a>
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleAcknowledge}
            className="flex-1"
            style={{ background: "#2563eb", color: "#fff" }}
          >
            Entendido
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.open("https://blackscale.consulting/politica-datos", "_blank")}
            style={{ borderColor: "#334155", color: "#94a3b8" }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Ver política completa
          </Button>
        </div>
      </div>
    </div>
  );
}
