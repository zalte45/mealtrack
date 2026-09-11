/**
 * Next.js 16 Proxy — Route Protection
 *
 * Replaces the deprecated middleware.ts convention.
 * Protects all routes from unauthenticated access.
 * Redirects unauthenticated users to /login.
 * Redirects authenticated users away from /login to /counter.
 *
 * Provider isolation is enforced at the API level (not here),
 * because this runs in Edge Runtime and cannot use Prisma.
 *
 * SECURITY NOTE:
 * - Checks JWT token existence and basic validity.
 * - All sensitive business logic re-validates the session server-side.
 * - Never trust client-provided role/providerId values in API routes.
 */

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Already authenticated users visiting /login → redirect to counter
    if (pathname.startsWith("/login") && token) {
      return NextResponse.redirect(new URL("/counter", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes — always allow
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/_next") ||
          pathname.startsWith("/favicon") ||
          pathname === "/"
        ) {
          return true;
        }

        // All other routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  // Match all routes except static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
