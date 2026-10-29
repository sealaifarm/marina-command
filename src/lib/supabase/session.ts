import { cache } from "react";
import { cookies } from "next/headers";
import { MARINA_COOKIE } from "@/lib/preferences";
import { createClient } from "./server";

// Per-request helpers for Server Components. React's cache() makes each one run
// at most once per request, so the layout and any page can call them freely
// without repeating the Supabase round trip.

// One Supabase client per request.
const getClient = cache(createClient);

// The signed-in user, or null. Reads the verified token claims instead of
// calling Supabase Auth (see the note in ./proxy.ts).
export const getCurrentUser = cache(async () => {
  const supabase = await getClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) return null;

  const email = "email" in claims && typeof claims.email === "string" ? claims.email : "";
  return { email };
});

// Marinas this user can access (row level security does the filtering).
export const getMarinas = cache(async () => {
  const supabase = await getClient();
  const { data } = await supabase.from("marinas").select("id, name").order("name");
  const marinas: { id: string; name: string }[] = data ?? [];
  return marinas;
});

// The marina picked in the sidebar (saved in a cookie), or the first one.
// Same rule the app layout uses, so pages always agree with the sidebar.
export const getSelectedMarina = cache(async () => {
  const [marinas, cookieStore] = await Promise.all([getMarinas(), cookies()]);
  const saved = cookieStore.get(MARINA_COOKIE)?.value;
  return marinas.find((marina) => marina.id === saved) ?? marinas[0] ?? null;
});

// Everything the Marina Map draws for one marina. The three queries are
// independent, so they run together. Row level security limits the results to
// marinas this user belongs to.
export const getMarinaMap = cache(async (marinaId: string) => {
  const supabase = await getClient();
  const [layoutRes, docksRes, slipsRes] = await Promise.all([
    supabase.from("map_layouts").select("width, height").eq("marina_id", marinaId).maybeSingle(),
    supabase
      .from("docks")
      .select("id, name, length, width, map_x, map_y, rotation")
      .eq("marina_id", marinaId)
      .order("name"),
    supabase
      .from("slips")
      .select("id, dock_id, name, length, width, status, map_x, map_y, rotation")
      .eq("marina_id", marinaId)
      .order("name"),
  ]);

  if (layoutRes.error || docksRes.error || slipsRes.error) return null;

  // numeric columns can arrive as strings; make sure the map gets real numbers
  const layout = layoutRes.data
    ? { width: Number(layoutRes.data.width), height: Number(layoutRes.data.height) }
    : null;
  const docks = (docksRes.data ?? []).map((d) => ({
    id: String(d.id),
    name: String(d.name),
    length: Number(d.length),
    width: Number(d.width),
    map_x: Number(d.map_x),
    map_y: Number(d.map_y),
    rotation: Number(d.rotation),
  }));
  const slips = (slipsRes.data ?? []).map((s) => ({
    id: String(s.id),
    dock_id: String(s.dock_id),
    name: String(s.name),
    length: Number(s.length),
    width: Number(s.width),
    status: String(s.status),
    map_x: Number(s.map_x),
    map_y: Number(s.map_y),
    rotation: Number(s.rotation),
  }));

  return { layout, docks, slips };
});
