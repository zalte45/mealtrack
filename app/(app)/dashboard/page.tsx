"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { DashboardOverview } from "@/lib/dashboard-service";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to load dashboard data.");
        return;
      }

      setData(result);
    } catch {
      setError("A network error occurred while loading dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      await Promise.resolve();
      if (!ignore) {
        fetchDashboard();
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [fetchDashboard]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Date Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Operational Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            At-a-glance provider overview & active subscriber metrics
          </p>
        </div>

        {data && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100/80 text-amber-900 text-xs font-semibold border border-amber-200/60 self-start sm:self-auto">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Business Date: {data.businessDate}</span>
          </div>
        )}
      </div>

      {/* Primary Operational Action Shortcuts */}
      <Card className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-none shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold">Ready for Meal Transactions?</h2>
            <p className="text-xs text-amber-100">
              Fast 2–4 second 4-digit Member ID entry & single-tap meal recording
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/counter">
              <Button size="lg" className="bg-white text-amber-900 hover:bg-amber-50 font-extrabold shadow-md border-none">
                ⚡ Open Meal Counter
              </Button>
            </Link>
            <Link href="/customers">
              <Button variant="secondary" size="md" className="bg-amber-700/60 text-white hover:bg-amber-700 border-amber-400/40">
                + Add Customer
              </Button>
            </Link>
            <Link href="/subscriptions">
              <Button variant="secondary" size="md" className="bg-amber-700/60 text-white hover:bg-amber-700 border-amber-400/40">
                + New Subscription
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <Spinner size={28} />
          <p className="text-sm text-slate-500">Loading operational overview...</p>
        </div>
      ) : data ? (
        <>
          {/* Top 4 Operational Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border-l-4 border-l-green-500">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Today&apos;s Meals Served
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">
                {data.todayValidMeals}{" "}
                <span className="text-xs font-medium text-slate-500">valid</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Ledger consumption count
              </p>
            </Card>

            <Card className="p-5 border-l-4 border-l-amber-500">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Today&apos;s Voids / Corrected
              </span>
              <div className="text-3xl font-extrabold text-amber-900 mt-1">
                {data.todayVoidedMeals}{" "}
                <span className="text-xs font-medium text-slate-500">voids</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Restored to balances
              </p>
            </Card>

            <Card className="p-5 border-l-4 border-l-indigo-500">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Active Subscribers
              </span>
              <div className="text-3xl font-extrabold text-indigo-900 mt-1">
                {data.activeCustomersCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Registered customers
              </p>
            </Card>

            <Card className="p-5 border-l-4 border-l-purple-500">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Active Subscriptions
              </span>
              <div className="text-3xl font-extrabold text-purple-900 mt-1">
                {data.activeSubscriptionsCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Current active plans
              </p>
            </Card>
          </div>

          {/* Attention & Alert Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Balance Alert Banner */}
            <Card className="p-5 border border-amber-200 bg-amber-50/40 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Low Meal Balance ({data.lowBalanceSubscriptions.length})
                  </h3>
                </div>
                <span className="text-xs text-amber-800 font-semibold">≤ 3 Meals Remaining</span>
              </div>

              {data.lowBalanceSubscriptions.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No active subscribers with low meal balances.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {data.lowBalanceSubscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 bg-white rounded-xl border border-amber-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                          #{sub.memberId4}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900 block">{sub.customerName}</span>
                          <span className="text-slate-500 text-[11px]">{sub.planName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="warning">
                          {sub.remainingMeals} Left
                        </Badge>
                        <Link href="/subscriptions">
                          <Button size="sm" variant="secondary" className="text-xs py-1">
                            Renew
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Expiring Soon Alert Banner */}
            <Card className="p-5 border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Expiring Soon ({data.expiringSubscriptions.length})
                </h3>
                <span className="text-xs text-slate-500">Next 7 Days</span>
              </div>

              {data.expiringSubscriptions.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No subscriptions expiring within the next 7 days.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {data.expiringSubscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded">
                          #{sub.memberId4}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900 block">{sub.customerName}</span>
                          <span className="text-slate-500 text-[11px]">{sub.planName}</span>
                        </div>
                      </div>

                      <div className="text-right text-[11px]">
                        <span className="text-red-600 font-semibold block">Ends {sub.endDate}</span>
                        <span className="text-slate-500">{sub.remainingMeals} meals left</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Recent Activity Feed Section */}
          <Card className="p-5 border border-slate-200 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Recent Meal Activity Today
              </h3>
              <Link href="/history" className="text-xs font-semibold text-amber-700 hover:underline">
                View Full Operational Register →
              </Link>
            </div>

            {data.recentActivity.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No meals recorded yet today. Open the Meal Counter to begin.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentActivity.map((act) => (
                  <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md">
                        #{act.memberId4}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-900 block">{act.customerName}</span>
                        <span className="text-slate-400 text-[11px]">
                          {act.planName} • Recorded by {act.recordedBy}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-mono">
                        {new Date(act.consumedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <Badge variant={act.status === "VALID" ? "success" : "neutral"}>
                        {act.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
