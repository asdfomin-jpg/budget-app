import { redirect } from "next/navigation";
import HomePageClient from "./HomePageClient";
import { createServerSupabase } from "../lib/supabase/server";

export default async function HomePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return <HomePageClient />;
}
