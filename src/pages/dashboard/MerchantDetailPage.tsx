import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createMerchantInvitation,
  deleteMerchantInvitation,
  getInvitationActivity,
  getMerchant,
  getMerchantActivity,
  getMerchantInvitation,
  listStatements,
  listSyncRuns,
  listTransactions,
  refreshMerchant,
  resendMerchantInvitation,
  revokeMerchantAccess,
  revokeMerchantInvitation,
} from "../../api";
import { useDashboardAuth } from "../../auth";
import { ConfirmModal } from "../../components/ConfirmModal";
import { ProcessorLogo } from "../../components/ProcessorLogo";
import { formatCount, formatDate, formatDateTime, formatMinorUnits, formatPeriod } from "../../format";
import { MOCK_INVOICES } from "../../mockData";
import type { ActivityEvent, Merchant, MerchantInvitation, Statement, SyncRun, Transaction } from "../../types";
import { InvitationStatusBadge, StatusBadge } from "./MerchantsPage";

type DataTab = "transactions" | "invoices" | "statements" | "activity";

// Processors the platform supports (or will) — any not actually connected
// by this merchant render greyed out in the rail.
const SUPPORTED_PROCESSORS = ["stripe", "square", "paypal", "shopify"];

export default function MerchantDetailPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const { apiKey } = useDashboardAuth();
  const navigate = useNavigate();

  // The route id is a merchant id for connected merchants, or an invitation id
  // for merchants that haven't connected yet.
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [invitation, setInvitation] = useState<MerchantInvitation | null>(null);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reconnectLink, setReconnectLink] = useState<string | null>(null);
  const [reconnectEmail, setReconnectEmail] = useState("");
  const [reconnectCopied, setReconnectCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"revoke-invitation" | "delete-merchant" | null>(null);

  // null = unified view across all processors (the default).
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DataTab>("transactions");

  useEffect(() => {
    if (!apiKey || !merchantId) return;
    setLoading(true);
    Promise.all([
      getMerchant(apiKey, merchantId),
      listStatements(apiKey, merchantId),
      listTransactions(apiKey, merchantId, null),
      listSyncRuns(apiKey, merchantId),
      getMerchantActivity(apiKey, merchantId),
    ])
      .then(([merchantResponse, statementsResponse, transactionsPage, syncsResponse, activityResponse]) => {
        setMerchant(merchantResponse);
        setStatements(statementsResponse.statements);
        setTransactions(transactionsPage.transactions);
        setNextCursor(transactionsPage.next_cursor);
        setSyncRuns(syncsResponse.syncs);
        setActivityEvents(activityResponse.events);
      })
      .catch(() =>
        Promise.all([getMerchantInvitation(apiKey, merchantId), getInvitationActivity(apiKey, merchantId)])
          .then(([invitationResponse, activityResponse]) => {
            setInvitation(invitationResponse);
            setActivityEvents(activityResponse.events);
          })
          .catch(() => setErrorMessage("Couldn't load this merchant.")),
      )
      .finally(() => setLoading(false));
  }, [apiKey, merchantId]);

  const loadMoreTransactions = useCallback(async () => {
    if (!apiKey || !merchantId || !nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await listTransactions(apiKey, merchantId, nextCursor);
      setTransactions((existing) => [...existing, ...page.transactions]);
      setNextCursor(page.next_cursor);
    } finally {
      setLoadingMore(false);
    }
  }, [apiKey, merchantId, nextCursor]);

  const requestRefresh = async () => {
    if (!apiKey || !merchantId || !merchant) return;
    const { ingestion_run_id } = await refreshMerchant(apiKey, merchantId);
    setRefreshNote(`Sync #${ingestion_run_id} queued. Fresh data will appear shortly.`);
  };

  const getInviteLink = async () => {
    if (!apiKey || !invitation) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const updated = await resendMerchantInvitation(apiKey, invitation.invitation_id);
      setInvitation(updated);
      setInviteLink(updated.merchant_link_url);
    } catch {
      setErrorMessage("Couldn't generate an invite link.");
    } finally {
      setBusy(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // A dead connection (revoked/error) is fixed by sending the merchant a fresh
  // connection link — a plain invitation. Reconnecting the same processor account
  // reactivates it; a different account connects alongside.
  const getReconnectLink = async () => {
    if (!apiKey || !merchant) return;
    const email = merchant.primary_email ?? reconnectEmail.trim();
    if (!email) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const created = await createMerchantInvitation(apiKey, email, merchant.display_name);
      setReconnectLink(created.merchant_link_url);
    } catch {
      setErrorMessage("Couldn't generate a reconnect link.");
    } finally {
      setBusy(false);
    }
  };

  const copyReconnectLink = async () => {
    if (!reconnectLink) return;
    await navigator.clipboard.writeText(reconnectLink);
    setReconnectCopied(true);
    setTimeout(() => setReconnectCopied(false), 2000);
  };

  const revokeInvitation = async () => {
    if (!apiKey || !invitation) return;
    setBusy(true);
    try {
      const updated = await revokeMerchantInvitation(apiKey, invitation.invitation_id);
      setInvitation(updated);
      setInviteLink(null);
      setConfirmAction(null);
    } catch {
      setErrorMessage("Couldn't revoke the invitation.");
      setConfirmAction(null);
    } finally {
      setBusy(false);
    }
  };

  // Soft delete: connected merchants lose this lender's access grant; pending
  // ones have their invitation hidden. Either way the row leaves the dashboard.
  const deleteMerchant = async () => {
    if (!apiKey) return;
    setBusy(true);
    try {
      if (merchant && merchantId) {
        await revokeMerchantAccess(apiKey, merchantId);
      } else if (invitation) {
        await deleteMerchantInvitation(apiKey, invitation.invitation_id);
      }
      navigate("/dashboard");
    } catch {
      setErrorMessage("Couldn't remove this merchant.");
      setConfirmAction(null);
      setBusy(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (errorMessage && !merchant && !invitation) return <p className="text-red-600">{errorMessage}</p>;

  const displayName =
    merchant?.display_name || invitation?.merchant_name_hint || invitation?.merchant_email || "Merchant";
  const email = merchant?.primary_email ?? invitation?.merchant_email ?? null;

  // Only real connections are ever shown; processors the merchant hasn't
  // connected appear greyed out in the rail.
  const connections = merchant?.connections ?? [];

  const shownTransactions = selectedProvider
    ? transactions.filter((transaction) => transaction.provider_name === selectedProvider)
    : transactions;
  const shownInvoices = selectedProvider
    ? MOCK_INVOICES.filter((invoice) => invoice.provider_name === selectedProvider)
    : MOCK_INVOICES;
  const shownStatements = selectedProvider
    ? statements.filter((statement) => statement.provider_name === selectedProvider)
    : statements;

  return (
    <div>
      {/* Header */}
      <Link to="/dashboard" className="text-sm text-slate-500 hover:underline">
        ← Merchants
      </Link>
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-lg font-semibold text-indigo-700">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{displayName}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                {email && <span>{email}</span>}
                {invitation && <InvitationStatusBadge status={invitation.status} />}
                {merchant && (
                  <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Connected
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {merchant && (
              <button
                onClick={requestRefresh}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Refresh data
              </button>
            )}
            {invitation && invitation.status !== "connected" && invitation.status !== "revoked" && (
              <button
                onClick={() => setConfirmAction("revoke-invitation")}
                disabled={busy}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Revoke invitation
              </button>
            )}
            <button
              onClick={() => setConfirmAction("delete-merchant")}
              disabled={busy}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Delete merchant
            </button>
          </div>
        </div>
        {refreshNote && <p className="mt-2 text-sm text-green-700">{refreshNote}</p>}
        {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
        {/* Onboarding progress — only interesting until the merchant is connected */}
        {!merchant && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <StatusTimeline merchant={merchant} invitation={invitation} />
          </div>
        )}
      </div>

      {/* Invite link banner for merchants that haven't connected yet */}
      {invitation && invitation.status !== "connected" && invitation.status !== "revoked" && (
        <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-indigo-900">
              This merchant hasn't connected a payment processor yet.
            </p>
            {inviteLink ? (
              <div className="flex items-center gap-2">
                <code className="max-w-[280px] truncate rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs text-slate-700">
                  {inviteLink}
                </code>
                <button
                  onClick={copyInviteLink}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>
            ) : (
              <button
                onClick={getInviteLink}
                disabled={busy}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy ? "Generating…" : "Get invite link"}
              </button>
            )}
          </div>
        </div>
      )}
      {invitation?.status === "revoked" && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          This invitation was revoked. Create a new invitation to reconnect this merchant.
        </div>
      )}

      {/* Reconnect banner: a connected merchant whose processor connection died */}
      {merchant && merchant.connections.some((connection) => connection.status !== "active") && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-amber-900">
              {(() => {
                const dead = merchant.connections.find((connection) => connection.status !== "active")!;
                return (
                  <>
                    The <span className="capitalize">{dead.provider_name}</span> connection is no longer
                    active — data stopped syncing {formatDateTime(dead.last_synced_at)}. Send the
                    merchant a new link to reconnect.
                  </>
                );
              })()}
            </p>
            {reconnectLink ? (
              <div className="flex items-center gap-2">
                <code className="max-w-[280px] truncate rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-slate-700">
                  {reconnectLink}
                </code>
                <button
                  onClick={copyReconnectLink}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                >
                  {reconnectCopied ? "Copied ✓" : "Copy"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {!merchant.primary_email && (
                  <input
                    type="email"
                    value={reconnectEmail}
                    onChange={(event) => setReconnectEmail(event.target.value)}
                    placeholder="merchant email"
                    className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
                  />
                )}
                <button
                  onClick={getReconnectLink}
                  disabled={busy || (!merchant.primary_email && !reconnectEmail.trim())}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {busy ? "Generating…" : "Get reconnect link"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processor rail + data pane */}
      <div className="mt-6 flex flex-col gap-6 md:flex-row">
        {/* Vertical processor tabs */}
        <nav className="w-full shrink-0 md:w-72">
          <div className="rounded-xl border border-slate-200 bg-white p-2">
            <button
              onClick={() => setSelectedProvider(null)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                selectedProvider === null
                  ? "bg-indigo-50 font-semibold text-indigo-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                ALL
              </span>
              <span>
                Unified view
                <span className="block text-xs font-normal text-slate-400">All processors</span>
              </span>
            </button>

            <div className="my-2 border-t border-slate-100" />

            {connections.map((connection) => (
              <button
                key={connection.provider_name}
                onClick={() => setSelectedProvider(connection.provider_name)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  selectedProvider === connection.provider_name
                    ? "bg-indigo-50 font-semibold text-indigo-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ProcessorLogo providerName={connection.provider_name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 capitalize">
                    {connection.provider_name}
                    <StatusBadge status={connection.status} />
                  </span>
                  <span className="block truncate text-xs font-normal text-slate-400">
                    Synced {formatDateTime(connection.last_synced_at)}
                  </span>
                </span>
              </button>
            ))}

            {SUPPORTED_PROCESSORS.filter(
              (providerName) => !connections.some((connection) => connection.provider_name === providerName),
            ).map((providerName) => (
              <div
                key={providerName}
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm opacity-40"
                title="Not connected"
              >
                <ProcessorLogo providerName={providerName} />
                <span>
                  <span className="block capitalize text-slate-700">{providerName}</span>
                  <span className="block text-xs text-slate-400">Not connected</span>
                </span>
              </div>
            ))}
          </div>
        </nav>

        {/* Data pane */}
        <div className="min-w-0 flex-1">
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex gap-6">
              {(
                [
                  ["transactions", "Transactions"],
                  ["invoices", "Invoices"],
                  ["statements", "Statements"],
                  ["activity", "Activity"],
                ] as [DataTab, string][]
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
                    activeTab === tab
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === "transactions" && (
            <div className="mt-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Processor</th>
                      <th className="px-4 py-3 text-right">Gross</th>
                      <th className="px-4 py-3 text-right">Fee</th>
                      <th className="px-4 py-3 text-right">Net</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shownTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-4 py-2.5 text-slate-700">{formatDate(transaction.occurred_at)}</td>
                        <td className="px-4 py-2.5">
                          <ProcessorCell providerName={transaction.provider_name} />
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                          {formatMinorUnits(transaction.gross_amount_in_minor_units, transaction.currency_code)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-500">
                          {formatMinorUnits(transaction.processor_fee_in_minor_units, transaction.currency_code)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {formatMinorUnits(transaction.net_amount_in_minor_units, transaction.currency_code)}
                        </td>
                        <td className="px-4 py-2.5">
                          <TransactionStatusBadge status={transaction.status} />
                        </td>
                      </tr>
                    ))}
                    {shownTransactions.length === 0 && (
                      <EmptyRow columns={6}>
                        No transactions yet. They'll appear here after this merchant's next sync.
                      </EmptyRow>
                    )}
                  </tbody>
                </table>
              </div>
              {nextCursor && (
                <button
                  onClick={loadMoreTransactions}
                  disabled={loadingMore}
                  className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              )}
            </div>
          )}

          {activeTab === "invoices" && (
            <div className="mt-4">
              <SampleNote />
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Processor</th>
                      <th className="px-4 py-3">Issued</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shownInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{invoice.number}</td>
                        <td className="px-4 py-3">
                          <ProcessorCell providerName={invoice.provider_name} />
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(invoice.issued_at)}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(invoice.due_at)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {formatMinorUnits(invoice.amount_in_minor_units, invoice.currency_code)}
                        </td>
                        <td className="px-4 py-3">
                          <InvoiceStatusBadge status={invoice.status} />
                        </td>
                      </tr>
                    ))}
                    {shownInvoices.length === 0 && <EmptyRow columns={6} />}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "statements" && (
            <div className="mt-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Processor</th>
                      <th className="px-4 py-3 text-right">Gross sales</th>
                      <th className="px-4 py-3 text-right">Refunds</th>
                      <th className="px-4 py-3 text-right">Chargebacks</th>
                      <th className="px-4 py-3 text-right">Fees</th>
                      <th className="px-4 py-3 text-right">Payouts</th>
                      <th className="px-4 py-3 text-right">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shownStatements.map((statement) => (
                      <tr key={statement.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {formatPeriod(statement.period_start_date)}
                        </td>
                        <td className="px-4 py-3">
                          <ProcessorCell providerName={statement.provider_name} />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {formatMinorUnits(statement.gross_sales_amount_in_minor_units, statement.currency_code)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatMinorUnits(statement.refund_total_amount_in_minor_units, statement.currency_code)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatMinorUnits(statement.chargeback_total_amount_in_minor_units, statement.currency_code)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatMinorUnits(statement.processor_fee_total_amount_in_minor_units, statement.currency_code)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatMinorUnits(statement.payout_total_amount_in_minor_units, statement.currency_code)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatCount(statement.transaction_count)}
                        </td>
                      </tr>
                    ))}
                    {shownStatements.length === 0 && (
                      <EmptyRow columns={8}>
                        No statements yet. Monthly totals appear once the processor has a full reporting period.
                      </EmptyRow>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "activity" && <ActivityFeed events={activityEvents} syncRuns={syncRuns} />}
        </div>
      </div>

      <ConfirmModal
        open={confirmAction === "revoke-invitation"}
        title="Revoke this invitation?"
        confirmLabel="Revoke invitation"
        busyLabel="Revoking…"
        busy={busy}
        onConfirm={revokeInvitation}
        onCancel={() => setConfirmAction(null)}
      >
        The invite link sent to <span className="font-medium text-slate-700">{email ?? "this merchant"}</span> will
        stop working immediately. The merchant stays on your dashboard, and you can generate a new link later.
      </ConfirmModal>

      <ConfirmModal
        open={confirmAction === "delete-merchant"}
        title={`Delete ${displayName}?`}
        confirmLabel="Delete merchant"
        busyLabel="Deleting…"
        busy={busy}
        onConfirm={deleteMerchant}
        onCancel={() => setConfirmAction(null)}
      >
        {merchant
          ? "This removes the merchant from your dashboard and ends your access to their data. Their records aren't destroyed, and inviting them again restores access."
          : "This removes the merchant from your dashboard and invalidates their invite link. You can always invite them again."}
      </ConfirmModal>
    </div>
  );
}

const SYNC_TRIGGER_LABELS: Record<string, string> = {
  initial_connection: "Initial data sync",
  manual: "Manual refresh",
  schedule: "Scheduled sync",
  webhook: "Webhook sync",
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "merchant_data_request.created": "Merchant invited",
  "merchant_data_request.opened": "Merchant opened the invite link",
  "merchant_data_request.resent": "New invite link generated",
  "merchant_data_request.revoked": "Invitation revoked",
  "merchant_data_request.deleted": "Merchant removed from dashboard",
};

interface FeedItem {
  key: string;
  occurredAt: string;
  icon: "invite" | "connected" | "revoked" | SyncRun["status"];
  title: string;
  detail: React.ReactNode | null;
}

function ActivityFeed({ events, syncRuns }: { events: ActivityEvent[]; syncRuns: SyncRun[] }) {
  const items: FeedItem[] = [
    ...events.map((event): FeedItem => {
      if (event.action === "payment_processor_connection.authorized") {
        const provider = String(event.metadata?.provider_name ?? "processor");
        return {
          key: `event-${event.id}`,
          occurredAt: event.occurred_at,
          icon: "connected",
          title: `Merchant connected ${provider.charAt(0).toUpperCase()}${provider.slice(1)}`,
          detail: null,
        };
      }
      return {
        key: `event-${event.id}`,
        occurredAt: event.occurred_at,
        icon: event.action === "merchant_data_request.revoked" ? "revoked" : "invite",
        title: AUDIT_ACTION_LABELS[event.action] ?? event.action,
        detail: null,
      };
    }),
    ...syncRuns.map((run): FeedItem => {
      const counts = Object.entries(run.record_counts ?? {}).filter(([, value]) => value > 0);
      return {
        key: `sync-${run.id}`,
        occurredAt: run.finished_at ?? run.started_at ?? "",
        icon: run.status,
        title: SYNC_TRIGGER_LABELS[run.triggered_by] ?? run.triggered_by,
        detail:
          run.status === "failed" ? (
            <span className="text-xs text-red-600">Sync failed, nothing was ingested</span>
          ) : run.status === "queued" || run.status === "running" ? (
            <span className="text-xs text-slate-500">In progress…</span>
          ) : counts.length === 0 ? (
            <span className="text-xs text-slate-400">No new records</span>
          ) : (
            counts.map(([kind, value]) => (
              <span
                key={kind}
                className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
              >
                +{value.toLocaleString()} {kind}
              </span>
            ))
          ),
      };
    }),
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  if (items.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
      <ol className="relative space-y-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-slate-200">
        {items.map((item) => (
          <li key={item.key} className="relative flex gap-4">
            <FeedIcon icon={item.icon} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-sm font-medium text-slate-900">{item.title}</span>
                <span className="text-xs text-slate-400">{formatDateTime(item.occurredAt || null)}</span>
              </div>
              {item.detail && <div className="mt-1 flex flex-wrap items-center gap-1.5">{item.detail}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FeedIcon({ icon }: { icon: FeedItem["icon"] }) {
  if (icon === "invite") {
    return (
      <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      </span>
    );
  }
  if (icon === "connected") {
    return (
      <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
        </svg>
      </span>
    );
  }
  if (icon === "revoked") {
    return (
      <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </span>
    );
  }
  return <SyncStatusIcon status={icon} />;
}

function SyncStatusIcon({ status }: { status: SyncRun["status"] }) {
  if (status === "succeeded") {
    return (
      <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-red-600" fill="none" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
    );
  }
  return (
    <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
    </span>
  );
}

type TimelineStepState = "done" | "current" | "upcoming" | "error";

interface TimelineStep {
  label: string;
  sublabel: string | null;
  state: TimelineStepState;
}

function StatusTimeline({
  merchant,
  invitation,
}: {
  merchant: Merchant | null;
  invitation: MerchantInvitation | null;
}) {
  const connection = merchant?.connections[0] ?? null;
  const isConnected = merchant !== null || invitation?.status === "connected";
  const linkOpened = isConnected || invitation?.status === "opened";
  const invitationDead = invitation?.status === "expired" || invitation?.status === "revoked";
  const invitedAt = invitation?.created_at ?? merchant?.created_at ?? null;

  const steps: TimelineStep[] = [
    {
      label: "Merchant invited",
      sublabel: invitedAt ? formatDateTime(invitedAt) : null,
      state: "done",
    },
    invitationDead
      ? {
          label: invitation?.status === "expired" ? "Link expired" : "Invitation revoked",
          sublabel: "Generate a new invitation to continue",
          state: "error",
        }
      : {
          label: "Invite opened",
          sublabel: linkOpened ? "Merchant viewed the link" : "Waiting on the merchant",
          state: linkOpened ? "done" : "current",
        },
    {
      label: "Processor connected",
      sublabel: connection
        ? formatDateTime(connection.connected_at)
        : isConnected
          ? null
          : "Merchant authorizes their processor",
      state: isConnected ? "done" : invitationDead ? "upcoming" : linkOpened ? "current" : "upcoming",
    },
    {
      label: "Data synced",
      sublabel: connection?.last_synced_at
        ? formatDateTime(connection.last_synced_at)
        : isConnected
          ? "Data will begin syncing shortly"
          : null,
      state: connection?.last_synced_at ? "done" : isConnected ? "current" : "upcoming",
    },
  ];

  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-[480px] items-start">
        {steps.map((step, index) => (
          <li key={step.label} className="relative flex-1">
            {index > 0 && (
              <div
                className={`absolute right-1/2 top-2.5 -z-0 h-0.5 w-full ${
                  step.state === "done" || step.state === "error" ? "bg-indigo-600" : "bg-slate-200"
                }`}
              />
            )}
            <div className="relative z-10 flex flex-col items-center text-center">
              <TimelineDot state={step.state} />
              <div
                className={`mt-1.5 text-xs font-medium ${
                  step.state === "error"
                    ? "text-red-600"
                    : step.state === "upcoming"
                      ? "text-slate-400"
                      : "text-slate-900"
                }`}
              >
                {step.label}
              </div>
              {step.sublabel && <div className="mt-0.5 px-2 text-[11px] text-slate-400">{step.sublabel}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TimelineDot({ state }: { state: TimelineStepState }) {
  if (state === "done") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600">
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600">
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-indigo-600 bg-white">
        <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600" />
      </span>
    );
  }
  return <span className="h-5 w-5 rounded-full border-2 border-slate-200 bg-white" />;
}

function ProcessorCell({ providerName }: { providerName: string }) {
  return (
    <span className="flex items-center gap-2">
      <ProcessorLogo providerName={providerName} size="sm" />
      <span className="capitalize text-slate-700">{providerName}</span>
    </span>
  );
}

function TransactionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    succeeded: "bg-green-100 text-green-700",
    available: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    refunded: "bg-slate-200 text-slate-600",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}

function SampleNote() {
  return (
    <p className="mb-3 text-xs text-amber-600">
      Sample data. Real data appears here once this merchant connects and syncs.
    </p>
  );
}

function EmptyRow({ columns, children }: { columns: number; children?: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={columns} className="px-4 py-8 text-center text-sm text-slate-400">
        {children ?? "Nothing here for this processor."}
      </td>
    </tr>
  );
}

function InvoiceStatusBadge({ status }: { status: "paid" | "open" | "overdue" }) {
  const styles = {
    paid: "bg-green-100 text-green-700",
    open: "bg-blue-100 text-blue-700",
    overdue: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
