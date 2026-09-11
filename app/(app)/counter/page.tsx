"use client";

import { useState, useEffect, useRef, FormEvent, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { VoidMealModal } from "@/components/counter/VoidMealModal";

interface CounterCustomer {
  id: string;
  memberId4: string;
  name: string;
  mobile: string | null;
  notes: string | null;
}

interface CounterSubscription {
  id: string;
  planName: string;
  quota: number;
  mealsPerDay: number;
  startDate: string;
  endDate: string | null;
  usedMeals: number;
  remainingMeals: number;
  consumedTodayCount: number;
}

interface CounterLookupData {
  status:
    | "VALID"
    | "NOT_FOUND"
    | "CUSTOMER_ARCHIVED"
    | "NO_ACTIVE_SUBSCRIPTION"
    | "EXHAUSTED_QUOTA"
    | "EXPIRED_SUBSCRIPTION"
    | "DAILY_LIMIT_REACHED";
  message?: string;
  customer?: CounterCustomer;
  subscription?: CounterSubscription;
}

interface ActivityRecord {
  id: string;
  businessDate: string;
  consumedAt: string;
  status: "VALID" | "VOIDED";
  customer: {
    memberId4: string;
    name: string;
  };
  recordedBy: {
    name: string;
  };
}

export default function CounterPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [memberId4, setMemberId4] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [lookupData, setLookupData] = useState<CounterLookupData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Today's Activity
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [selectedVoidRecord, setSelectedVoidRecord] = useState<{
    id: string;
    customerName: string;
    memberId4: string;
  } | null>(null);

  const fetchTodayActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/counter/activity");
      const data = await res.json();
      if (res.ok && data.records) {
        setActivityRecords(data.records);
      }
    } catch {
      // Activity feed silent error fallback
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      await Promise.resolve();
      if (!ignore) {
        fetchTodayActivity();
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [fetchTodayActivity]);

  // Focus input automatically on mount and after resets
  const focusInput = useCallback(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  function resetCounter() {
    setMemberId4("");
    setLookupData(null);
    setErrorMessage(null);
    focusInput();
  }

  // 1. Lookup Customer by 4-digit ID
  async function handleLookup(e?: FormEvent) {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanId = memberId4.trim();
    if (!/^\d{4}$/.test(cleanId)) {
      setErrorMessage("Please enter a valid 4-digit Member ID (1000–9999).");
      focusInput();
      return;
    }

    setIsLookingUp(true);

    try {
      const res = await fetch("/api/counter/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId4: cleanId }),
      });

      const data: CounterLookupData = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Lookup failed.");
        setIsLookingUp(false);
        focusInput();
        return;
      }

      setLookupData(data);
      if (data.status !== "VALID") {
        setErrorMessage(data.message || "Cannot record meal for this customer.");
      }
    } catch {
      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setIsLookingUp(false);
    }
  }

  // 2. Confirm and Record Meal
  async function handleConfirmRecord() {
    if (!lookupData?.customer || !lookupData?.subscription) return;

    setIsRecording(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/counter/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: lookupData.customer.id,
          subscriptionId: lookupData.subscription.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to record meal.");
        setIsRecording(false);
        return;
      }

      // Success feedback
      setSuccessMessage(
        `Meal recorded for #${lookupData.customer.memberId4} (${lookupData.customer.name})! Remaining: ${data.remainingMeals}`
      );

      // Refresh activity & reset counter
      fetchTodayActivity();
      resetCounter();

      // Clear success banner after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch {
      setErrorMessage("A network error occurred while recording meal.");
    } finally {
      setIsRecording(false);
    }
  }

  // Virtual Keypad Button Press Handler
  function handleKeypadPress(digit: string) {
    if (digit === "CLEAR") {
      setMemberId4("");
      focusInput();
    } else if (digit === "BACKSPACE") {
      setMemberId4((prev) => prev.slice(0, -1));
      focusInput();
    } else {
      setMemberId4((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;
        if (next.length === 4) {
          // Auto trigger lookup on 4th digit for ultra-fast experience
          setTimeout(() => {
            fetch("/api/counter/lookup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ memberId4: next }),
            })
              .then((res) => res.json())
              .then((data) => {
                setLookupData(data);
                if (data.status !== "VALID") {
                  setErrorMessage(data.message || "Cannot record meal.");
                }
              })
              .catch(() => setErrorMessage("Lookup error."));
          }, 100);
        }
        return next;
      });
      focusInput();
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Meal Counter (P0 Ledger)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Express 4-digit Member ID entry & single-tap meal verification
          </p>
        </div>
        {lookupData && (
          <Button variant="secondary" size="sm" onClick={resetCounter}>
            ← New Lookup (Esc)
          </Button>
        )}
      </div>

      {/* Success Notification Flash */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-green-600 text-white font-medium shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-base font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-white/80 hover:text-white text-sm">
            ✕
          </button>
        </div>
      )}

      {/* Main Counter Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Primary Column: Input or Customer Confirmation */}
        <div className="lg:col-span-7 space-y-6">
          {!lookupData ? (
            /* Step 1: Member ID Input & Keypad */
            <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-md space-y-6">
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label htmlFor="counter-member-id" className="block text-sm font-semibold text-slate-700 mb-2">
                    Enter Customer 4-Digit Member ID
                  </label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      id="counter-member-id"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="4827"
                      value={memberId4}
                      onChange={(e) => setMemberId4(e.target.value.replace(/\D/g, ""))}
                      className="w-full text-center font-mono text-4xl md:text-5xl tracking-[0.25em] font-extrabold h-20 rounded-2xl border-2 border-amber-300 bg-amber-50/40 text-amber-950 focus:border-amber-500 focus:bg-white focus:outline-hidden transition-all shadow-inner"
                      autoFocus
                    />
                    {isLookingUp && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Spinner size={24} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Type 4 digits or use keypad below. Press Enter to submit.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={memberId4.length !== 4 || isLookingUp}
                  className="h-14 text-lg font-bold bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Lookup Subscriber (Enter)
                </Button>
              </form>

              {/* Touch Keypad */}
              <div className="pt-4 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLEAR", "0", "BACKSPACE"].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeypadPress(key)}
                      className={`h-13 rounded-xl font-bold transition-all select-none active:scale-95 flex items-center justify-center ${
                        key === "CLEAR"
                          ? "bg-red-50 text-red-600 text-xs hover:bg-red-100 border border-red-200"
                          : key === "BACKSPACE"
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                          : "bg-slate-50 text-slate-900 text-xl hover:bg-amber-100 hover:text-amber-900 border border-slate-200/80"
                      }`}
                    >
                      {key === "BACKSPACE" ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                          <line x1="18" y1="9" x2="12" y2="15" />
                          <line x1="12" y1="9" x2="18" y2="15" />
                        </svg>
                      ) : (
                        key
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            /* Step 2: Customer Confirmation Card */
            <Card className="p-6 md:p-8 bg-white border border-amber-200 shadow-xl space-y-6 animate-fade-in">
              <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <span className="font-mono text-xl font-extrabold bg-amber-100 text-amber-950 px-4 py-2 rounded-xl border border-amber-300">
                    #{lookupData.customer?.memberId4}
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {lookupData.customer?.name}
                    </h2>
                    {lookupData.customer?.mobile && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {lookupData.customer.mobile}
                      </p>
                    )}
                  </div>
                </div>

                <Badge
                  variant={lookupData.status === "VALID" ? "success" : "error"}
                >
                  {lookupData.status === "VALID" ? "Eligible for Meal" : "Action Blocked"}
                </Badge>
              </div>

              {/* Subscription Entitlement Details */}
              {lookupData.subscription ? (
                <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                        Subscription Plan
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {lookupData.subscription.planName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Remaining Quota</span>
                      <span className="text-3xl font-extrabold text-amber-900">
                        {lookupData.subscription.remainingMeals}{" "}
                        <span className="text-sm font-normal text-slate-600">meals left</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs border-t border-amber-200/60 pt-3 text-slate-700">
                    <div>
                      <span className="text-slate-500 block">Daily Usage Limit</span>
                      <span className="font-semibold text-slate-900">
                        {lookupData.subscription.consumedTodayCount} of {lookupData.subscription.mealsPerDay} meal(s) today
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Validity End Date</span>
                      <span className="font-semibold text-slate-900">
                        {lookupData.subscription.endDate
                          ? new Date(lookupData.subscription.endDate).toLocaleDateString()
                          : "No Calendar Expiry"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-red-700 text-sm">
                  {lookupData.message || "No active meal subscription."}
                </div>
              )}

              {/* Status Message / Alert */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1 h-14 text-base"
                  onClick={resetCounter}
                  disabled={isRecording}
                >
                  Cancel (Esc)
                </Button>

                {lookupData.status === "VALID" && (
                  <Button
                    className="flex-2 h-14 text-lg font-extrabold bg-green-600 hover:bg-green-700 text-white shadow-lg"
                    onClick={handleConfirmRecord}
                    isLoading={isRecording}
                  >
                    Confirm & Record Meal (Enter)
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Today's Activity Feed */}
        <div className="lg:col-span-5">
          <Card className="p-5 bg-white border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="12 6 12 12 16 14" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Today&apos;s Meal Log
              </h3>
              <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                {activityRecords.filter((r) => r.status === "VALID").length} Served
              </span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {activityRecords.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No meals recorded yet today.
                </div>
              ) : (
                activityRecords.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                      r.status === "VOIDED"
                        ? "bg-slate-50 border-slate-200 opacity-60"
                        : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                        #{r.customer.memberId4}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-900 block">{r.customer.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(r.consumedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {r.status === "VOIDED" ? (
                        <Badge variant="neutral">VOIDED</Badge>
                      ) : (
                        <button
                          onClick={() =>
                            setSelectedVoidRecord({
                              id: r.id,
                              customerName: r.customer.name,
                              memberId4: r.customer.memberId4,
                            })
                          }
                          className="text-[11px] font-semibold text-red-600 hover:text-red-800 hover:underline"
                        >
                          Void
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Void Meal Modal */}
      <VoidMealModal
        isOpen={Boolean(selectedVoidRecord)}
        onClose={() => setSelectedVoidRecord(null)}
        onSuccess={() => {
          fetchTodayActivity();
          if (lookupData) {
            handleLookup(); // Refresh current customer balance
          }
        }}
        mealRecord={selectedVoidRecord}
      />
    </div>
  );
}
