"use client";

import React from "react";
import { BSSpinner } from "./BSSpinner";

/**
 * Standard full-area loading state for the whole CRM.
 * Use this for any "loading screen" (page/section/panel) so spinners look
 * identical everywhere. For inline button spinners keep using an icon.
 */
export function BSLoading({
  label = "Cargando…",
  size = "md",
  minHeight = 160,
  padding = 32,
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
  minHeight?: number;
  padding?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight,
        padding,
        width: "100%",
      }}
    >
      <BSSpinner size={size} label={label} />
    </div>
  );
}
