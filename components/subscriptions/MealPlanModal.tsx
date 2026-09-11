"use client";

import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface MealPlanFormData {
  id?: string;
  name: string;
  quota: number;
  mealsPerDay: number;
  validityDays: number | null;
  price: number;
  status?: "ACTIVE" | "ARCHIVED";
}

interface MealPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: MealPlanFormData | null;
}

export function MealPlanModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: MealPlanModalProps) {
  const isEdit = Boolean(initialData?.id);

  const [name, setName] = useState("");
  const [quota, setQuota] = useState(30);
  const [mealsPerDay, setMealsPerDay] = useState(1);
  const [validityDays, setValidityDays] = useState<number | "">(30);
  const [price, setPrice] = useState(3000);
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;

    async function initForm() {
      await Promise.resolve();
      if (!isSubscribed) return;

      setError(null);
      if (isEdit && initialData) {
        setName(initialData.name || "");
        setQuota(initialData.quota || 30);
        setMealsPerDay(initialData.mealsPerDay || 1);
        setValidityDays(initialData.validityDays ?? "");
        setPrice(initialData.price || 0);
        setStatus(initialData.status || "ACTIVE");
      } else {
        setName("");
        setQuota(30);
        setMealsPerDay(1);
        setValidityDays(30);
        setPrice(3000);
        setStatus("ACTIVE");
      }
    }

    initForm();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, initialData, isEdit]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Plan name is required.");
      return;
    }

    if (quota <= 0) {
      setError("Meal quota must be at least 1 meal.");
      return;
    }

    if (price < 0) {
      setError("Price cannot be negative.");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEdit ? `/api/meal-plans/${initialData?.id}` : "/api/meal-plans";
      const method = isEdit ? "PATCH" : "POST";

      const payload = {
        name: name.trim(),
        quota: Number(quota),
        mealsPerDay: Number(mealsPerDay),
        validityDays: validityDays === "" ? null : Number(validityDays),
        price: Number(price),
        ...(isEdit && { status }),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save meal plan.");
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEdit ? "Edit Meal Plan Template" : "Create Meal Plan Template"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configurable meal package for subscribers
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <Input
            id="plan-name"
            label="Plan Name"
            placeholder="e.g. Monthly 30 Meal Plan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="plan-quota"
              label="Meal Quota (Total)"
              type="number"
              min={1}
              value={quota}
              onChange={(e) => setQuota(parseInt(e.target.value) || 0)}
              helper="Total meals credited"
              required
            />

            <Input
              id="plan-validity"
              label="Validity (Days)"
              type="number"
              min={1}
              placeholder="e.g. 30 (or blank)"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value === "" ? "" : parseInt(e.target.value))}
              helper="Blank = no calendar expiry"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="plan-price"
              label="Price (₹)"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              required
            />

            <Input
              id="plan-meals-per-day"
              label="Max Meals / Day"
              type="number"
              min={1}
              max={10}
              value={mealsPerDay}
              onChange={(e) => setMealsPerDay(parseInt(e.target.value) || 1)}
              required
            />
          </div>

          {isEdit && (
            <div>
              <label htmlFor="plan-status" className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                id="plan-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "ACTIVE" | "ARCHIVED")}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="ACTIVE">Active (Available for new subscriptions)</option>
                <option value="ARCHIVED">Archived (Hidden from dropdown)</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? "Save Changes" : "Create Plan Template"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
