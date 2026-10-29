import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { createClient } from "@/lib/supabase/server";
import { MARINA_COOKIE, SIDEBAR_COOKIE } from "@/lib/preferences";

// Every page inside this folder requires a signed-in user.
// (src/proxy.ts already redirects visitors; this check is a second safety net.)
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Marinas this user can access (row level security does the filtering).
  const { data } = await supabase.from("marinas").select("id, name").order("name");
  const marinas = data ?? [];

  const cookieStore = await cookies();
  const savedMarina = cookieStore.get(MARINA_COOKIE)?.value;
  const selectedMarinaId =
    marinas.find((marina) => marina.id === savedMarina)?.id ?? marinas[0]?.id ?? null;
  const initialCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <AppShell
      email={user.email ?? ""}
      marinas={marinas}
      selectedMarinaId={selectedMarinaId}
      initialCollapsed={initialCollapsed}
    >
      {children}
    </AppShell>
  );
}
