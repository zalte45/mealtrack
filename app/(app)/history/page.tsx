"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { VoidMealModal } from "@/components/counter/VoidMealModal";

interface RegisterRecord {
  id: string;
  businessDate: string;
  consumedAt: string;
  mealType: string | null;
  status: "VALID" | "VOIDED";
  voidReason: string | null;
  customer: {
    id: string;
    memberId4: string;
    name: string;
    mobile: string | null;
  };
  subscription: {
    quota: number;
    plan?: { name: string } | null;
  };
  recordedBy: { name: string };
  voidedBy?: { name: string } | null;
}

interface RegisterSummary {
  businessDate: string;
  totalValidMeals: number;
  totalVoidedMeals: number;
  totalTransactions: number;
  mealTypeBreakdown: Record<string, number>;
}

export default function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [records, setRecords] = useState<RegisterRecord[]>([]);
  const [summary, setSummary] = useState<RegisterSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [statusFilter, setStatusFilter] = useState<"ALL" | "VALID" | "VOIDED">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVoidRecord, setSelectedVoidRecord] = useState<{
    id: string;
    customerName: string;
    memberId4: string;
  } | null>(null);

  const fetchRegister = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        page: page.toString(),
        limit: "15",
        status: statusFilter,
      });

      const res = await fetch(`/api/reports/daily-register?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load register.");
        return;
      }

      setRecords(data.records || []);
      setSummary(data.summary || null);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError("A network error occurred while loading daily register.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, page, statusFilter]);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      await Promise.resolve();
      if (!ignore) {
        fetchRegister();
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [fetchRegister]);

  function handleExportCsv() {
    window.open(
      `/api/reports/export-csv?startDate=${selectedDate}&endDate=${selectedDate}&status=${statusFilter}`,
      "_blank"
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Daily Operational Register
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time meal activity log & ledger audit for {selectedDate} ({total} entries)
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={handleExportCsv}
          className="w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV Register
        </Button>
      </div>

      {/* Daily Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-l-green-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Valid Meals Consumed
          </span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">
            {summary?.totalValidMeals ?? 0}{" "}
            <span className="text-sm font-normal text-slate-500">meals</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Counts towards active entitlement</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Voided / Corrected
          </span>
          <div className="text-3xl font-extrabold text-amber-900 mt-1">
            {summary?.totalVoidedMeals ?? 0}{" "}
            <span className="text-sm font-normal text-slate-500">voids</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Restored to customer balances</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-indigo-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Transactions
          </span>
          <div className="text-3xl font-extrabold text-indigo-900 mt-1">
            {summary?.totalTransactions ?? 0}{" "}
            <span className="text-sm font-normal text-slate-500">events</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Total ledger activity count</p>
        </Card>
      </div>

      {/* Filter & Date Selector Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            {(["ALL", "VALID", "VOIDED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setStatusFilter(tab);
                  setPage(1);
                }}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === tab
                    ? "bg-white text-amber-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "ALL" ? "All Entries" : tab === "VALID" ? "Valid Meals Only" : "Voided Only"}
              </button>
            ))}
          </div>

          <div className="w-full md:w-56">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
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

      {/* Register Data Table */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner size={24} />
            <p className="text-sm text-slate-500">Loading daily register...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-base font-semibold text-slate-900">No activity found</h3>
            <p className="text-sm text-slate-500 mt-1">
              No meal records exist for {selectedDate} with the selected status.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 pl-6">Member ID & Customer</th>
                    <th className="py-3.5 px-4">Time (Local)</th>
                    <th className="py-3.5 px-4">Meal Type</th>
                    <th className="py-3.5 px-4">Subscription Plan</th>
                    <th className="py-3.5 px-4">Recorded By</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-amber-50/30 transition-colors ${
                        r.status === "VOIDED" ? "bg-slate-50/60" : ""
                      }`}
                    >
                      <td className="py-4 px-4 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200/50">
                            #{r.customer.memberId4}
                          </span>
                          <span className="font-semibold text-slate-900">{r.customer.name}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs font-medium text-slate-700">
                        {new Date(r.consumedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {r.mealType || "Standard"}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-600">
                        {r.subscription.plan?.name || "Custom Subscription"}
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-600">
                        {r.recordedBy.name}
                      </td>

                      <td className="py-4 px-4">
                        <Badge variant={r.status === "VALID" ? "success" : "neutral"}>
                          {r.status}
                        </Badge>
                        {r.status === "VOIDED" && r.voidReason && (
                          <span className="block text-[11px] text-slate-400 mt-0.5 italic max-w-xs truncate">
                            Reason: {r.voidReason}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 pr-6 text-right">
                        {r.status === "VALID" ? (
                          <button
                            onClick={() =>
                              setSelectedVoidRecord({
                                id: r.id,
                                customerName: r.customer.name,
                                memberId4: r.customer.memberId4,
                              })
                            }
                            className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline"
                          >
                            Void Meal
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Voided</span>
                        )}
                      </td>
                    </tr>
                  ))}
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

      {/* Void Modal */}
      <VoidMealModal
        isOpen={Boolean(selectedVoidRecord)}
        onClose={() => setSelectedVoidRecord(null)}
        onSuccess={fetchRegister}
        mealRecord={selectedVoidRecord}
      />
    </div>
  );
}
