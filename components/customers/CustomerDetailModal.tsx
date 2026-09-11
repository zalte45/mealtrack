"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface CustomerDetail {
  id: string;
  memberId4: string;
  name: string;
  mobile: string | null;
  notes: string | null;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  activeSubscription?: {
    id: string;
    planName: string;
    quota: number;
    usedMeals: number;
    remainingMeals: number;
    status: string;
    endDate: string | null;
  } | null;
}

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (customer: CustomerDetail) => void;
  onArchive: (customer: CustomerDetail) => void;
  onNewSubscription?: (customer: CustomerDetail) => void;
  customer: CustomerDetail | null;
}

export function CustomerDetailModal({
  isOpen,
  onClose,
  onEdit,
  onArchive,
  onNewSubscription,
  customer,
}: CustomerDetailModalProps) {
  if (!isOpen || !customer) return null;

  const sub = customer.activeSubscription;
  const progressPercent = sub ? Math.min(100, Math.round((sub.usedMeals / sub.quota) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-lg border border-amber-200/60">
              #{customer.memberId4}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{customer.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={customer.status === "ACTIVE" ? "success" : "neutral"}>
                  {customer.status}
                </Badge>
                <span className="text-xs text-slate-400">
                  Joined {new Date(customer.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
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

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Contact & Details
            </h3>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Mobile Phone</span>
                {customer.mobile ? (
                  <a
                    href={`tel:${customer.mobile}`}
                    className="font-medium text-amber-700 hover:underline flex items-center gap-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {customer.mobile}
                  </a>
                ) : (
                  <span className="text-slate-400 italic">Not provided</span>
                )}
              </div>
              <div className="text-sm border-t border-slate-200/60 pt-2">
                <span className="text-slate-500 block mb-1">Notes & Preferences</span>
                <p className="text-slate-700 text-sm whitespace-pre-wrap">
                  {customer.notes || <span className="text-slate-400 italic">No notes added.</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Active Subscription Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Meal Subscription
              </h3>
              {onNewSubscription && customer.status === "ACTIVE" && (
                <button
                  onClick={() => {
                    onClose();
                    onNewSubscription(customer);
                  }}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                >
                  + Renew / Add Subscription
                </button>
              )}
            </div>
            {sub ? (
              <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-sm">{sub.planName}</span>
                  <Badge variant="warning">{sub.remainingMeals} Meals Left</Badge>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                    <span>Consumed: {sub.usedMeals} / {sub.quota}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <p className="text-sm text-slate-500 mb-2">No active meal subscription.</p>
                {onNewSubscription && customer.status === "ACTIVE" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onClose();
                      onNewSubscription(customer);
                    }}
                  >
                    Create First Subscription
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
          {customer.status === "ACTIVE" && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onClose();
                onArchive(customer);
              }}
            >
              Archive
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onEdit(customer);
              }}
            >
              Edit Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
