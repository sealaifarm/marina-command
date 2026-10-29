import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Marina Command",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh bg-background">
      {/* Marina image: add your photo at public/login-hero.webp. Hidden on small screens. */}
      <section className="hidden p-4 lg:block lg:w-1/2 xl:w-[55%]">
        {/* next/image serves a resized AVIF/WebP instead of the 2400px original. It stays lazy
            on purpose: browsers skip lazy images inside hidden sections, so phones never download it. */}
        <div aria-hidden="true" className="relative h-full min-h-[32rem] overflow-hidden rounded-[2rem] bg-muted">
          <Image
            src="/login-hero.webp"
            alt=""
            fill
            sizes="(min-width: 1280px) 55vw, 50vw"
            className="object-cover object-center"
          />
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Your logo: public/logo.png */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Marina Command"
            className="mb-12 h-12 w-auto max-w-full"
          />

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
