import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DockwalkForm, DiscardButton, type FormRow } from "@/components/dockwalks/dockwalk-form";
import { DockwalkReport } from "@/components/dockwalks/dockwalk-report";
import { LocalTime } from "@/components/dockwalks/local-time";
import { ChevronLeftIcon } from "@/components/icons";
import { getDockwalk, getPreviousReadings, getWalkEntries } from "@/lib/dockwalks";
import { getMarinaMap, getMarinas } from "@/lib/supabase/session";

export const metadata: Metadata = { title: "Dockwalk · Marina Command" };

export default async function DockwalkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const walk = await getDockwalk(id);

  // The walk's own marina, even if a different one is picked in the sidebar.
  const [marinas, map, entries, previous] = await Promise.all([
    getMarinas(),
    getMarinaMap(walk.marina_id),
    getWalkEntries(walk.id),
    getPreviousReadings(walk.marina_id, walk.started_at),
  ]);
  if (!map) notFound();

  const marinaName = marinas.find((marina) => marina.id === walk.marina_id)?.name ?? "";
  const finished = walk.completed_at !== null;

  // Slips grouped under their dock.
  const docks = map.docks
    .map((dock) => ({
      id: dock.id,
      name: dock.name,
      slips: map.slips.filter((slip) => slip.dock_id === dock.id),
    }))
    .filter((dock) => dock.slips.length > 0);

  return (
    <div>
      <Link
        href="/spaces/dockwalks"
        className="-ml-1 inline-flex items-center gap-1 rounded-lg py-1 pr-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeftIcon width={16} height={16} />
        All dockwalks
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Dockwalk</h2>
          <p className="mt-2 text-muted-foreground">
            {marinaName && `${marinaName} · `}
            <LocalTime iso={walk.started_at} />
            {walk.walker_email && ` · ${walk.walker_email}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border bg-card px-3 py-1 text-sm font-medium">
            {finished ? "Finished" : "In progress"}
          </span>
          {!finished && <DiscardButton walkId={walk.id} />}
        </div>
      </div>

      <div className="mt-8">
        {finished ? (
          <DockwalkReport
            docks={docks.map((d) => ({
              ...d,
              slips: d.slips.map((s) => ({ id: s.id, name: s.name, status: s.status })),
            }))}
            entries={entries}
            previous={previous}
          />
        ) : (
          <DockwalkForm
            walkId={walk.id}
            docks={docks.map((d) => ({
              id: d.id,
              name: d.name,
              slips: d.slips.map((s) => ({
                id: s.id,
                name: s.name,
                length: s.length,
                width: s.width,
                status: s.status,
                boatName: s.boat?.name ?? null,
              })),
            }))}
            initial={Object.fromEntries(
              [...entries.values()].map((e): [string, FormRow] => [
                e.slip_id,
                {
                  occupied: e.occupied,
                  electric: e.electric_kwh === null ? "" : String(e.electric_kwh),
                  water: e.water_gal === null ? "" : String(e.water_gal),
                },
              ])
            )}
            previous={Object.fromEntries(previous)}
          />
        )}
      </div>
    </div>
  );
}
