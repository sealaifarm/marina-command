"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error: string | null;
  email: string;
};

export async function signIn(
  _previous: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password to continue.", email };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: friendlyMessage(error), email };
    }
  } catch (error) {
    // Most likely missing environment variables or Supabase being unreachable.
    console.error("Sign-in failed:", error);
    return {
      error: "Sign-in is unavailable right now. Please try again in a moment.",
      email,
    };
  }

  redirect("/");
}

function friendlyMessage(error: AuthError) {
  switch (error.code) {
    case "invalid_credentials":
      return "That email or password isn't right. Please check them and try again.";
    case "email_not_confirmed":
      return "Please confirm your email address before signing in.";
    case "user_banned":
      return "This account has been disabled. Please contact your administrator.";
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a moment and try again.";
  }

  if (error.status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return "We couldn't sign you in. Please try again.";
}
