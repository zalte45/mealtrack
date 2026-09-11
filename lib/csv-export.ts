/**
 * Tenant-Isolated CSV Export Utility
 *
 * Formats MealRecord ledger entries into standard RFC 4180 CSV strings.
 * Respects provider isolation and proper local business dates.
 */

export interface ExportMealRecord {
  businessDate: string;
  consumedAt: Date | string;
  memberId4: string;
  customerName: string;
  planName: string;
  mealType: string | null;
  status: string;
  recordedBy: string;
  voidReason?: string | null;
}

export function generateMealRecordsCsv(records: ExportMealRecord[]): string {
  const headers = [
    "Business Date",
    "Time (Local)",
    "Member ID",
    "Customer Name",
    "Subscription Plan",
    "Meal Type",
    "Status",
    "Recorded By",
    "Void Reason",
  ];

  const escapeCsvField = (field: string | null | undefined): string => {
    if (field === null || field === undefined) return '""';
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = records.map((r) => {
    const timeStr = new Date(r.consumedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    return [
      escapeCsvField(r.businessDate),
      escapeCsvField(timeStr),
      escapeCsvField(`#${r.memberId4}`),
      escapeCsvField(r.customerName),
      escapeCsvField(r.planName),
      escapeCsvField(r.mealType || "Standard"),
      escapeCsvField(r.status),
      escapeCsvField(r.recordedBy),
      escapeCsvField(r.voidReason || ""),
    ].join(",");
  });

  return [headers.map((h) => `"${h}"`).join(","), ...rows].join("\n");
}
