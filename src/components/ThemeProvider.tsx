"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { applyCrmTheme, type CrmThemePrefs } from "@/lib/apply-theme";
import { SALES_DEFAULT_PRESET, getBrandPreset } from "@/lib/brand-presets";

function defaults(): CrmThemePrefs {
  const p = getBrandPreset(SALES_DEFAULT_PRESET);
  return {
    theme: SALES_DEFAULT_PRESET,
    accentPrimary: p.accent,
    accentSecondary: p.accentSecondary,
    textColor: p.text,
    fontFamily: "inter",
    sidebarBg: p.sidebar,
    sidebarBgType: "solid",
    uiDensity: "comfortable",
    borderRadius: "rounded",
  };
}

function isMarketingRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/marketing") || pathname.startsWith("/icp-scorer");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (isMarketingRoute(pathname)) return;
    fetch("/api/settings/preferences")
      .then(r => r.ok ? r.json() : null)
      .then(prefs => {
        if (!prefs || prefs.error) {
          applyCrmTheme(defaults());
          return;
        }
        applyCrmTheme({ ...defaults(), ...prefs });
      })
      .catch(() => applyCrmTheme(defaults()));
  }, [status, pathname]);

  return <>{children}</>;
}
