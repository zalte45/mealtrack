/**
 * MealTrack — Auth.js (NextAuth v4) Configuration
 *
 * Extended user shape returned from the authorize callback.
 * Fields are embedded in the JWT and session.
 */
interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  providerId: string;
  providerName: string;
  providerTimezone: string;
}

/**
 * MealTrack — Auth.js (NextAuth v4) Configuration
 *
 * Authentication strategy:
 * - Credentials provider (email + password)
 * - bcryptjs password hashing
 * - JWT sessions (no database session storage needed for MVP)
 * - Role embedded in JWT token (validated server-side on each request)
 * - Provider isolation enforced on every API call
 *
 * SECURITY NOTE:
 * - Passwords are NEVER stored plaintext (BR-007 SRS §7)
 * - JWT contains only non-sensitive identifiers (userId, role, providerId)
 * - All sensitive business queries are re-validated server-side
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { LoginSchema } from "@/lib/validations";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours — reasonable for a work shift
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // 1. Validate input shape
          const parsed = LoginSchema.safeParse(credentials);
          if (!parsed.success) {
            return null;
          }

          const { email, password } = parsed.data;

          const { db } = await import("@/lib/db");

          // 2. Look up user by email
          const user = await db.user.findFirst({
            where: {
              email: email.toLowerCase(),
              status: "ACTIVE",
            },
            include: {
              provider: {
                select: {
                  id: true,
                  name: true,
                  timezone: true,
                  status: true,
                },
              },
            },
          });

          if (!user || user.provider.status !== "ACTIVE") {
            return null;
          }

          // 3. Verify password (bcryptjs — never compare plaintext)
          const isValid = await bcryptjs.compare(password, user.passwordHash);
          if (!isValid) {
            return null;
          }

          // 4. Return safe user object (no passwordHash in token)
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            providerId: user.providerId,
            providerName: user.provider.name,
            providerTimezone: user.provider.timezone,
          };
        } catch (error) {
          const err = error as Error;
          console.error("[AUTH_DIAGNOSTIC] Authentication failed due to an internal exception.");
          console.error(`[AUTH_DIAGNOSTIC] Name: ${err.name}`);
          console.error(`[AUTH_DIAGNOSTIC] Message: ${err.message}`);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, embed role and provider info into the JWT
      if (user) {
        const extended = user as ExtendedUser;
        token.userId = extended.id;
        token.role = extended.role;
        token.providerId = extended.providerId;
        token.providerName = extended.providerName;
        token.providerTimezone = extended.providerTimezone;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose safe fields to the client session
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.providerId = token.providerId as string;
        session.user.providerName = token.providerName as string;
        session.user.providerTimezone = token.providerTimezone as string;
      }
      return session;
    },
  },
};
