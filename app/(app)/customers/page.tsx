"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { CustomerFormModal, CustomerFormData } from "@/components/customers/CustomerFormModal";
import { CustomerDetailModal, CustomerDetail } from "@/components/customers/CustomerDetailModal";

interface CustomerApiItem {
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerApiItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ACTIVE");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedFormCustomer, setSelectedFormCustomer] = useState<CustomerFormData | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDetailCustomer, setSelectedDetailCustomer] = useState<CustomerDetail | null>(null);

  const fetchCustomers = useCallback(async () => {
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

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load customers.");
        return;
      }

      setCustomers(data.customers || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError("A network error occurred while loading customers.");
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      await Promise.resolve();
      if (!ignore) {
        fetchCustomers();
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [fetchCustomers]);

  async function handleArchiveCustomer(customer: CustomerDetail) {
    if (
      !confirm(
        `Are you sure you want to archive customer ${customer.name} (#${customer.memberId4})?\n\nThis will mark them as archived while preserving their historical meal records.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to archive customer.");
        return;
      }

      fetchCustomers();
    } catch {
      alert("A network error occurred.");
    }
  }

  function handleOpenCreate() {
    setSelectedFormCustomer(null);
    setIsFormOpen(true);
  }

  function handleOpenEdit(customer: CustomerApiItem) {
    setSelectedFormCustomer({
      id: customer.id,
      memberId4: customer.memberId4,
      name: customer.name,
      mobile: customer.mobile || "",
      notes: customer.notes || "",
      status: customer.status,
    });
    setIsFormOpen(true);
  }

  function handleOpenDetail(customer: CustomerApiItem) {
    setSelectedDetailCustomer(customer);
    setIsDetailOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Top Header / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage subscribers and sequential 4-digit Member IDs ({total} total)
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="w-full sm:w-auto flex items-center justify-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Customer
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            {(["ACTIVE", "ALL", "ARCHIVED"] as const).map((tab) => (
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
                {tab === "ACTIVE" ? "Active Customers" : tab === "ALL" ? "All Customers" : "Archived"}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full md:w-72">
            <Input
              placeholder="Search ID, name, or mobile..."
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

      {/* Data Table View */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner size={24} />
            <p className="text-sm text-slate-500">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">No customers found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No customers matched "${searchQuery}". Try clearing the search.`
                : "No customers created yet. Click 'Add Customer' to create your first subscriber."}
            </p>
            {searchQuery && (
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 pl-6">Member ID</th>
                    <th className="py-3.5 px-4">Customer Name</th>
                    <th className="py-3.5 px-4">Mobile</th>
                    <th className="py-3.5 px-4">Active Plan</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-4 px-4 pl-6 font-mono font-bold text-amber-900">
                        <span className="bg-amber-100/80 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200/50">
                          #{c.memberId4}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-900">
                        <button
                          onClick={() => handleOpenDetail(c)}
                          className="hover:text-amber-700 hover:underline text-left font-semibold"
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {c.mobile ? (
                          <a href={`tel:${c.mobile}`} className="hover:text-amber-700">
                            {c.mobile}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {c.activeSubscription ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">
                              {c.activeSubscription.planName}
                            </span>
                            <Badge variant="warning">
                              {c.activeSubscription.remainingMeals} Left
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            No Active Subscription
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={c.status === "ACTIVE" ? "success" : "neutral"}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(c)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            title="Quick View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                            title="Edit Customer"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {c.status === "ACTIVE" && (
                            <button
                              onClick={() => handleArchiveCustomer(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Archive Customer"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="21 8 21 21 3 21 3 8" />
                                <rect x="1" y="3" width="22" height="5" />
                                <line x1="10" y1="12" x2="14" y2="12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100">
              {customers.map((c) => (
                <div key={c.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                        #{c.memberId4}
                      </span>
                      <Badge variant={c.status === "ACTIVE" ? "success" : "neutral"}>
                        {c.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 text-slate-500 hover:text-amber-700"
                        title="Edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleOpenDetail(c)}
                        className="p-1.5 text-slate-500 hover:text-slate-900"
                        title="View"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900">{c.name}</h4>
                    {c.mobile && (
                      <p className="text-xs text-slate-500 mt-0.5">Mobile: {c.mobile}</p>
                    )}
                  </div>

                  {c.activeSubscription ? (
                    <div className="p-2.5 bg-amber-50 rounded-lg text-xs flex items-center justify-between border border-amber-200/60">
                      <span className="font-medium text-slate-800">{c.activeSubscription.planName}</span>
                      <span className="font-bold text-amber-900">
                        {c.activeSubscription.remainingMeals} meals left
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No active meal subscription</p>
                  )}
                </div>
              ))}
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
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchCustomers}
        initialData={selectedFormCustomer}
      />

      <CustomerDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(customer) => {
          setSelectedFormCustomer({
            id: customer.id,
            memberId4: customer.memberId4,
            name: customer.name,
            mobile: customer.mobile || "",
            notes: customer.notes || "",
            status: customer.status,
          });
          setIsFormOpen(true);
        }}
        onArchive={handleArchiveCustomer}
        customer={selectedDetailCustomer}
      />
    </div>
  );
}
