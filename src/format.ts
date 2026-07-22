// Money is integer minor units + ISO currency code, matching the API contract.

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export function formatMinorUnits(amountInMinorUnits: number | null, currencyCode: string): string {
  if (amountInMinorUnits === null || amountInMinorUnits === undefined) return "—";
  const majorUnits = ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase())
    ? amountInMinorUnits
    : amountInMinorUnits / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(majorUnits);
}

export function formatCount(count: number | null): string {
  return count === null || count === undefined ? "—" : count.toLocaleString();
}

export function formatPeriod(periodStartDate: string): string {
  const [year, month] = periodStartDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(isoTimestamp: string | null): string {
  if (!isoTimestamp) return "—";
  return new Date(isoTimestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
