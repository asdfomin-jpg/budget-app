"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";

const BILLING_MONTH = "2026-03-01";

type Payment = {
  id: string;
  name: string | null;
  base_amount: number | null;
  remaining_amount: number | null;
  status: string | null;
};

type Template = {
  id: string;
  name: string | null;
  base_amount: number | null;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default function DashboardClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [activeView, setActiveView] = useState<"payments" | "templates">("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  async function fetchPayments() {
    setLoadingPayments(true);

    try {
      const response = await fetch(`/api/payments?billingMonth=${BILLING_MONTH}`, {
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
    void fetchPayments();
    void fetchTemplates();
  }, []);

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
          billing_month: BILLING_MONTH,
        }),
      });

      const payload = (await response.json()) as ApiResponse<Payment>;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create payment");
      }

      await fetchPayments();
      setActionMessage("Payment created");
      setActiveView("payments");
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

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center gap-3 border-b border-black/10 pb-4">
        <button
          type="button"
          onClick={() => setActiveView("payments")}
          className="rounded border border-black/15 px-3 py-2 text-sm"
        >
          Payments
        </button>
        <button
          type="button"
          onClick={() => setActiveView("templates")}
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

      {activeView === "payments" ? (
        <section className="space-y-3">
          <h1 className="text-xl font-semibold">Payments</h1>
          <p className="text-sm text-black/70">Billing month: {BILLING_MONTH}</p>

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
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePay(payment.id)}
                      disabled={busyPaymentId === payment.id}
                      className="rounded border border-black/15 px-3 py-2 text-sm disabled:opacity-60"
                    >
                      {busyPaymentId === payment.id ? "Paying..." : "Pay $5"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <h1 className="text-xl font-semibold">Templates</h1>

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
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCreatePayment(template.id)}
                      disabled={busyTemplateId === template.id}
                      className="rounded border border-black/15 px-3 py-2 text-sm disabled:opacity-60"
                    >
                      {busyTemplateId === template.id
                        ? "Creating..."
                        : "Create Payment"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
