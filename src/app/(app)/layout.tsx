import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { getCurrentUser, getMarinas } from "@/lib/supabase/session";
import { MARINA_COOKIE, SIDEBAR_COOKIE } from "@/lib/preferences";

// Every page inside this folder requires a signed-in user.
// (src/proxy.ts already redirects visitors; this check is a second safety net.)
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // These lookups don't depend on each other, so run them together instead of
  // one after another.
  const [user, marinas, cookieStore] = await Promise.all([
    getCurrentUser(),
    getMarinas(),
    cookies(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const savedMarina = cookieStore.get(MARINA_COOKIE)?.value;
  const selectedMarinaId =
    marinas.find((marina) => marina.id === savedMarina)?.id ?? marinas[0]?.id ?? null;
  const initialCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <AppShell
      email={user.email}
      marinas={marinas}
      selectedMarinaId={selectedMarinaId}
      initialCollapsed={initialCollapsed}
    >
      {children}
    </AppShell>
  );
}
