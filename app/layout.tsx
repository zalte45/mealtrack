/**
 * Root Layout — MealTrack
 *
 * - Sets up fonts (Geist) and global CSS
 * - Wraps the entire app in NextAuth SessionProvider
 * - Applies base HTML/body structure
 * - Sets SEO metadata
 */

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SessionProvider } from "@/components/providers/SessionProvider";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MealTrack",
    template: "%s | MealTrack",
  },
  description:
    "Provider-only meal subscription and consumption tracking system",
  robots: {
    index: false, // Provider-only app — not for public indexing
    follow: false,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pass the server session to SessionProvider to avoid a client-side
  // fetch waterfall on initial page load
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full bg-slate-50 antialiased">
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
