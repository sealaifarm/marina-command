"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

// Label that appears to the right of its child. Used for the collapsed rail.
// Rendered in a portal so the sidebar's overflow never clips it.
export function Tooltip({
  label,
  enabled,
  children,
}: {
  label: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function show() {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: rect.right + 20, y: rect.top + rect.height / 2 });
  }

  return (
    <div
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
      onFocus={show}
      onBlur={() => setPos(null)}
    >
      {children}
      {enabled &&
        pos &&
        createPortal(
          <div
            role="tooltip"
            style={{ left: pos.x, top: pos.y }}
            className="pointer-events-none fixed z-50 max-w-64 animate-tooltip-in truncate rounded-xl bg-foreground px-3 py-2 text-xs font-medium text-background shadow-soft"
          >
            {label}
          </div>,
          document.body
        )}
    </div>
  );
}
