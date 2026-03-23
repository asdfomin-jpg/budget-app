"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";

type HomePageClientProps = {
  mode?: "payments" | "templates";
};

type Payment = {
  id: string;
  name: string | null;
  category: string | null;
  kind: string | null;
  billing_month: string | null;
  due_date: string | null;
  base_amount: number | null;
  actual_paid_total: number | null;
  remaining_amount: number | null;
  status: string | null;
  is_reviewed: boolean | null;
};

type Template = {
  id: string;
  name: string | null;
  category: string | null;
  kind: string | null;
  recurrence_type: string | null;
  due_day: number | null;
  base_amount: number | null;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type SummaryValues = {
  total: number;
  paid: number;
  remaining: number;
};

type TemplateFormState = {
  name: string;
  category: string;
  kind: string;
  recurrence_type: string;
  due_day: string;
  base_amount: string;
};

const YEARS = [2026, 2027];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEK_BUTTONS = ["Month", "Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Credit"];

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildBillingMonth(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
}

function emptyTemplateForm(): TemplateFormState {
  return {
    name: "",
    category: "",
    kind: "",
    recurrence_type: "",
    due_day: "",
    base_amount: "",
  };
}

function isCreditPayment(payment: Payment) {
  return (payment.kind || "").toLowerCase() === "debt";
}

function sumPayments(payments: Payment[]): SummaryValues {
  return payments.reduce(
    (totals, payment) => ({
      total: totals.total + Number(payment.base_amount ?? 0),
      paid: totals.paid + Number(payment.actual_paid_total ?? 0),
      remaining: totals.remaining + Number(payment.remaining_amount ?? 0),
    }),
    { total: 0, paid: 0, remaining: 0 }
  );
}

function getCarryOver() {
  return 0;
}

function getTotalDue(payment: Payment) {
  return Number(payment.base_amount ?? 0) + getCarryOver();
}

function getRowBackgroundClass(status: string | null) {
  if (status === "paid") {
    return "bg-[#dcfce7]";
  }

  if (status === "partial") {
    return "bg-[#fef9c3]";
  }

  return "bg-white";
}

export default function HomePageClient({
  mode = "payments",
}: HomePageClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const now = useMemo(() => new Date(), []);
  const defaultYear = YEARS.includes(now.getFullYear()) ? now.getFullYear() : YEARS[0];
  const defaultMonthIndex = now.getMonth();

  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(defaultMonthIndex);
  const [selectedWeek, setSelectedWeek] = useState("Month");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(mode === "payments");
  const [loadingTemplates, setLoadingTemplates] = useState(mode === "templates");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(
    emptyTemplateForm()
  );

  const billingMonth = useMemo(
    () => buildBillingMonth(selectedYear, selectedMonthIndex),
    [selectedMonthIndex, selectedYear]
  );

  async function fetchPayments() {
    setLoadingPayments(true);

    try {
      const response = await fetch(`/api/payments?billingMonth=${billingMonth}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<Payment[]>;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load payments");
      }

      setPayments(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load payments"
      );
    } finally {
      setLoadingPayments(false);
    }
  }

  async function fetchTemplates() {
    setLoadingTemplates(true);

    try {
      const response = await fetch("/api/templates", {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<Template[]>;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load templates");
      }

      const items = Array.isArray(payload.data) ? payload.data : [];
      setTemplates(items);

      if (!selectedTemplateId && items.length > 0) {
        setSelectedTemplateId(items[0].id);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load templates"
      );
    } finally {
      setLoadingTemplates(false);
    }
  }

  useEffect(() => {
    setErrorMessage(null);
    setActionMessage(null);
    void fetchTemplates();
  }, []);

  useEffect(() => {
    if (mode === "payments") {
      void fetchPayments();
    }
  }, [billingMonth, mode]);

  const visiblePayments = useMemo(() => {
    if (selectedWeek === "Credit") {
      return payments.filter((payment) => isCreditPayment(payment));
    }

    return payments;
  }, [payments, selectedWeek]);

  const billsSummary = useMemo(
    () => sumPayments(payments.filter((payment) => !isCreditPayment(payment))),
    [payments]
  );
  const creditsSummary = useMemo(
    () => sumPayments(payments.filter((payment) => isCreditPayment(payment))),
    [payments]
  );
  const totalSummary = useMemo(() => sumPayments(payments), [payments]);

  async function handlePay(paymentId: string) {
    setBusyPaymentId(paymentId);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/payments/${paymentId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_amount: 5,
        }),
      });
      const payload = (await response.json()) as ApiResponse<Payment>;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to pay payment");
      }

      await fetchPayments();
      setActionMessage("Payment updated");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to pay payment"
      );
    } finally {
      setBusyPaymentId(null);
    }
  }

  async function handleReview(paymentId: string) {
    setBusyReviewId(paymentId);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/payments/${paymentId}/review`, {
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse<Payment>;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to review payment");
      }

      await fetchPayments();
      setActionMessage("Payment reviewed");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to review payment"
      );
    } finally {
      setBusyReviewId(null);
    }
  }

  async function handleCreatePayment() {
    if (!selectedTemplateId) {
      setErrorMessage("Select a template first");
      return;
    }

    setBusyTemplateId(selectedTemplateId);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/payments/from-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          billing_month: billingMonth,
        }),
      });
      const payload = (await response.json()) as ApiResponse<Payment>;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create payment");
      }

      await fetchPayments();
      setAddPaymentOpen(false);
      setActionMessage("Payment created");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create payment"
      );
    } finally {
      setBusyTemplateId(null);
    }
  }

  async function handleCreateTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreatingTemplate(true);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: templateForm.name,
          category: templateForm.category,
          kind: templateForm.kind,
          recurrence_type: templateForm.recurrence_type,
          due_day: templateForm.due_day,
          base_amount: templateForm.base_amount,
        }),
      });
      const payload = (await response.json()) as ApiResponse<Template>;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create template");
      }

      setTemplateForm(emptyTemplateForm());
      await fetchTemplates();
      setActionMessage("Template created");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create template"
      );
    } finally {
      setCreatingTemplate(false);
    }
  }

  async function handleCreatePaymentFromTemplate(templateId: string) {
    setBusyTemplateId(templateId);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/payments/from-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: templateId,
          billing_month: billingMonth,
        }),
      });
      const payload = (await response.json()) as ApiResponse<Payment>;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create payment");
      }

      setActionMessage("Payment created");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create payment"
      );
    } finally {
      setBusyTemplateId(null);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to logout");
      setLoggingOut(false);
    }
  }

  function renderSummaryCard(title: string, values: SummaryValues) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Total</span>
            <span className="font-medium text-slate-900">
              {formatCurrency(values.total)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Paid</span>
            <span className="font-medium text-emerald-700">
              {formatCurrency(values.paid)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Remaining</span>
            <span className="font-medium text-amber-700">
              {formatCurrency(values.remaining)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Budget App
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                {mode === "payments" ? "Monthly Dashboard" : "Template Library"}
              </h1>
            </div>

            <nav className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  mode === "payments"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                Payments
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </nav>
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {YEARS.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    selectedYear === year
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {MONTHS.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  onClick={() => setSelectedMonthIndex(index)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    selectedMonthIndex === index
                      ? "bg-sky-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {WEEK_BUTTONS.map((week) => (
                <button
                  key={week}
                  type="button"
                  onClick={() => setSelectedWeek(week)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    selectedWeek === week
                      ? "bg-amber-500 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {week}
                </button>
              ))}
            </div>
          </div>
        </section>

        {errorMessage ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {actionMessage ? (
          <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionMessage}
          </p>
        ) : null}

        {mode === "payments" ? (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-3">
              {renderSummaryCard("Bills", billsSummary)}
              {renderSummaryCard("Credits", creditsSummary)}
              {renderSummaryCard("Total", totalSummary)}
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Payments</h2>
                  <p className="text-sm text-slate-500">
                    Billing month: {billingMonth}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAddPaymentOpen((current) => !current)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  + Add Payment
                </button>
              </div>

              {addPaymentOpen ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <select
                      value={selectedTemplateId}
                      onChange={(event) => setSelectedTemplateId(event.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <option value="">Select template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name || "Unnamed template"}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleCreatePayment}
                      disabled={
                        !selectedTemplateId || busyTemplateId === selectedTemplateId
                      }
                      className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {busyTemplateId === selectedTemplateId
                        ? "Creating..."
                        : "Create payment"}
                    </button>
                  </div>
                </div>
              ) : null}

              {loadingPayments ? (
                <p className="mt-6 text-sm text-slate-500">Loading payments...</p>
              ) : visiblePayments.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">No payments found.</p>
              ) : (
                <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold">Type</th>
                        <th className="px-3 py-3 text-left font-semibold">Name</th>
                        <th className="px-3 py-3 text-left font-semibold">Due Date</th>
                        <th className="px-3 py-3 text-right font-semibold">Current Amount</th>
                        <th className="px-3 py-3 text-right font-semibold">Carry Over</th>
                        <th className="px-3 py-3 text-right font-semibold">Total Due</th>
                        <th className="px-3 py-3 text-right font-semibold">Paid</th>
                        <th className="px-3 py-3 text-center font-semibold">Confirm</th>
                        <th className="px-3 py-3 text-left font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {visiblePayments.map((payment) => (
                        <tr
                          key={payment.id}
                          className={`border-t border-slate-100 hover:bg-[#f3f4f6] ${getRowBackgroundClass(
                            payment.status
                          )}`}
                        >
                          <td className="px-3 py-3 text-slate-600">
                            {payment.kind || payment.category || "-"}
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-900">
                            {payment.name || "Unnamed payment"}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {formatDate(payment.due_date)}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-600">
                            {formatCurrency(payment.base_amount)}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-600">
                            {formatCurrency(getCarryOver())}
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-slate-900">
                            {formatCurrency(getTotalDue(payment))}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-600">
                            {formatCurrency(payment.actual_paid_total)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {payment.is_reviewed ? (
                              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                                Confirmed
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReview(payment.id)}
                                disabled={busyReviewId === payment.id}
                                className="rounded-lg border border-[#d1d5db] bg-transparent px-3 py-1.5 text-xs font-medium text-[#111827] disabled:opacity-60"
                              >
                                {busyReviewId === payment.id ? "Confirming..." : "Confirm"}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {Number(payment.remaining_amount ?? 0) === 0 ? (
                                <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                                  Paid
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePay(payment.id)}
                                  disabled={busyPaymentId === payment.id}
                                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                                >
                                  {busyPaymentId === payment.id ? "Paying..." : "Pay $5"}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled
                                className="rounded-lg border border-[#d1d5db] bg-transparent px-3 py-1.5 text-xs font-medium text-[#6b7280] opacity-60"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled
                                className="rounded-lg bg-[#dc2626] px-3 py-1.5 text-xs font-medium text-white opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Create Template</h2>
              <form onSubmit={handleCreateTemplate} className="mt-4 space-y-3">
                <input
                  value={templateForm.name}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
                <input
                  value={templateForm.category}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  placeholder="Category"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
                <input
                  value={templateForm.kind}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      kind: event.target.value,
                    }))
                  }
                  placeholder="Kind"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
                <input
                  value={templateForm.recurrence_type}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      recurrence_type: event.target.value,
                    }))
                  }
                  placeholder="Recurrence type"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={templateForm.due_day}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      due_day: event.target.value,
                    }))
                  }
                  placeholder="Due day"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={templateForm.base_amount}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      base_amount: event.target.value,
                    }))
                  }
                  placeholder="Base amount"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
                <button
                  type="submit"
                  disabled={creatingTemplate}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {creatingTemplate ? "Creating..." : "Create Template"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Templates</h2>
                  <p className="text-sm text-slate-500">
                    Create monthly payments for {billingMonth}
                  </p>
                </div>
              </div>

              {loadingTemplates ? (
                <p className="mt-6 text-sm text-slate-500">Loading templates...</p>
              ) : templates.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">No templates found.</p>
              ) : (
                <div className="mt-6 grid gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">
                            {template.name || "Unnamed template"}
                          </p>
                          <p className="text-sm text-slate-600">
                            Amount: {formatCurrency(template.base_amount)}
                          </p>
                          <p className="text-sm text-slate-600">
                            Recurrence: {template.recurrence_type || "Not set"}
                          </p>
                          <p className="text-sm text-slate-600">
                            Due day: {template.due_day ?? "Not set"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCreatePaymentFromTemplate(template.id)}
                          disabled={busyTemplateId === template.id}
                          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                        >
                          {busyTemplateId === template.id
                            ? "Creating..."
                            : "Create payment"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
