"use client";

/**
 * SessionProvider wrapper
 *
 * Must be a Client Component because NextAuth's SessionProvider
 * uses React context. Wraps the app for client-side session access.
 *
 * Used in the root layout so all pages can access the session.
 */

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

interface Props {
  children: React.ReactNode;
  session?: Session | null;
}

export function SessionProvider({ children, session }: Props) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
