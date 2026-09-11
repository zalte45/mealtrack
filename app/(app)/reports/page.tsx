"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  reason: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
  actor: {
    name: string;
    email: string;
    role: string;
  } | null;
}

interface CustomerSearchOption {
  id: string;
  memberId4: string;
  name: string;
  mobile: string | null;
}

interface CustomerHistoryRecord {
  id: string;
  businessDate: string;
  consumedAt: string;
  mealType: string | null;
  status: "VALID" | "VOIDED";
  voidReason: string | null;
  subscription: {
    quota: number;
    plan?: { name: string } | null;
  };
  recordedBy: { name: string };
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"AUDIT_LOGS" | "CUSTOMER_LEDGER">("AUDIT_LOGS");

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  // Customer Ledger State
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerSearchOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerHistory, setCustomerHistory] = useState<CustomerHistoryRecord[]>([]);
  const [selectedCustomerMeta, setSelectedCustomerMeta] = useState<CustomerSearchOption | null>(null);

  // Date Range CSV State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: auditPage.toString(),
        limit: "20",
      });
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/reports/audit-logs?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load audit logs.");
        return;
      }

      setAuditLogs(data.auditLogs || []);
      setAuditTotal(data.total || 0);
      setAuditTotalPages(data.totalPages || 1);
    } catch {
      setError("Network error loading audit logs.");
    } finally {
      setIsLoading(false);
    }
  }, [auditPage, actionFilter]);

  useEffect(() => {
    if (activeTab === "AUDIT_LOGS") {
      let ignore = false;
      async function loadData() {
        await Promise.resolve();
        if (!ignore) {
          fetchAuditLogs();
        }
      }
      loadData();
      return () => {
        ignore = true;
      };
    }
  }, [activeTab, fetchAuditLogs]);

  // Customer Search & Fetch History
  async function handleSearchCustomers(q: string) {
    setCustomerSearch(q);
    if (!q.trim()) return;

    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q.trim())}&limit=5`);
      const data = await res.json();
      if (res.ok && data.customers) {
        setCustomers(data.customers);
      }
    } catch {
      // Silent search error
    }
  }

  async function handleSelectCustomer(customer: CustomerSearchOption) {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerMeta(customer);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/reports/customer-history?customerId=${customer.id}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load customer ledger history.");
        return;
      }

      setCustomerHistory(data.records || []);
    } catch {
      setError("Network error loading customer history.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleExportRangeCsv() {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    window.open(`/api/reports/export-csv?${params.toString()}`, "_blank");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Reports & Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Immutable audit trail & customer ledger history reports
          </p>
        </div>
      </div>

      {/* CSV Date Range Exporter Box */}
      <Card className="p-5 bg-amber-50/50 border border-amber-200">
        <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Date Range CSV Report
        </h3>
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <Input
              label="Start Business Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Input
              label="End Business Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button onClick={handleExportRangeCsv} className="h-10">
            Download CSV Report
          </Button>
        </div>
      </Card>

      {/* Main Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("AUDIT_LOGS")}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === "AUDIT_LOGS"
              ? "border-amber-600 text-amber-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Audit Log Viewer ({auditTotal})
        </button>
        <button
          onClick={() => setActiveTab("CUSTOMER_LEDGER")}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === "CUSTOMER_LEDGER"
              ? "border-amber-600 text-amber-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Customer Ledger History
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tab 1: Audit Log Viewer */}
      {activeTab === "AUDIT_LOGS" && (
        <Card className="overflow-hidden p-0">
          {/* Action Filter */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Filter Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setAuditPage(1);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
            >
              <option value="">All Actions</option>
              <option value="MEAL_RECORDED">MEAL_RECORDED</option>
              <option value="MEAL_VOIDED">MEAL_VOIDED</option>
              <option value="CUSTOMER_CREATED">CUSTOMER_CREATED</option>
              <option value="CUSTOMER_ARCHIVED">CUSTOMER_ARCHIVED</option>
              <option value="SUBSCRIPTION_CREATED">SUBSCRIPTION_CREATED</option>
              <option value="MEAL_PLAN_CREATED">MEAL_PLAN_CREATED</option>
            </select>
          </div>

          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Spinner size={24} />
              <p className="text-sm text-slate-500">Loading audit logs...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No audit log entries found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 pl-6">Timestamp</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Actor / User</th>
                      <th className="py-3.5 px-4">Target Entity</th>
                      <th className="py-3.5 px-4 pr-6">Reason / Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-3.5 px-4 pl-6 text-xs text-slate-600 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              log.action.includes("VOID")
                                ? "warning"
                                : log.action.includes("CREATED")
                                ? "success"
                                : "primary"
                            }
                          >
                            {log.action}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-medium text-slate-800">
                          {log.actor ? `${log.actor.name} (${log.actor.role})` : "System"}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {log.entity} #{log.entityId.slice(-6)}
                        </td>

                        <td className="py-3.5 px-4 pr-6 text-xs text-slate-500">
                          {log.reason || (log.metadata ? JSON.stringify(log.metadata) : "N/A")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {auditTotalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-500">
                    Page <span className="font-medium text-slate-900">{auditPage}</span> of{" "}
                    <span className="font-medium text-slate-900">{auditTotalPages}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={auditPage >= auditTotalPages}
                      onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Tab 2: Customer Ledger History */}
      {activeTab === "CUSTOMER_LEDGER" && (
        <div className="space-y-6">
          <Card className="p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Search Customer by Member ID or Name
            </label>
            <Input
              placeholder="e.g. 1001 or Rahul..."
              value={customerSearch}
              onChange={(e) => handleSearchCustomers(e.target.value)}
            />

            {customers.length > 0 && !selectedCustomerId && (
              <div className="mt-3 divide-y divide-slate-100 border rounded-xl overflow-hidden bg-white shadow-xs">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="w-full p-3 text-left hover:bg-amber-50 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                        #{c.memberId4}
                      </span>
                      <span className="font-semibold text-slate-900">{c.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">Select Customer →</span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {selectedCustomerMeta && (
            <Card className="p-0 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-lg">
                    #{selectedCustomerMeta.memberId4}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{selectedCustomerMeta.name}</h3>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setSelectedCustomerId("")}>
                  Change Customer
                </Button>
              </div>

              {isLoading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-2">
                  <Spinner size={20} />
                  <p className="text-xs text-slate-500">Loading ledger history...</p>
                </div>
              ) : customerHistory.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No meal consumption history recorded for this customer.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 pl-6">Business Date</th>
                        <th className="py-3.5 px-4">Time (Local)</th>
                        <th className="py-3.5 px-4">Meal Type</th>
                        <th className="py-3.5 px-4">Plan Name</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 pr-6">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerHistory.map((r) => (
                        <tr key={r.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-3.5 px-4 pl-6 text-xs font-mono font-medium text-slate-800">
                            {r.businessDate}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            {new Date(r.consumedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {r.mealType || "Standard"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            {r.subscription.plan?.name || "Custom Subscription"}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant={r.status === "VALID" ? "success" : "neutral"}>
                              {r.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 pr-6 text-xs text-slate-600">
                            {r.recordedBy.name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
