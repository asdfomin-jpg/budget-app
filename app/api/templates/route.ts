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
      .order("name", { ascending: true });

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
    const category =
      typeof body?.category === "string" && body.category.trim()
        ? body.category.trim()
        : null;
    const kind =
      typeof body?.kind === "string" && body.kind.trim()
        ? body.kind.trim()
        : null;
    const recurrenceType =
      typeof body?.recurrence_type === "string" && body.recurrence_type.trim()
        ? body.recurrence_type.trim()
        : null;
    const dueDayValue =
      body?.due_day === undefined || body?.due_day === null || body?.due_day === ""
        ? null
        : Number(body.due_day);
    const baseAmountValue =
      body?.base_amount === undefined ||
      body?.base_amount === null ||
      body?.base_amount === ""
        ? null
        : Number(body.base_amount);

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    if (
      dueDayValue !== null &&
      (!Number.isInteger(dueDayValue) || dueDayValue < 1 || dueDayValue > 31)
    ) {
      return NextResponse.json(
        { error: "due_day must be an integer between 1 and 31" },
        { status: 400 }
      );
    }

    if (
      baseAmountValue !== null &&
      (!Number.isFinite(baseAmountValue) || baseAmountValue < 0)
    ) {
      return NextResponse.json(
        { error: "base_amount must be a non-negative number" },
        { status: 400 }
      );
    }

    const insertRow = {
      user_id: user.id,
      name,
      category,
      kind,
      recurrence_type: recurrenceType,
      due_day: dueDayValue,
      base_amount: baseAmountValue,
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
