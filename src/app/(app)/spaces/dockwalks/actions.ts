"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getSelectedMarina } from "@/lib/supabase/session";

export type SaveEntry = {
  slip_id: string;
  occupied: boolean | null;
  electric_kwh: number | null;
  water_gal: number | null;
};

export type SaveResult = { ok: true } | { ok: false; error: string };

const LIST = "/spaces/dockwalks";

// Start a dockwalk for the marina picked in the sidebar, then open it.
// If one is already in progress, open that one instead.
export async function startDockwalk() {
  const [marina, user] = await Promise.all([getSelectedMarina(), getCurrentUser()]);
  if (!marina || !user) redirect(LIST);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dockwalks")
    .insert({ marina_id: marina.id, walker_email: user.email || null })
    .select("id")
    .single();

  let id: string | undefined = data?.id;
  if (!id) {
    // most likely a walk is already in progress (only one is allowed)
    const { data: open } = await supabase
      .from("dockwalks")
      .select("id")
      .eq("marina_id", marina.id)
      .is("completed_at", null)
      .maybeSingle();
    id = open?.id;
  }
  if (!id) {
    console.error("Could not start dockwalk:", error?.message);
    redirect(`${LIST}?error=start`);
  }

  revalidatePath(LIST);
  redirect(`${LIST}/${id}`);
}

// Save what the walker changed, and optionally finish the dockwalk.
// Only the slips that changed are sent, so two people walking different docks
// on the same dockwalk don't overwrite each other. A slip with nothing left on
// it (cleared) has its entry removed.
export async function saveDockwalk(
  dockwalkId: string,
  entries: SaveEntry[],
  finish: boolean
): Promise<SaveResult> {
  const supabase = await createClient();

  const { data: walk } = await supabase
    .from("dockwalks")
    .select("id, marina_id, completed_at")
    .eq("id", dockwalkId)
    .maybeSingle();
  if (!walk) return { ok: false, error: "This dockwalk could not be found." };
  if (walk.completed_at) return { ok: false, error: "This dockwalk is already finished." };

  // Only accept slips of this marina, and note each one's current status.
  const { data: slips } = await supabase.from("slips").select("id, status").eq("marina_id", walk.marina_id);
  const statusBySlip = new Map((slips ?? []).map((s) => [String(s.id), String(s.status)]));

  const validNumber = (n: unknown) => n === null || (typeof n === "number" && Number.isFinite(n) && n >= 0);

  const upserts = [];
  const cleared: string[] = [];
  for (const entry of entries) {
    if (!statusBySlip.has(entry.slip_id)) continue;
    if (!validNumber(entry.electric_kwh) || !validNumber(entry.water_gal)) {
      return { ok: false, error: "A meter reading isn't a valid number." };
    }
    const occupied = typeof entry.occupied === "boolean" ? entry.occupied : null;

    if (occupied === null && entry.electric_kwh === null && entry.water_gal === null) {
      cleared.push(entry.slip_id);
    } else {
      upserts.push({
        dockwalk_id: walk.id,
        marina_id: walk.marina_id,
        slip_id: entry.slip_id,
        occupied,
        electric_kwh: entry.electric_kwh,
        water_gal: entry.water_gal,
        system_status: statusBySlip.get(entry.slip_id),
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("dockwalk_entries")
      .upsert(upserts, { onConflict: "dockwalk_id,slip_id" });
    if (error) {
      console.error("Saving dockwalk entries failed:", error.message);
      return { ok: false, error: "Couldn't save. Check your connection and try again." };
    }
  }

  if (cleared.length > 0) {
    const { error } = await supabase
      .from("dockwalk_entries")
      .delete()
      .eq("dockwalk_id", walk.id)
      .in("slip_id", cleared);
    if (error) {
      console.error("Clearing dockwalk entries failed:", error.message);
      return { ok: false, error: "Couldn't save. Check your connection and try again." };
    }
  }

  if (finish) {
    const { error } = await supabase
      .from("dockwalks")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", walk.id)
      .is("completed_at", null);
    if (error) {
      console.error("Finishing dockwalk failed:", error.message);
      return { ok: false, error: "Saved, but the dockwalk couldn't be finished. Try again." };
    }
  }

  revalidatePath(LIST);
  revalidatePath(`${LIST}/${walk.id}`);
  return { ok: true };
}

// Throw away a dockwalk that is still in progress (e.g. started by mistake).
export async function discardDockwalk(dockwalkId: string) {
  const supabase = await createClient();
  await supabase.from("dockwalks").delete().eq("id", dockwalkId).is("completed_at", null);
  revalidatePath(LIST);
  redirect(LIST);
}
