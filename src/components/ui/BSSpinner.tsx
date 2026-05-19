"use client";
import React, { useId } from "react";

const SIZES = {
  sm: { ring: 36, bSize: 12, r: 14, sw: 2.5 },
  md: { ring: 52, bSize: 18, r: 21, sw: 3 },
  lg: { ring: 72, bSize: 26, r: 29, sw: 3.5 },
};

export function BSSpinner({ size = "md", label }: { size?: "sm" | "md" | "lg"; label?: string }) {
  const s = SIZES[size];
  const cx = s.ring / 2, cy = s.ring / 2;
  const circ = +(2 * Math.PI * s.r).toFixed(2);
  const short = +(circ * 0.22).toFixed(2);
  const rawId = useId();
  const arcId = `bs-arc-${rawId.replace(/[:]/g, "")}`;

  return (
    <div className="bs-spinner">
      <svg width={s.ring} height={s.ring} viewBox={`0 0 ${s.ring} ${s.ring}`} style={{ overflow: "visible" }}>
        <style>{`#${arcId} { --bs-full: ${circ}; --bs-short: ${short}; stroke-dasharray: ${circ}; }`}</style>
        <circle className="bs-track" cx={cx} cy={cy} r={s.r} strokeWidth={s.sw} />
        <circle id={arcId} className="bs-arc-path" cx={cx} cy={cy} r={s.r} strokeWidth={s.sw} />
        <text className="bs-b" x={cx} y={cy} fontSize={s.bSize} style={{ letterSpacing: "-0.02em" }}>B</text>
      </svg>
      {label && <span className="bs-spinner-label">{label}</span>}
    </div>
  );
}
