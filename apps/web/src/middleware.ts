import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Edge middleware responsibilities:
 *  1. Refresh the Supabase session cookie.
 *  2. Gate protected routes — everything under /app requires auth.
 *  3. Bounce authenticated users away from sign-in/sign-up.
 *
 * Authorization (role/workspace membership) is NOT enforced here — that
 * belongs in the route handlers / RSC layer where DB access is available.
 *
 * Public = everything that is NOT under /app. Marketing pages, auth pages,
 * public report shares, and API health checks are all public by default.
 */

const isProtected = (pathname: string) => pathname.startsWith("/app");

const isAuthPage = (pathname: string) =>
  pathname === "/sign-in" || pathname === "/sign-up";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);

  // Authenticated user hitting auth pages → forward into the app.
  if (user && isAuthPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  // Unauthenticated user hitting a protected page → sign-in with a safe
  // relative redirect param (never an absolute URL — prevents open redirect).
  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     *  - Next.js internals (_next/static, _next/image)
     *  - favicon, sitemap, robots
     *  - Any path containing a file extension (images, fonts)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)"
  ],
};
