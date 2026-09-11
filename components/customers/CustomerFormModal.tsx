"use client";

import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

export interface CustomerFormData {
  id?: string;
  memberId4: string;
  name: string;
  mobile: string;
  notes: string;
  status?: "ACTIVE" | "ARCHIVED";
}

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: CustomerFormData | null; // Null for Create, object for Edit
}

export function CustomerFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: CustomerFormModalProps) {
  const isEdit = Boolean(initialData?.id);

  const [memberId4, setMemberId4] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

  const [isFetchingId, setIsFetchingId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data or fetch suggested Member ID when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;

    async function initForm() {
      // Defer synchronous resets to avoid cascading re-render warning
      await Promise.resolve();
      if (!isSubscribed) return;

      setError(null);

      if (isEdit && initialData) {
        setMemberId4(initialData.memberId4 || "");
        setName(initialData.name || "");
        setMobile(initialData.mobile || "");
        setNotes(initialData.notes || "");
        setStatus(initialData.status || "ACTIVE");
      } else {
        setName("");
        setMobile("");
        setNotes("");
        setStatus("ACTIVE");
        fetchSuggestedMemberId();
      }
    }

    initForm();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, initialData, isEdit]);

  async function fetchSuggestedMemberId() {
    setIsFetchingId(true);
    try {
      const res = await fetch("/api/customers/suggest-id");
      const data = await res.json();
      if (res.ok && data.suggestedId) {
        setMemberId4(data.suggestedId);
      }
    } catch {
      // Fallback: leave empty if fetch fails
    } finally {
      setIsFetchingId(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Basic client-side validation
    if (!isEdit && (!memberId4 || !/^\d{4}$/.test(memberId4))) {
      setError("Member ID must be exactly 4 numeric digits (1000–9999).");
      return;
    }

    if (!name.trim()) {
      setError("Customer name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEdit ? `/api/customers/${initialData?.id}` : "/api/customers";
      const method = isEdit ? "PATCH" : "POST";

      const payload = isEdit
        ? { name: name.trim(), mobile: mobile.trim() || undefined, notes: notes.trim() || undefined, status }
        : { memberId4: memberId4.trim(), name: name.trim(), mobile: mobile.trim() || undefined, notes: notes.trim() || undefined };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save customer details.");
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
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 id="customer-modal-title" className="text-lg font-semibold text-slate-900">
              {isEdit ? "Edit Customer" : "Add New Customer"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? `Updating details for Member #${initialData?.memberId4}`
                : "Register a new subscriber to MealTrack"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2.5">
              <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Member ID Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="modal-member-id" className="block text-sm font-medium text-slate-700">
                4-Digit Member ID <span className="text-red-500">*</span>
              </label>
              {!isEdit && (
                <button
                  type="button"
                  onClick={fetchSuggestedMemberId}
                  disabled={isFetchingId}
                  className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  {isFetchingId ? <Spinner size={14} /> : "Auto-Suggest Next ID"}
                </button>
              )}
            </div>
            <Input
              id="modal-member-id"
              type="text"
              maxLength={4}
              placeholder="e.g. 1001"
              value={memberId4}
              onChange={(e) => setMemberId4(e.target.value.replace(/\D/g, ""))}
              disabled={isEdit || isFetchingId}
              helper={
                isEdit
                  ? "Member IDs are permanent identifiers and cannot be changed."
                  : "Unique 4-digit ID assigned to customer (1000–9999)."
              }
              required
            />
          </div>

          {/* Name Field */}
          <Input
            id="modal-customer-name"
            label="Customer Name"
            type="text"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {/* Mobile Field */}
          <Input
            id="modal-customer-mobile"
            label="Mobile Number"
            type="tel"
            placeholder="e.g. +91 98765 43210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            helper="Optional — used for customer identification."
          />

          {/* Notes Field */}
          <div>
            <label htmlFor="modal-customer-notes" className="block text-sm font-medium text-slate-700 mb-1.5">
              Dietary Preferences & Notes
            </label>
            <textarea
              id="modal-customer-notes"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              placeholder="e.g. Jain food only, low spicy, prefers lunch delivery..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Status (Edit Mode Only) */}
          {isEdit && (
            <div>
              <label htmlFor="modal-customer-status" className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                id="modal-customer-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "ACTIVE" | "ARCHIVED")}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              >
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived (Inactive)</option>
              </select>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? "Save Changes" : "Create Customer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
