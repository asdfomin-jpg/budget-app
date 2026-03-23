"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";

type DashboardMode = "payments" | "templates";

type DashboardClientProps = {
  mode: DashboardMode;
};

type Payment = {
  id: string;
  name: string | null;
  base_amount: number | null;
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

type TemplateFormState = {
  name: string;
  category: string;
  kind: string;
  recurrence_type: string;
  due_day: string;
  base_amount: string;
};

function getBillingMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
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

export default function DashboardClient({ mode }: DashboardClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const billingMonth = useMemo(() => getBillingMonth(), []);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(mode === "payments");
  const [loadingTemplates, setLoadingTemplates] = useState(mode === "templates");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(
    emptyTemplateForm()
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

      setTemplates(Array.isArray(payload.data) ? payload.data : []);
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

    if (mode === "payments") {
      void fetchPayments();
      return;
    }

    void fetchTemplates();
  }, [mode, billingMonth]);

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

  async function handleCreatePayment(templateId: string) {
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
      router.push("/");
      router.refresh();
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

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center gap-3 border-b border-black/10 pb-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded border border-black/15 px-3 py-2 text-sm"
        >
          Payments
        </button>
        <button
          type="button"
          onClick={() => router.push("/templates")}
          className="rounded border border-black/15 px-3 py-2 text-sm"
        >
          Templates
        </button>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded border border-black/15 px-3 py-2 text-sm disabled:opacity-60"
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </header>

      {errorMessage ? (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {actionMessage ? (
        <p className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {actionMessage}
        </p>
      ) : null}

      {mode === "payments" ? (
        <section className="space-y-3">
          <h1 className="text-xl font-semibold">Payments</h1>
          <p className="text-sm text-black/70">Billing month: {billingMonth}</p>

          {loadingPayments ? (
            <p className="text-sm">Loading payments...</p>
          ) : payments.length === 0 ? (
            <p className="text-sm">No payments found.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <article
                  key={payment.id}
                  className="rounded border border-black/10 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{payment.name || "Unnamed payment"}</p>
                      <p className="text-sm text-black/70">
                        Amount: {formatCurrency(payment.base_amount)}
                      </p>
                      <p className="text-sm text-black/70">
                        Remaining: {formatCurrency(payment.remaining_amount)}
                      </p>
                      <p className="text-sm text-black/70">
                        Status: {payment.status || "unknown"}
                      </p>
                      <p className="text-sm text-black/70">
                        Reviewed: {payment.is_reviewed ? "Yes" : "No"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handlePay(payment.id)}
                        disabled={busyPaymentId === payment.id}
                        className="rounded border border-black/15 px-3 py-2 text-sm disabled:opacity-60"
                      >
                        {busyPaymentId === payment.id ? "Paying..." : "Pay $5"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(payment.id)}
                        disabled={
                          busyReviewId === payment.id || Boolean(payment.is_reviewed)
                        }
                        className="rounded border border-black/15 px-3 py-2 text-sm disabled:opacity-60"
                      >
                        {busyReviewId === payment.id ? "Reviewing..." : "Review"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-xl font-semibold">Templates</h1>
            <form
              onSubmit={handleCreateTemplate}
              className="grid gap-3 rounded border border-black/10 p-4 md:grid-cols-2"
            >
              <input
                value={templateForm.name}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Name"
                className="rounded border border-black/15 px-3 py-2 text-sm"
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
                className="rounded border border-black/15 px-3 py-2 text-sm"
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
                className="rounded border border-black/15 px-3 py-2 text-sm"
              />
              <input
                value={templateForm.recurrence_type}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    recurrence_type: event.target.value,
                  }))
                }
                placeholder="Recurrence"
                className="rounded border border-black/15 px-3 py-2 text-sm"
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
                className="rounded border border-black/15 px-3 py-2 text-sm"
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
                className="rounded border border-black/15 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={creatingTemplate}
                className="rounded border border-black/15 px-3 py-2 text-sm disabled:opacity-60 md:col-span-2 md:w-fit"
              >
                {creatingTemplate ? "Creating..." : "Create Template"}
              </button>
            </form>
          </div>

          <div className="space-y-3">
            {loadingTemplates ? (
              <p className="text-sm">Loading templates...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm">No templates found.</p>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <article
                    key={template.id}
                    className="rounded border border-black/10 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{template.name || "Unnamed template"}</p>
                        <p className="text-sm text-black/70">
                          Amount: {formatCurrency(template.base_amount)}
                        </p>
                        <p className="text-sm text-black/70">
                          Recurrence: {template.recurrence_type || "Not set"}
                        </p>
                        <p className="text-sm text-black/70">
                          Due day: {template.due_day ?? "Not set"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCreatePayment(template.id)}
                        disabled={busyTemplateId === template.id}
                        className="rounded border border-black/15 px-3 py-2 text-sm disabled:opacity-60"
                      >
                        {busyTemplateId === template.id
                          ? "Creating..."
                          : "Create payment"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
