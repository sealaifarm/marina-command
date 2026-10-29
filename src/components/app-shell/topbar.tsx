"use client";

import { usePathname } from "next/navigation";
import { MenuIcon } from "@/components/icons";
import { getPageTitle } from "./nav";

export function Topbar({
  mobileOpen,
  onOpenMobile,
}: {
  mobileOpen: boolean;
  onOpenMobile: () => void;
}) {
  const title = getPageTitle(usePathname());

  return (
    <header className="sticky top-0 z-20 border-b bg-background">
      <div className="mx-auto flex h-20 max-w-6xl items-center gap-3 px-4 sm:px-6 md:px-10">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
          className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 lg:hidden"
        >
          <MenuIcon width={22} height={22} />
        </button>
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
      </div>
    </header>
  );
}
