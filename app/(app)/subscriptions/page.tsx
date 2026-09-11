"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { SubscriptionFormModal } from "@/components/subscriptions/SubscriptionFormModal";
import { MealPlanModal } from "@/components/subscriptions/MealPlanModal";

interface SubscriptionApiItem {
  id: string;
  customerId: string;
  planId: string | null;
  startDate: string;
  endDate: string | null;
  quota: number;
  mealsPerDay: number;
  price: number;
  paymentStatus: "PENDING" | "PAID" | "PARTIAL";
  status: string;
  calculatedStatus: "ACTIVE" | "EXHAUSTED" | "EXPIRED" | "CANCELLED" | "PENDING_START";
  usedMeals: number;
  remainingMeals: number;
  customer: {
    id: string;
    memberId4: string;
    name: string;
    mobile: string | null;
  };
  plan?: {
    id: string;
    name: string;
  } | null;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionApiItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ALL" | "EXPIRED" | "CANCELLED">("ACTIVE");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        status: statusFilter,
      });

      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const res = await fetch(`/api/subscriptions?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load subscriptions.");
        return;
      }

      setSubscriptions(data.subscriptions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError("A network error occurred while loading subscriptions.");
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      await Promise.resolve();
      if (!ignore) {
        fetchSubscriptions();
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [fetchSubscriptions]);

  async function handleUpdatePaymentStatus(id: string, newStatus: "PAID" | "PENDING") {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update payment status.");
        return;
      }

      fetchSubscriptions();
    } catch {
      alert("Network error.");
    }
  }

  async function handleCancelSubscription(id: string, customerName: string) {
    if (
      !confirm(
        `Are you sure you want to cancel the subscription for ${customerName}?\n\nThis will mark the subscription as CANCELLED.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to cancel subscription.");
        return;
      }

      fetchSubscriptions();
    } catch {
      alert("Network error.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Subscription Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Active entitlements, quotas, and meal plan packages ({total} total)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsPlanModalOpen(true)}
            className="w-full sm:w-auto"
          >
            Manage Plan Templates
          </Button>
          <Button
            onClick={() => setIsSubModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Subscription
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            {(["ACTIVE", "ALL", "EXPIRED", "CANCELLED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setStatusFilter(tab);
                  setPage(1);
                }}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab
                    ? "bg-white text-amber-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "ACTIVE" ? "Active" : tab === "ALL" ? "All" : tab === "EXPIRED" ? "Expired" : "Cancelled"}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full md:w-72">
            <Input
              placeholder="Search Member ID or customer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </Card>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Subscription Table */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner size={24} />
            <p className="text-sm text-slate-500">Loading subscriptions...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">No subscriptions found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No subscriptions matched "${searchQuery}".`
                : "No subscriptions created yet. Click 'New Subscription' to issue a plan."}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 pl-6">Subscriber</th>
                    <th className="py-3.5 px-4">Plan & Quota Progress</th>
                    <th className="py-3.5 px-4">Validity</th>
                    <th className="py-3.5 px-4">Price / Payment</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((sub) => {
                    const percent = Math.min(100, Math.round((sub.usedMeals / sub.quota) * 100));
                    return (
                      <tr key={sub.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-4 px-4 pl-6">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200/50">
                              #{sub.customer.memberId4}
                            </span>
                            <span className="font-semibold text-slate-900">{sub.customer.name}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="w-48 space-y-1">
                            <div className="flex justify-between text-xs font-medium text-slate-700">
                              <span>{sub.plan?.name || "Custom Plan"}</span>
                              <span className="font-bold text-amber-900">{sub.remainingMeals} Left</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full transition-all"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {sub.usedMeals} consumed of {sub.quota} meals
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-600">
                          <div>Starts: {new Date(sub.startDate).toLocaleDateString()}</div>
                          <div>
                            Ends:{" "}
                            {sub.endDate ? (
                              new Date(sub.endDate).toLocaleDateString()
                            ) : (
                              <span className="text-slate-400 font-sans italic">No Expiry</span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-900">₹{sub.price}</div>
                          <Badge
                            variant={
                              sub.paymentStatus === "PAID"
                                ? "success"
                                : sub.paymentStatus === "PARTIAL"
                                ? "warning"
                                : "error"
                            }
                          >
                            {sub.paymentStatus}
                          </Badge>
                        </td>

                        <td className="py-4 px-4">
                          <Badge
                            variant={
                              sub.calculatedStatus === "ACTIVE"
                                ? "success"
                                : sub.calculatedStatus === "EXHAUSTED" || sub.calculatedStatus === "EXPIRED"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {sub.calculatedStatus}
                          </Badge>
                        </td>

                        <td className="py-4 px-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {sub.paymentStatus === "PENDING" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="text-xs text-green-700 border-green-200 hover:bg-green-50"
                                onClick={() => handleUpdatePaymentStatus(sub.id, "PAID")}
                              >
                                Mark Paid
                              </Button>
                            )}

                            {sub.calculatedStatus === "ACTIVE" && (
                              <Button
                                size="sm"
                                variant="danger"
                                className="text-xs"
                                onClick={() => handleCancelSubscription(sub.id, sub.customer.name)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  Page <span className="font-medium text-slate-900">{page}</span> of{" "}
                  <span className="font-medium text-slate-900">{totalPages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modals */}
      <SubscriptionFormModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        onSuccess={fetchSubscriptions}
      />

      <MealPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSuccess={fetchSubscriptions}
      />
    </div>
  );
}
