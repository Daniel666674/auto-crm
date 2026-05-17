"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

const FONT_MAP: Record<string, string> = {
  inter: "'Inter', sans-serif",
  merriweather: "'Merriweather', serif",
  playfair: "'Playfair Display', serif",
  mono: "'JetBrains Mono', monospace",
};

const RADIUS_MAP: Record<string, string> = {
  sharp: "2px",
  rounded: "8px",
  pill: "999px",
};

const DENSITY_MAP: Record<string, string> = {
  compact: "compact",
  comfortable: "comfortable",
  spacious: "spacious",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/settings/preferences")
      .then(r => r.ok ? r.json() : null)
      .then(prefs => {
        if (!prefs) return;
        const root = document.documentElement;
        // Apply dark/light theme
        if (prefs.theme === "light") {
          root.classList.remove("dark");
          root.classList.add("light");
        } else {
          root.classList.remove("light");
          root.classList.add("dark");
        }
        root.style.setProperty("--accent-primary", prefs.accentPrimary ?? "#C39A4C");
        root.style.setProperty("--accent-secondary", prefs.accentSecondary ?? "#6D1F2E");
        root.style.setProperty("--text-primary", prefs.textColor ?? "#e2e8f0");
        root.style.setProperty("--font-family-custom", FONT_MAP[prefs.fontFamily] ?? FONT_MAP.inter);
        root.style.setProperty("--sidebar-bg-custom", prefs.sidebarBg ?? "#0a0a0a");
        root.style.setProperty("--border-radius-base", RADIUS_MAP[prefs.borderRadius] ?? "8px");
        const body = document.body;
        body.classList.remove("density-compact", "density-comfortable", "density-spacious");
        body.classList.add(`density-${DENSITY_MAP[prefs.uiDensity] ?? "comfortable"}`);
      })
      .catch(() => {});
  }, [status, session?.user?.id]);

  return <>{children}</>;
}
