import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase/server";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string) {
  if (!DATE_REGEX.test(value)) {
    return false;
  }

  const [y, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, month - 1, day));

  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const billingMonth = searchParams.get("billingMonth") ?? "";

    if (!isValidDate(billingMonth)) {
      return NextResponse.json(
        { error: "billingMonth must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .eq("billing_month", billingMonth)
      .order("due_date", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
}
