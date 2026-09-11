/**
 * Root page — redirects to /counter (Meal Counter is the home screen)
 * UI/UX §2: "Meal Counter — Daily operational home"
 */

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/counter");
}
