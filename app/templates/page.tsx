import { redirect } from "next/navigation";

import DashboardClient from "../DashboardClient";
import { createServerSupabase } from "../../lib/supabase/server";

export default async function TemplatesPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return <DashboardClient mode="templates" />;
}
