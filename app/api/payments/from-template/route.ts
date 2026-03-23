import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string) {
  if (!DATE_REGEX.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getFirstDayOfMonth(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function buildDateForMonth(monthDate: string, dueDay: unknown) {
  const numericDueDay = Number(dueDay);

  if (!Number.isInteger(numericDueDay) || numericDueDay < 1 || numericDueDay > 31) {
    return null;
  }

  const [year, month] = monthDate.slice(0, 7).split("-").map(Number);
  const candidate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    numericDueDay
  ).padStart(2, "0")}`;

  return isValidDate(candidate) ? candidate : null;
}

function getNextMonthFirstDay(monthDate: string) {
  const [year, month] = monthDate.slice(0, 7).split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;
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
    const templateId = body?.template_id;
    const billingMonthInput =
      typeof body?.billing_month === "string" ? body.billing_month : "";

    if (!templateId) {
      return NextResponse.json(
        { error: "template_id is required" },
        { status: 400 }
      );
    }

    if (!isValidDate(billingMonthInput)) {
      return NextResponse.json(
        { error: "billing_month must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (
      body?.due_date !== undefined &&
      body?.due_date !== null &&
      body?.due_date !== "" &&
      (typeof body.due_date !== "string" || !isValidDate(body.due_date))
    ) {
      return NextResponse.json(
        { error: "due_date must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    let baseAmountOverride: number | null = null;
    if (
      body?.base_amount !== undefined &&
      body?.base_amount !== null &&
      body?.base_amount !== ""
    ) {
      baseAmountOverride = Number(body.base_amount);

      if (!Number.isFinite(baseAmountOverride) || baseAmountOverride < 0) {
        return NextResponse.json(
          { error: "base_amount must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    const { data: template, error: templateError } = await supabase
      .from("payment_templates")
      .select("*")
      .eq("id", templateId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (templateError) {
      return NextResponse.json({ error: templateError.message }, { status: 500 });
    }

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const billingMonth = getFirstDayOfMonth(billingMonthInput);

    const findExistingPayment = async () =>
      supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .eq("template_id", template.id)
        .eq("billing_month", billingMonth)
        .maybeSingle();

    const { data: existingPayment, error: existingPaymentError } =
      await findExistingPayment();

    if (existingPaymentError) {
      return NextResponse.json({ error: existingPaymentError.message }, { status: 500 });
    }

    if (existingPayment) {
      return NextResponse.json({ data: existingPayment });
    }

    const dueDate =
      (typeof body?.due_date === "string" && isValidDate(body.due_date) && body.due_date) ||
      buildDateForMonth(billingMonth, template.due_day) ||
      template.default_due_date ||
      null;
    const nextDueDate = buildDateForMonth(
      getNextMonthFirstDay(billingMonth),
      template.due_day
    );

    const templateBaseAmount = Number(template.base_amount ?? 0);
    const baseAmount =
      baseAmountOverride !== null
        ? baseAmountOverride
        : Number.isFinite(templateBaseAmount) && templateBaseAmount >= 0
          ? templateBaseAmount
          : 0;

    const notes =
      typeof body?.notes === "string"
        ? body.notes
        : template.notes ?? null;

    const paymentRow = {
      user_id: user.id,
      template_id: template.id,
      account_id: template.account_id,
      name: template.name,
      category: template.category,
      kind: template.kind,
      billing_month: billingMonth,
      due_date: dueDate,
      next_due_date: nextDueDate,
      base_amount: baseAmount,
      carryover_amount: 0,
      actual_paid_total: 0,
      remaining_amount: baseAmount,
      status: "unpaid",
      rollover_status: "pending",
      is_reviewed: false,
      is_locked: false,
      minimum_payment: template.minimum_payment,
      target_payment: template.target_payment,
      statement_balance: template.statement_balance,
      notes,
      sort_order: template.sort_order ?? 0,
    };

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert(paymentRow)
      .select("*")
      .single();

    if (paymentError) {
      if (paymentError.code === "23505") {
        const { data: duplicatePayment, error: duplicatePaymentError } =
          await findExistingPayment();

        if (duplicatePaymentError) {
          return NextResponse.json({ error: duplicatePaymentError.message }, { status: 500 });
        }

        if (duplicatePayment) {
          return NextResponse.json({ data: duplicatePayment });
        }
      }

      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    const { error: historyError } = await supabase.from("payment_history").insert({
      user_id: user.id,
      payment_id: payment.id,
      action_type: "created",
      action_source: "manual",
      billing_month_after: billingMonth,
      actual_paid_amount: 0,
      remaining_after: baseAmount,
      status_after: "unpaid",
      note: "Created from template",
    });

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    return NextResponse.json({ data: payment });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
}
