import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

// Runs on every page request (see src/proxy.ts):
//   1. refreshes the Supabase session cookies
//   2. sends signed-out visitors to /login
//   3. sends signed-in visitors away from /login
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const isLoginPage = request.nextUrl.pathname === "/login";

  let signedIn = false;

  try {
    const { url, key } = getSupabaseEnv();

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // getUser() checks the session with Supabase, so it can't be faked with a cookie.
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } catch {
    // Missing env vars or Supabase unreachable: treat the visitor as signed out.
    signedIn = false;
  }

  if (!signedIn && !isLoginPage) {
    return redirectTo(request, "/login", response);
  }

  if (signedIn && isLoginPage) {
    return redirectTo(request, "/", response);
  }

  return response;
}

function redirectTo(
  request: NextRequest,
  pathname: string,
  previous: NextResponse
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  const redirect = NextResponse.redirect(url);
  // Keep any session cookies Supabase just refreshed or cleared.
  previous.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
