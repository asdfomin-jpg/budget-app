import { redirect } from "next/navigation";
import { createServerSupabase } from "../../lib/supabase/server";

export default async function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    redirect("/");
  }

  return children;
}
