import { NextResponse } from "next/server";

import { createServerSupabase } from "../../../../../lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
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

    const { data: updatedPayment, error: updateError } = await supabase
      .from("payments")
      .update({
        is_reviewed: true,
      })
      .eq("id", payment.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const reviewedAt = new Date().toISOString();

    const { error: historyError } = await supabase.from("payment_history").insert({
      user_id: user.id,
      payment_id: payment.id,
      action_type: "reviewed",
      action_source: "manual",
      actual_paid_amount: 0,
      remaining_before: payment.remaining_amount,
      remaining_after: payment.remaining_amount,
      status_before: payment.status,
      status_after: payment.status,
      paid_at: reviewedAt,
      note: "Marked as reviewed",
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
