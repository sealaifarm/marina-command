import type { Metadata } from "next";
import { MarinaMap } from "@/components/marina-map/marina-map";
import { getMarinaMap, getSelectedMarina } from "@/lib/supabase/session";

export const metadata: Metadata = { title: "Marina Map · Marina Command" };

export default async function MarinaMapPage() {
  const marina = await getSelectedMarina();

  if (!marina) {
    return (
      <p className="max-w-2xl text-muted-foreground">
        No marinas yet. Once you have access to a marina, its map shows up here.
      </p>
    );
  }

  const map = await getMarinaMap(marina.id);

  if (!map) {
    return (
      <p className="max-w-2xl text-muted-foreground">
        The map couldn&rsquo;t be loaded. Try refreshing the page.
      </p>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-semibold tracking-tight">{marina.name}</h2>
      <p className="mt-2 mb-6 text-muted-foreground">
        {map.slips.length} {map.slips.length === 1 ? "slip" : "slips"} on {map.docks.length}{" "}
        {map.docks.length === 1 ? "dock" : "docks"}. Hover a slip for its details.
      </p>
      <MarinaMap marinaName={marina.name} {...map} />
    </div>
  );
}
