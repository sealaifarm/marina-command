"use client";

import { useEffect, useState } from "react";
import { SIDEBAR_COOKIE, savePreference } from "@/lib/preferences";
import type { Marina } from "./marina-switcher";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  email,
  marinas,
  selectedMarinaId,
  initialCollapsed,
  children,
}: {
  email: string;
  marinas: Marina[];
  selectedMarinaId: string | null;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    savePreference(SIDEBAR_COOKIE, next ? "1" : "0");
  }

  // Mobile drawer: close with Escape, and keep the page from scrolling behind it.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div
      data-collapsed={collapsed}
      style={{ "--sidebar-w": collapsed ? "4.5rem" : "18rem" } as React.CSSProperties}
      className="min-h-dvh"
    >
      <Sidebar
        email={email}
        marinas={marinas}
        selectedMarinaId={selectedMarinaId}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={toggleCollapsed}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Dim backdrop behind the mobile drawer */}
      <div
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-30 bg-foreground/30 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div className="transition-[padding] duration-300 ease-out motion-reduce:transition-none lg:pl-(--sidebar-w)">
        <Topbar mobileOpen={mobileOpen} onOpenMobile={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-12">{children}</main>
      </div>
    </div>
  );
}
