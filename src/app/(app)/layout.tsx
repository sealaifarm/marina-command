import { redirect } from "next/navigation";
import { AnchorIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

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

  return (
    <div className="min-h-dvh">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <AnchorIcon width={18} height={18} />
            </span>
            <span className="font-semibold tracking-tight">Marina Command</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        {children}
      </main>
    </div>
  );
}
