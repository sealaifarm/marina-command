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

    // getClaims() verifies the session token's signature, so it can't be faked
    // with a cookie. With Supabase's asymmetric JWT signing keys the check runs
    // locally (no network call), which matters because this runs on every page
    // request and every link prefetch. With the legacy shared secret it falls
    // back to asking Supabase Auth, so it is never slower than getUser().
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims);
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
