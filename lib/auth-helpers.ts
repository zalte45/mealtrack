/**
 * Server-side Authorization Helpers
 *
 * SECURITY RULES (from SRS §7, Architecture §8):
 * - Never trust client-provided role/providerId
 * - All sensitive queries scoped by providerId from the server session
 * - Provider isolation enforced server-side on every request
 * - Passwords and secrets never logged
 *
 * Usage in Route Handlers:
 *   const session = await requireAuth(request);
 *   // session.user.providerId is safe — comes from server JWT
 *
 * Usage in Server Components:
 *   const session = await requireAuthServer();
 *   // redirects to /login if not authenticated
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface AuthedSession extends Session {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    providerId: string;
    providerName: string;
    providerTimezone: string;
  };
}

type ApiAuthResult =
  | { ok: true; session: AuthedSession }
  | { ok: false; response: NextResponse };

// --------------------------------------------------------------------------
// Route Handler helpers (API routes)
// --------------------------------------------------------------------------

/**
 * Require authentication in an API route handler.
 * Returns the session if valid, or a 401 JSON response.
 *
 * Usage:
 *   const auth = await requireAuth(req);
 *   if (!auth.ok) return auth.response;
 *   const { session } = auth;
 */
export async function requireAuth(
  // req is not directly used — getServerSession reads from Next.js request context
  // kept for API consistency so callers have a clear function signature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _req?: NextRequest
): Promise<ApiAuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session?.user?.providerId) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  return { ok: true, session: session as AuthedSession };
}

/**
 * Require OWNER role in an API route handler.
 * Returns the session if valid OWNER, or 401/403 JSON response.
 *
 * Usage:
 *   const auth = await requireOwner(req);
 *   if (!auth.ok) return auth.response;
 */
export async function requireOwner(req: NextRequest): Promise<ApiAuthResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  if (auth.session.user.role !== "OWNER") {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Owner access required" },
        { status: 403 }
      ),
    };
  }

  return auth;
}

// --------------------------------------------------------------------------
// Server Component helpers (App Router pages / layouts)
// --------------------------------------------------------------------------

/**
 * Get the session in a Server Component.
 * Returns null if not authenticated (does NOT redirect).
 */
export async function getSession(): Promise<AuthedSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session as AuthedSession;
}

/**
 * Require authentication in a Server Component.
 * Redirects to /login if not authenticated.
 *
 * Usage (in page.tsx or layout.tsx):
 *   const session = await requireAuthServer();
 *   // guaranteed to have a valid session below
 */
export async function requireAuthServer(): Promise<AuthedSession> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session?.user?.providerId) {
    redirect("/login");
  }

  return session as AuthedSession;
}

/**
 * Require OWNER role in a Server Component.
 * Redirects to /login if not authenticated, or /counter if not OWNER.
 */
export async function requireOwnerServer(): Promise<AuthedSession> {
  const session = await requireAuthServer();

  if (session.user.role !== "OWNER") {
    redirect("/counter");
  }

  return session;
}

// --------------------------------------------------------------------------
// Permission helpers
// --------------------------------------------------------------------------

/** Check if the user has OWNER role */
export function isOwner(session: AuthedSession): boolean {
  return session.user.role === "OWNER";
}

/** Check if the user has STAFF role */
export function isStaff(session: AuthedSession): boolean {
  return session.user.role === "STAFF";
}

/**
 * Assert that a resource belongs to the authenticated provider.
 * Throws 403 response if not.
 *
 * Usage:
 *   assertProviderScope(auth.session, customer.providerId);
 */
export function assertProviderScope(
  session: AuthedSession,
  resourceProviderId: string
): void | never {
  if (session.user.providerId !== resourceProviderId) {
    throw new Error("Resource does not belong to your provider");
  }
}
