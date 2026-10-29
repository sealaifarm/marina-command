import { cache } from "react";
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
