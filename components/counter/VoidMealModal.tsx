"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/Button";

interface VoidMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mealRecord: {
    id: string;
    customerName: string;
    memberId4: string;
  } | null;
}

export function VoidMealModal({
  isOpen,
  onClose,
  onSuccess,
  mealRecord,
}: VoidMealModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !mealRecord) return null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mealRecord) return;
    setError(null);

    if (reason.trim().length < 3) {
      setError("Please enter a reason for voiding (at least 3 characters).");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/counter/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealRecordId: mealRecord.id,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to void meal record.");
        return;
      }

      setReason("");
      onSuccess();
      onClose();
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Void Meal Record</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Correct record for #{mealRecord.memberId4} — {mealRecord.customerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-600">
            Voiding this entry restores <strong>1 meal</strong> back to the customer&apos;s active entitlement. This action will be recorded in the audit log.
          </p>

          <div>
            <label htmlFor="void-reason" className="block text-sm font-medium text-slate-700 mb-1.5">
              Reason for Void <span className="text-red-500">*</span>
            </label>
            <textarea
              id="void-reason"
              rows={3}
              required
              placeholder="e.g. Wrong Member ID entered, duplicate tap, customer canceled meal..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isSubmitting}>
              Void Meal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
