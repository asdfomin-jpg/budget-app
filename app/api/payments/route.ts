import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("year", { ascending: true })
      .order("due_date", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mappedRows = (data ?? []).map((row) => ({
      id: row.id,
      year: row.year,
      month: row.month,
      week: row.week,
      type: row.type,
      name: row.name,
      dueDate: row.due_date,
      currentAmount: Number(row.current_amount ?? 0),
      carryOver: Number(row.carry_over ?? 0),
      totalDue: Number(row.total_due ?? 0),
      isPaid: Boolean(row.is_paid),
      isConfirmed: Boolean(row.is_confirmed),
      isActive: Boolean(row.is_active),
      paidAmount:
        row.paid_amount !== null && row.paid_amount !== undefined
          ? Number(row.paid_amount)
          : undefined,
      paidDate: row.paid_date ?? undefined,
      creditMinPayment:
        row.credit_min_payment !== null &&
        row.credit_min_payment !== undefined
          ? Number(row.credit_min_payment)
          : undefined,
      creditBalance:
        row.credit_balance !== null && row.credit_balance !== undefined
          ? Number(row.credit_balance)
          : undefined,
    }));

    return NextResponse.json({ data: mappedRows });
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
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows : null;

    if (!rows) {
      return NextResponse.json(
        { error: "Body must contain rows array" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("payments")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const mappedRows = rows.map((row: any) => ({
      user_id: user.id,
      year: row.year,
      month: row.month,
      week: row.week,
      type: row.type,
      name: row.name,
      due_date: row.dueDate,
      current_amount: row.currentAmount,
      carry_over: row.carryOver,
      total_due: row.totalDue,
      is_paid: row.isPaid,
      is_confirmed: row.isConfirmed,
      is_active: row.isActive,
      paid_amount: row.paidAmount ?? null,
      paid_date: row.paidDate ?? null,
      credit_min_payment: row.creditMinPayment ?? null,
      credit_balance: row.creditBalance ?? null,
    }));

    const { data, error } = await supabase
      .from("payments")
      .insert(mappedRows)
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
}