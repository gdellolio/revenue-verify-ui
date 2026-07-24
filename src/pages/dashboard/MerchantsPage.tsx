import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listMerchantInvitations } from "../../api";
import { useDashboardAuth } from "../../auth";
import { ProcessorLogo } from "../../components/ProcessorLogo";
import { formatDateTime } from "../../format";
import type { MerchantInvitation } from "../../types";

type StatusFilter = "all" | "sent" | "connected" | "expired" | "revoked";

const FILTER_MATCHES: Record<StatusFilter, (invitation: MerchantInvitation) => boolean> = {
  all: () => true,
  sent: (invitation) => invitation.status === "pending" || invitation.status === "opened",
  connected: (invitation) => invitation.status === "connected",
  expired: (invitation) => invitation.status === "expired",
  revoked: (invitation) => invitation.status === "revoked",
};

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  sent: "Invite sent",
  connected: "Connected",
  expired: "Expired",
  revoked: "Revoked",
};

export default function MerchantsPage() {
  const { apiKey } = useDashboardAuth();
  const [invitations, setInvitations] = useState<MerchantInvitation[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    if (!apiKey) return;
    listMerchantInvitations(apiKey)
      .then((response) => setInvitations(response.invitations))
      .catch(() => setErrorMessage("Couldn't load merchants."));
  }, [apiKey]);

  if (errorMessage && invitations === null) return <p className="text-red-600">{errorMessage}</p>;
  if (invitations === null) return <p className="text-slate-500">Loading…</p>;

  const filtered = invitations.filter(FILTER_MATCHES[statusFilter]);

  const merchantList =
    invitations.length === 0 ? (
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
    ) : filtered.length === 0 ? (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        No merchants with status "{FILTER_LABELS[statusFilter]}".
      </div>
    ) : (
      <MerchantTable invitations={filtered} />
    );

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <LenderSidebar invitations={invitations} />
      <div className="min-w-0 flex-1">
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
        {invitations.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((filter) => {
              const count = invitations.filter(FILTER_MATCHES[filter]).length;
              const selected = statusFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-xl border px-4 py-2.5 text-left transition ${
                    selected
                      ? "border-indigo-600 bg-white ring-1 ring-indigo-600"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`text-xs font-medium ${selected ? "text-indigo-600" : "text-slate-500"}`}>
                    {FILTER_LABELS[filter]}
                  </div>
                  <div
                    className={`mt-0.5 text-lg font-semibold tabular-nums ${
                      selected ? "text-indigo-600" : "text-slate-900"
                    }`}
                  >
                    {count}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-4">{merchantList}</div>
      </div>
    </div>
  );
}

// Mock lender profile until real lender auth (Auth0) lands.
const MOCK_LENDER = {
  name: "Rapid Capital",
  email: "underwriting@rapidcapital.com",
  plan: "Growth",
  memberSince: "March 2026",
};

function LenderSidebar({ invitations }: { invitations: MerchantInvitation[] }) {
  const connected = invitations.filter((invitation) => invitation.status === "connected").length;
  const awaiting = invitations.filter(
    (invitation) => invitation.status === "pending" || invitation.status === "opened",
  ).length;

  return (
    <aside className="w-full shrink-0 space-y-4 md:w-64">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-lg font-semibold text-white">
            {MOCK_LENDER.name.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900">{MOCK_LENDER.name}</div>
            <div className="truncate text-xs text-slate-400">{MOCK_LENDER.email}</div>
          </div>
        </div>
        <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Plan</dt>
            <dd>
              <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {MOCK_LENDER.plan}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Member since</dt>
            <dd className="text-slate-700">{MOCK_LENDER.memberSince}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-slate-300">Demo profile</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overview</h2>
        <dl className="mt-3 space-y-4">
          <StatTile value={invitations.length} label="Merchants invited" />
          <StatTile value={connected} label="Connected" />
          <StatTile value={awaiting} label="Awaiting connection" />
        </dl>
      </div>
    </aside>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dd className="text-2xl font-semibold tabular-nums text-slate-900">{value.toLocaleString()}</dd>
      <dt className="text-xs text-slate-500">{label}</dt>
    </div>
  );
}

function MerchantTable({ invitations }: { invitations: MerchantInvitation[] }) {
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full whitespace-nowrap text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Merchant</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Processor</th>
            <th className="px-4 py-3">Last synced</th>
            <th className="px-4 py-3">Invited</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invitations.map((invitation) => {
            const connections = invitation.connections;
            const connection = connections[0];
            const isConnected = invitation.status === "connected" && invitation.merchant_id;
            // Merchant id once connected; falls back to the invitation id, which the
            // detail page resolves to the same view with sample data.
            const detailPath = `/dashboard/merchants/${invitation.merchant_id ?? invitation.invitation_id}`;
            return (
              <tr
                key={invitation.invitation_id}
                onClick={() => navigate(detailPath)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <Link
                    to={detailPath}
                    onClick={(event) => event.stopPropagation()}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {(isConnected ? invitation.merchant_display_name : invitation.merchant_name_hint) ||
                      invitation.merchant_email}
                  </Link>
                  {(isConnected ? invitation.merchant_display_name : invitation.merchant_name_hint) && (
                    <div className="text-xs text-slate-400">{invitation.merchant_email}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <InvitationStatusBadge status={invitation.status} />
                </td>
                <td className="px-4 py-3">
                  {connections.length > 0 ? (
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
                  ) : (
                    <span className="text-xs text-slate-400">Not connected</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(connection?.last_synced_at ?? null)}</td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(invitation.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
