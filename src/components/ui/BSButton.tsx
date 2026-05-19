"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import { BSSpinner } from "./BSSpinner";

interface Props {
  onClick: () => void | Promise<void>;
  children: ReactNode;
  loadingLabel?: string;
  style?: CSSProperties;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}
export function BSButton({ onClick, children, loadingLabel, style, className, disabled, type = "button" }: Props) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try { await onClick(); } finally { setLoading(false); }
  };
  return (
    <button type={type} onClick={handleClick} disabled={loading || disabled}
      className={`${className || ""} ${loading ? "bs-btn-loading" : ""}`}
      style={style}>
      {loading ? <><BSSpinner size="sm" /> {loadingLabel || children}</> : children}
    </button>
  );
}
