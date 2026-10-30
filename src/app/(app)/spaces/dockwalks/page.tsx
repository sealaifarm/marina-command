import type { Metadata } from "next";
import Link from "next/link";
import { LocalTime } from "@/components/dockwalks/local-time";
import { StartButton } from "@/components/dockwalks/start-button";
import { buttonVariants } from "@/components/ui/button";
import { getDockwalkList } from "@/lib/dockwalks";
import { getMarinaMap, getSelectedMarina } from "@/lib/supabase/session";
import { cn } from "@/lib/utils";
import { startDockwalk } from "./actions";

export const metadata: Metadata = { title: "Dockwalks · Marina Command" };

export default async function DockwalksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [marina, { error }] = await Promise.all([getSelectedMarina(), searchParams]);

  if (!marina) {
    return (
      <p className="max-w-2xl text-muted-foreground">
        No marinas yet. Once you have access to a marina, you can walk its docks here.
      </p>
    );
  }

  const [list, map] = await Promise.all([getDockwalkList(marina.id), getMarinaMap(marina.id)]);

  if (!list) {
    return (
      <p className="max-w-2xl text-muted-foreground">
        Dockwalks couldn&rsquo;t be loaded. Make sure the dockwalks database setup has been run, then
        refresh the page.
      </p>
    );
  }

  const slipCount = map?.slips.length ?? 0;

  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl font-semibold tracking-tight">Dockwalks</h2>
      <p className="mt-2 text-muted-foreground">
        Walk {marina.name}&rsquo;s docks, confirm which slips are occupied, and record meter readings.
      </p>

      {error === "start" && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          Couldn&rsquo;t start a dockwalk. Please try again.
        </p>
      )}

      <div className="mt-8 rounded-card border bg-card p-6 shadow-soft">
        {list.open ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Dockwalk in progress</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Started <LocalTime iso={list.open.started_at} /> · {list.open.slips_checked} of {slipCount}{" "}
                slips recorded
              </p>
            </div>
            <Link href={`/spaces/dockwalks/${list.open.id}`} className={buttonVariants({ size: "lg" })}>
              Continue
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Ready to walk the docks?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {slipCount > 0
                  ? `${slipCount} slips to check.`
                  : "Add docks and slips to this marina first."}
              </p>
            </div>
            <form action={startDockwalk}>
              <StartButton>Start dockwalk</StartButton>
            </form>
          </div>
        )}
      </div>

      <h3 className="mt-10 mb-3 text-lg font-semibold tracking-tight">Past dockwalks</h3>
      {list.finished.length === 0 ? (
        <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
          No finished dockwalks yet. Once you finish one, it will be listed here.
        </p>
      ) : (
        <ul className="space-y-3">
          {list.finished.map((walk) => (
            <li key={walk.id}>
              <Link
                href={`/spaces/dockwalks/${walk.id}`}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    <LocalTime iso={walk.started_at} />
                  </p>
                  {walk.walker_email && (
                    <p className="truncate text-sm text-muted-foreground">{walk.walker_email}</p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {walk.slips_checked} checked · {walk.occupied_found} occupied
                  {walk.mismatches > 0 && (
                    <span className={cn("ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800")}>
                      {walk.mismatches} {walk.mismatches === 1 ? "difference" : "differences"}
                    </span>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
