"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { signOut } from "@/app/(app)/actions";
import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  LayoutGridIcon,
  LogOutIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { MarinaSwitcher, type Marina } from "./marina-switcher";
import { Tooltip } from "./tooltip";

const itemBase =
  "group/item flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium whitespace-nowrap text-foreground/80 transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25";
const itemActive = "bg-primary/10 font-semibold text-foreground hover:bg-primary/10";

const iconProps = { width: 22, height: 22, strokeWidth: 1.75 } as const;

// True on desktop widths (matches Tailwind's lg breakpoint).
function useIsDesktop() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(min-width: 64rem)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia("(min-width: 64rem)").matches,
    () => false
  );
}

function ItemIcon({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center transition-colors duration-200",
        active ? "text-primary" : "text-muted-foreground group-hover/item:text-foreground"
      )}
    >
      {children}
    </span>
  );
}

function ItemLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="min-w-0 flex-1 truncate text-left transition-opacity duration-200 rail:opacity-0">
      {children}
    </span>
  );
}

type SidebarProps = {
  email: string;
  marinas: Marina[];
  selectedMarinaId: string | null;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
};

export function Sidebar({
  email,
  marinas,
  selectedMarinaId,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const rail = collapsed && isDesktop;

  const inSpaces = pathname.startsWith("/spaces");
  const [spacesOpen, setSpacesOpen] = useState(inSpaces);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      id="app-sidebar"
      aria-label="Main"
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 border-r bg-card transition-[width,transform,visibility] duration-300 ease-out motion-reduce:transition-none lg:w-(--sidebar-w)",
        mobileOpen ? "max-lg:translate-x-0" : "max-lg:invisible max-lg:-translate-x-full"
      )}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* Logo */}
        <div className="flex h-20 shrink-0 items-center justify-between px-4">
          <Link
            href="/"
            onClick={onCloseMobile}
            aria-label="Marina Command home"
            className="flex h-10 w-full min-w-0 max-w-44 overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 rail:w-10"
          >
            {/* In the rail only the left part of the logo shows, so a mark or a wide logo both work. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Marina Command"
              className="h-10 w-auto max-w-none object-contain object-left"
            />
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 lg:hidden"
          >
            <XIcon width={20} height={20} />
          </button>
        </div>

        {/* Marina selector */}
        <div className="shrink-0 px-3">
          <MarinaSwitcher marinas={marinas} selectedId={selectedMarinaId} rail={rail} />
        </div>

        {/* Navigation */}
        <nav aria-label="Management" className="mt-8 flex-1 px-3">
          <p className="mb-3 px-3 text-xs font-medium text-muted-foreground transition-opacity duration-200 rail:opacity-0">
            Management
          </p>

          <ul className="space-y-1">
            <li>
              {rail ? (
                <Tooltip label="Spaces" enabled>
                  <Link
                    href="/spaces/marina-map"
                    aria-current={inSpaces ? "page" : undefined}
                    className={cn(itemBase, inSpaces && itemActive)}
                  >
                    <ItemIcon active={inSpaces}>
                      <LayoutGridIcon {...iconProps} />
                    </ItemIcon>
                    <ItemLabel>Spaces</ItemLabel>
                  </Link>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  onClick={() => setSpacesOpen((value) => !value)}
                  aria-expanded={spacesOpen}
                  aria-controls="spaces-submenu"
                  className={cn(itemBase, inSpaces && "font-semibold text-foreground")}
                >
                  <ItemIcon active={inSpaces}>
                    <LayoutGridIcon {...iconProps} />
                  </ItemIcon>
                  <ItemLabel>Spaces</ItemLabel>
                  <ChevronDownIcon
                    width={16}
                    height={16}
                    className={cn(
                      "shrink-0 text-muted-foreground transition-[transform,opacity] duration-300 rail:opacity-0",
                      spacesOpen && "rotate-180"
                    )}
                  />
                </button>
              )}

              <div
                id="spaces-submenu"
                inert={!spacesOpen || rail}
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none rail:grid-rows-[0fr]",
                  spacesOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <div className="pt-1">
                    <Link
                      href="/spaces/marina-map"
                      onClick={onCloseMobile}
                      aria-current={isActive("/spaces/marina-map") ? "page" : undefined}
                      className={cn(
                        itemBase,
                        "h-10 pl-12",
                        isActive("/spaces/marina-map") && itemActive
                      )}
                    >
                      Marina Map
                    </Link>
                  </div>
                </div>
              </div>
            </li>

            <li>
              <Tooltip label="Leads" enabled={rail}>
                <Link
                  href="/leads"
                  onClick={onCloseMobile}
                  aria-current={isActive("/leads") ? "page" : undefined}
                  className={cn(itemBase, isActive("/leads") && itemActive)}
                >
                  <ItemIcon active={isActive("/leads")}>
                    <UsersIcon {...iconProps} />
                  </ItemIcon>
                  <ItemLabel>Leads</ItemLabel>
                </Link>
              </Tooltip>
            </li>

            <li>
              <Tooltip label="Storage" enabled={rail}>
                <Link
                  href="/storage"
                  onClick={onCloseMobile}
                  aria-current={isActive("/storage") ? "page" : undefined}
                  className={cn(itemBase, isActive("/storage") && itemActive)}
                >
                  <ItemIcon active={isActive("/storage")}>
                    <ArchiveIcon {...iconProps} />
                  </ItemIcon>
                  <ItemLabel>Storage</ItemLabel>
                </Link>
              </Tooltip>
            </li>
          </ul>
        </nav>

        {/* Signed-in user */}
        <div className="shrink-0 space-y-1 border-t px-3 py-4">
          <Tooltip label={email} enabled={rail}>
            <div className="flex h-11 w-full items-center gap-3 px-3 text-sm text-muted-foreground">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
              >
                {email.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate transition-opacity duration-200 rail:opacity-0">
                <span className="sr-only">Signed in as </span>
                {email}
              </span>
            </div>
          </Tooltip>

          <Tooltip label="Sign out" enabled={rail}>
            <form action={signOut}>
              <button type="submit" className={itemBase}>
                <ItemIcon>
                  <LogOutIcon {...iconProps} />
                </ItemIcon>
                <ItemLabel>Sign out</ItemLabel>
              </button>
            </form>
          </Tooltip>
        </div>
      </div>

      {/* Desktop collapse toggle, sitting on the sidebar's edge */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        aria-controls="app-sidebar"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute top-7 -right-3 hidden size-6 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 lg:flex"
      >
        <ChevronLeftIcon
          width={14}
          height={14}
          className={cn("transition-transform duration-300 motion-reduce:transition-none", collapsed && "rotate-180")}
        />
      </button>
    </aside>
  );
}
