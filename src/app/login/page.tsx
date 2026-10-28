import type { Metadata } from "next";
import { AnchorIcon } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Marina Command",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh bg-background">
      {/* Marina image: add your photo at public/login-hero.webp. Hidden on small screens. */}
      <section className="hidden p-4 lg:block lg:w-1/2 xl:w-[55%]">
        <div
          aria-hidden="true"
          className="h-full min-h-[32rem] rounded-[2rem] bg-muted bg-cover bg-center"
          style={{ backgroundImage: "url(/login-hero.webp)" }}
        />
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-12 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <AnchorIcon />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Marina Command
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mb-10 mt-3 text-muted-foreground">
            Sign in to manage your marina.
          </p>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
