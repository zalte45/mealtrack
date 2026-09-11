"use client";

import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { calculateEndDate } from "@/lib/subscription-helpers";

interface MealPlanOption {
  id: string;
  name: string;
  quota: number;
  validityDays: number | null;
  price: number;
  mealsPerDay: number;
}

interface CustomerOption {
  id: string;
  memberId4: string;
  name: string;
}

interface SubscriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedCustomer?: CustomerOption | null;
}

export function SubscriptionFormModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedCustomer,
}: SubscriptionFormModalProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlanOption[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [quota, setQuota] = useState(30);
  const [validityDays, setValidityDays] = useState<number | "">(30);
  const [price, setPrice] = useState(3000);
  const [mealsPerDay, setMealsPerDay] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "PENDING" | "PARTIAL">("PAID");
  const [notes, setNotes] = useState("");

  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active customers & active meal plans when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;

    async function loadOptions() {
      setIsLoadingOptions(true);
      setError(null);

      // Default start date to today
      setStartDate(new Date().toISOString().split("T")[0]);

      if (preselectedCustomer) {
        setSelectedCustomerId(preselectedCustomer.id);
      }

      try {
        const [custRes, planRes] = await Promise.all([
          fetch("/api/customers?status=ACTIVE&limit=100"),
          fetch("/api/meal-plans"),
        ]);

        const custData = await custRes.json();
        const planData = await planRes.json();

        if (isSubscribed) {
          if (custRes.ok) {
            setCustomers(custData.customers || []);
            if (!preselectedCustomer && custData.customers?.length > 0) {
              setSelectedCustomerId(custData.customers[0].id);
            }
          }
          if (planRes.ok) {
            setMealPlans(planData.mealPlans || []);
            if (planData.mealPlans?.length > 0) {
              applyPlanTemplate(planData.mealPlans[0]);
            }
          }
        }
      } catch {
        if (isSubscribed) {
          setError("Failed to load options.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, preselectedCustomer]);

  function applyPlanTemplate(plan: MealPlanOption) {
    setSelectedPlanId(plan.id);
    setQuota(plan.quota);
    setValidityDays(plan.validityDays ?? "");
    setPrice(plan.price);
    setMealsPerDay(plan.mealsPerDay || 1);
  }

  function handlePlanSelect(planId: string) {
    setSelectedPlanId(planId);
    if (!planId) return;

    const plan = mealPlans.find((p) => p.id === planId);
    if (plan) {
      applyPlanTemplate(plan);
    }
  }

  const computedEndDate = calculateEndDate(
    startDate,
    validityDays === "" ? null : Number(validityDays)
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedCustomerId) {
      setError("Please select a customer.");
      return;
    }

    if (quota <= 0) {
      setError("Meal quota must be at least 1 meal.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerId: selectedCustomerId,
        planId: selectedPlanId || undefined,
        startDate,
        endDate: computedEndDate || undefined,
        quota: Number(quota),
        mealsPerDay: Number(mealsPerDay),
        price: Number(price),
        paymentStatus,
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create subscription.");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">New Meal Subscription</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Issue meal quota and validity period to customer
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoadingOptions ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <Spinner size={20} />
              <p className="text-xs text-slate-500">Loading customers and plans...</p>
            </div>
          ) : (
            <>
              {/* Customer Selector */}
              <div>
                <label htmlFor="sub-customer" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Select Customer <span className="text-red-500">*</span>
                </label>
                {preselectedCustomer ? (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm font-semibold text-slate-900 flex items-center justify-between">
                    <span>{preselectedCustomer.name}</span>
                    <span className="font-mono text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                      #{preselectedCustomer.memberId4}
                    </span>
                  </div>
                ) : (
                  <select
                    id="sub-customer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.memberId4} — {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Plan Template Selector */}
              <div>
                <label htmlFor="sub-plan" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Meal Plan Template
                </label>
                <select
                  id="sub-plan"
                  value={selectedPlanId}
                  onChange={(e) => handlePlanSelect(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Custom Subscription (No template)</option>
                  {mealPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.quota} meals, {p.validityDays ? `${p.validityDays} days` : "No expiry"} — ₹{p.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Configurable Quota & Dates */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="sub-start-date"
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Calculated End Date
                  </label>
                  <div className="h-10 px-3.5 flex items-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono text-slate-700">
                    {computedEndDate || "No Expiry (Open)"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="sub-quota"
                  label="Meal Quota"
                  type="number"
                  min={1}
                  value={quota}
                  onChange={(e) => setQuota(parseInt(e.target.value) || 0)}
                  helper="Total meals credited"
                  required
                />

                <Input
                  id="sub-validity"
                  label="Validity (Days)"
                  type="number"
                  min={1}
                  placeholder="e.g. 30 (or blank)"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value === "" ? "" : parseInt(e.target.value))}
                  helper="Blank = no calendar limit"
                />
              </div>

              {/* Price & Payment Status */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="sub-price"
                  label="Price (₹)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  required
                />

                <div>
                  <label htmlFor="sub-payment-status" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Payment Status
                  </label>
                  <select
                    id="sub-payment-status"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as "PAID" | "PENDING" | "PARTIAL")}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="PAID">Paid</option>
                    <option value="PENDING">Pending (Unpaid)</option>
                    <option value="PARTIAL">Partial Payment</option>
                  </select>
                </div>
              </div>

              <Input
                id="sub-notes"
                label="Notes / Reference"
                placeholder="e.g. Paid cash, renewed for September"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={isLoadingOptions}>
              Create Subscription
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
