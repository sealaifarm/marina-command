"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronsUpDownIcon, MapPinIcon } from "@/components/icons";
import { MARINA_COOKIE, savePreference } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import { Tooltip } from "./tooltip";

export type Marina = { id: string; name: string };

type Position = { left: number; top: number; width?: number };

export function MarinaSwitcher({
  marinas,
  selectedId,
  rail,
}: {
  marinas: Marina[];
  selectedId: string | null;
  rail: boolean;
}) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const open = position !== null;

  const selected = marinas.find((m) => m.id === selectedId);
  const label = selected?.name ?? "No marinas yet";

  function toggle() {
    if (open) return setPosition(null);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Collapsed: open beside the rail. Expanded: open below the button.
    setPosition(
      rail
        ? { left: rect.right + 20, top: rect.top }
        : { left: rect.left, top: rect.bottom + 8, width: rect.width }
    );
  }

  function choose(id: string) {
    setPosition(null);
    if (id === selectedId) return;
    savePreference(MARINA_COOKIE, id);
    router.refresh();
  }

  // Close on outside click, Escape, resize, or when the sidebar changes shape.
  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>("[aria-selected=true], button")?.focus();
  }, [open]);

  return (
    <>
      <Tooltip label={label} enabled={rail && !open}>
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          disabled={marinas.length === 0}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Marina: ${label}`}
          className="flex h-12 w-full items-center gap-3 rounded-2xl border bg-background px-3 text-left text-sm font-semibold whitespace-nowrap transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 disabled:opacity-60"
        >
          <span className="flex size-6 shrink-0 items-center justify-center text-primary">
            <MapPinIcon width={22} height={22} strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1 truncate transition-opacity duration-200 rail:opacity-0">
            {label}
          </span>
          <ChevronsUpDownIcon
            width={16}
            height={16}
            className="shrink-0 text-muted-foreground transition-opacity duration-200 rail:opacity-0"
          />
        </button>
      </Tooltip>

      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Select marina"
            style={{ left: position.left, top: position.top, width: position.width }}
            className="fixed z-50 min-w-56 rounded-2xl border bg-card p-2 shadow-soft"
          >
            {marinas.map((marina) => {
              const isSelected = marina.id === selectedId;
              return (
                <button
                  key={marina.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => choose(marina.id)}
                  className={cn(
                    "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                    isSelected && "font-semibold"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{marina.name}</span>
                  {isSelected && (
                    <CheckIcon width={16} height={16} className="shrink-0 text-primary" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
