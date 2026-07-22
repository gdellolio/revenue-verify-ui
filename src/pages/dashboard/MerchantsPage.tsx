import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMerchants } from "../../api";
import { useDashboardAuth } from "../../auth";
import { formatDateTime } from "../../format";
import type { Merchant } from "../../types";

export default function MerchantsPage() {
  const { apiKey } = useDashboardAuth();
  const [merchants, setMerchants] = useState<Merchant[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    listMerchants(apiKey)
      .then((response) => setMerchants(response.merchants))
      .catch(() => setErrorMessage("Couldn't load merchants."));
  }, [apiKey]);

  if (errorMessage) return <p className="text-red-600">{errorMessage}</p>;
  if (merchants === null) return <p className="text-slate-500">Loading…</p>;

  if (merchants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h2 className="text-lg font-semibold text-slate-900">No merchants yet</h2>
        <p className="mt-1 text-slate-500">
          Invite a merchant to connect their payment processor and their verified revenue data will
          appear here.
        </p>
        <Link
          to="/dashboard/invite"
          className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
        >
          Invite your first merchant
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Merchants</h1>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Merchant</th>
              <th className="px-4 py-3">Processor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last synced</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {merchants.map((merchant) => {
              const connection = merchant.connections[0];
              return (
                <tr key={merchant.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/dashboard/merchants/${merchant.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {merchant.display_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-700">
                    {connection?.provider_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {connection ? <StatusBadge status={connection.status} /> : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDateTime(connection?.last_synced_at ?? null)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    revoked: "bg-slate-200 text-slate-600",
    error: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}
