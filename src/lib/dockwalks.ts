import { notFound } from "next/navigation";
import { getClient } from "@/lib/supabase/session";

// Server-side data for the Dockwalks pages. Row level security limits every
// query to marinas this user belongs to.

export type Dockwalk = {
  id: string;
  marina_id: string;
  started_at: string;
  completed_at: string | null;
  walker_email: string | null;
};

export type DockwalkSummary = Dockwalk & {
  slips_checked: number;
  occupied_found: number;
  mismatches: number;
};

export type WalkEntry = {
  slip_id: string;
  occupied: boolean | null;
  electric_kwh: number | null;
  water_gal: number | null;
  system_status: string | null;
};

export type Reading = { electric_kwh: number | null; water_gal: number | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toNumber = (value: unknown) =>
  value === null || value === undefined ? null : Number(value);

// One dockwalk by id. Shows the 404 page if it doesn't exist or isn't visible.
export async function getDockwalk(id: string): Promise<Dockwalk> {
  if (!UUID.test(id)) notFound();
  const supabase = await getClient();
  const { data } = await supabase
    .from("dockwalks")
    .select("id, marina_id, started_at, completed_at, walker_email")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  return data as Dockwalk;
}

// The dockwalk in progress for a marina, if any, and the latest finished ones.
export async function getDockwalkList(marinaId: string) {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("dockwalk_summaries")
    .select("id, marina_id, started_at, completed_at, walker_email, slips_checked, occupied_found, mismatches")
    .eq("marina_id", marinaId)
    .order("started_at", { ascending: false })
    .limit(30);
  if (error) return null;

  const walks: DockwalkSummary[] = (data ?? []).map((w) => ({
    id: String(w.id),
    marina_id: String(w.marina_id),
    started_at: String(w.started_at),
    completed_at: w.completed_at ? String(w.completed_at) : null,
    walker_email: w.walker_email ?? null,
    slips_checked: Number(w.slips_checked),
    occupied_found: Number(w.occupied_found),
    mismatches: Number(w.mismatches),
  }));
  return {
    open: walks.find((w) => w.completed_at === null) ?? null,
    finished: walks.filter((w) => w.completed_at !== null),
  };
}

// What was recorded so far on one dockwalk, by slip.
export async function getWalkEntries(dockwalkId: string) {
  const supabase = await getClient();
  const { data } = await supabase
    .from("dockwalk_entries")
    .select("slip_id, occupied, electric_kwh, water_gal, system_status")
    .eq("dockwalk_id", dockwalkId);

  const entries = new Map<string, WalkEntry>();
  for (const e of data ?? []) {
    entries.set(String(e.slip_id), {
      slip_id: String(e.slip_id),
      occupied: e.occupied ?? null,
      electric_kwh: toNumber(e.electric_kwh),
      water_gal: toNumber(e.water_gal),
      system_status: e.system_status ?? null,
    });
  }
  return entries;
}

// The most recent earlier reading of each meter, per slip, looking back over
// the last few dockwalks (a slip skipped last time falls back to the one before).
export async function getPreviousReadings(marinaId: string, before: string) {
  const supabase = await getClient();
  const previous = new Map<string, Reading>();

  const { data: walks } = await supabase
    .from("dockwalks")
    .select("id")
    .eq("marina_id", marinaId)
    .lt("started_at", before)
    .order("started_at", { ascending: false })
    .limit(6);
  const ids = (walks ?? []).map((w) => String(w.id));
  if (ids.length === 0) return previous;

  const { data: entries } = await supabase
    .from("dockwalk_entries")
    .select("dockwalk_id, slip_id, electric_kwh, water_gal")
    .in("dockwalk_id", ids);

  // newest walk first, so the first reading we see for a slip is the latest
  for (const walkId of ids) {
    for (const e of (entries ?? []).filter((row) => String(row.dockwalk_id) === walkId)) {
      const slipId = String(e.slip_id);
      const current = previous.get(slipId) ?? { electric_kwh: null, water_gal: null };
      previous.set(slipId, {
        electric_kwh: current.electric_kwh ?? toNumber(e.electric_kwh),
        water_gal: current.water_gal ?? toNumber(e.water_gal),
      });
    }
  }
  return previous;
}
