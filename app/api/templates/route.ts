import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("payment_templates")
      .select("*")
      .eq("user_id", user.id)
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

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name =
      typeof body?.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const insertRow = {
      user_id: user.id,
      name,
      category: body?.category ?? null,
      kind: body?.kind ?? null,
      account_id: body?.account_id ?? null,
      recurrence_type: body?.recurrence_type ?? null,
      due_day: body?.due_day ?? null,
      default_due_date: body?.default_due_date ?? null,
      base_amount: body?.base_amount ?? null,
      minimum_payment: body?.minimum_payment ?? null,
      target_payment: body?.target_payment ?? null,
      statement_balance: body?.statement_balance ?? null,
      auto_rollover: body?.auto_rollover ?? null,
      requires_review: body?.requires_review ?? null,
      notes: body?.notes ?? null,
      sort_order: body?.sort_order ?? 0,
    };

    const { data, error } = await supabase
      .from("payment_templates")
      .insert(insertRow)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
}
