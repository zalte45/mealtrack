/**
 * NextAuth API Route Handler
 *
 * Handles all /api/auth/* requests (sign in, sign out, session, CSRF).
 * Configuration lives in lib/auth.ts to keep this file minimal.
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
