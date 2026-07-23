import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMerchantInvitations } from "../../api";
import { useDashboardAuth } from "../../auth";
import { ProcessorLogo } from "../../components/ProcessorLogo";
import { formatDateTime } from "../../format";
import { MOCK_CONNECTIONS } from "../../mockData";
import type { MerchantInvitation } from "../../types";

export default function MerchantsPage() {
  const { apiKey } = useDashboardAuth();
  const [invitations, setInvitations] = useState<MerchantInvitation[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    listMerchantInvitations(apiKey)
      .then((response) => setInvitations(response.invitations))
      .catch(() => setErrorMessage("Couldn't load merchants."));
  }, [apiKey]);

  if (errorMessage && invitations === null) return <p className="text-red-600">{errorMessage}</p>;
  if (invitations === null) return <p className="text-slate-500">Loading…</p>;

  if (invitations.length === 0) {
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Merchants</h1>
        <Link
          to="/dashboard/invite"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Invite merchant
        </Link>
      </div>
      {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Merchant</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Processor</th>
              <th className="px-4 py-3">Last synced</th>
              <th className="px-4 py-3">Invited</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invitations.map((invitation) => {
              // Same sample-data fallback the detail page uses, so both screens agree.
              const connections = invitation.connections.length > 0 ? invitation.connections : MOCK_CONNECTIONS;
              const connection = connections[0];
              const isConnected = invitation.status === "connected" && invitation.merchant_id;
              // Merchant id once connected; falls back to the invitation id, which the
              // detail page resolves to the same view with sample data.
              const detailPath = `/dashboard/merchants/${invitation.merchant_id ?? invitation.invitation_id}`;
              return (
                <tr key={invitation.invitation_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {(isConnected ? invitation.merchant_display_name : invitation.merchant_name_hint) ||
                        invitation.merchant_email}
                    </div>
                    {(isConnected ? invitation.merchant_display_name : invitation.merchant_name_hint) && (
                      <div className="text-xs text-slate-400">{invitation.merchant_email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <InvitationStatusBadge status={invitation.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center">
                      {connections.map((processorConnection, index) => (
                        <ProcessorLogo
                          key={processorConnection.provider_name}
                          providerName={processorConnection.provider_name}
                          size="sm"
                          className={index > 0 ? "-ml-1.5 ring-2 ring-white" : "ring-2 ring-white"}
                        />
                      ))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(connection?.last_synced_at ?? null)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(invitation.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={detailPath}
                      className="inline-block rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View merchant
                    </Link>
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

export function InvitationStatusBadge({ status }: { status: MerchantInvitation["status"] }) {
  const labels: Record<MerchantInvitation["status"], string> = {
    pending: "Invite sent",
    opened: "Invite sent",
    connected: "Invite accepted",
    expired: "Expired",
    revoked: "Revoked",
  };
  const styles: Record<MerchantInvitation["status"], string> = {
    pending: "bg-slate-100 text-slate-600",
    opened: "bg-blue-100 text-blue-700",
    connected: "bg-green-100 text-green-700",
    expired: "bg-red-100 text-red-700",
    revoked: "bg-slate-200 text-slate-500",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
