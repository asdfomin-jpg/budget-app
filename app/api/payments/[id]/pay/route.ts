import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../../lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const body = await request.json();
    const paymentAmount = Number(body?.payment_amount);

    if (
      body?.payment_amount === undefined ||
      body?.payment_amount === null ||
      body?.payment_amount === "" ||
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0 ||
      paymentAmount > Number.MAX_SAFE_INTEGER
    ) {
      return NextResponse.json(
        { error: "payment_amount must be a positive number" },
        { status: 400 }
      );
    }

    const actualPaidTotalBefore = Number(payment.actual_paid_total ?? 0);
    const remainingBefore = Number(payment.remaining_amount ?? 0);

    if (
      !Number.isFinite(actualPaidTotalBefore) ||
      !Number.isFinite(remainingBefore) ||
      remainingBefore < 0
    ) {
      return NextResponse.json({ error: "Invalid payment state" }, { status: 500 });
    }

    const actualPaidTotal = actualPaidTotalBefore + paymentAmount;
    const isFullyPaid = paymentAmount >= remainingBefore;
    const remainingAmount = isFullyPaid ? 0 : remainingBefore - paymentAmount;
    const statusAfter = isFullyPaid ? "paid" : "partial";
    const paidAt = new Date().toISOString();
    const note = typeof body?.note === "string" ? body.note : null;

    const { data: updatedPayment, error: updateError } = await supabase
      .from("payments")
      .update({
        actual_paid_total: actualPaidTotal,
        remaining_amount: remainingAmount,
        status: statusAfter,
        last_paid_at: paidAt,
      })
      .eq("id", payment.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: historyError } = await supabase.from("payment_history").insert({
      user_id: user.id,
      payment_id: payment.id,
      action_type: isFullyPaid ? "marked_paid" : "partial_paid",
      action_source: "manual",
      actual_paid_amount: paymentAmount,
      remaining_before: remainingBefore,
      remaining_after: remainingAmount,
      status_before: payment.status,
      status_after: statusAfter,
      paid_at: paidAt,
      note,
    });

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    return NextResponse.json({ data: updatedPayment });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
}
