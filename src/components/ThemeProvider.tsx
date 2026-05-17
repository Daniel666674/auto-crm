"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { applyCrmTheme, type CrmThemePrefs } from "@/lib/apply-theme";

const DEFAULTS: CrmThemePrefs = {
  theme: "dark", accentPrimary: "#C39A4C", accentSecondary: "#6D1F2E",
  textColor: "#e2e8f0", fontFamily: "inter", sidebarBg: "#0a0a0a",
  sidebarBgType: "solid", uiDensity: "comfortable", borderRadius: "rounded",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/settings/preferences")
      .then(r => r.ok ? r.json() : null)
      .then(prefs => {
        if (!prefs || prefs.error) return;
        applyCrmTheme({ ...DEFAULTS, ...prefs });
      })
      .catch(() => {});
  }, [status, session?.user?.id]);

  return <>{children}</>;
}
