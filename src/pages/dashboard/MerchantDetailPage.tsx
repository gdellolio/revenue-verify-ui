import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getMerchant,
  getMerchantInvitation,
  listStatements,
  listTransactions,
  refreshMerchant,
  resendMerchantInvitation,
  revokeMerchantAccess,
  revokeMerchantInvitation,
} from "../../api";
import { useDashboardAuth } from "../../auth";
import { ProcessorLogo } from "../../components/ProcessorLogo";
import { formatCount, formatDate, formatDateTime, formatMinorUnits, formatPeriod } from "../../format";
import { MOCK_CONNECTIONS, MOCK_INVOICES, MOCK_STATEMENTS, MOCK_TRANSACTIONS } from "../../mockData";
import type { Merchant, MerchantInvitation, Statement, Transaction } from "../../types";
import { InvitationStatusBadge, StatusBadge } from "./MerchantsPage";

type DataTab = "transactions" | "invoices" | "statements";

// Processors we don't support yet — shown greyed out in the rail.
const UPCOMING_PROCESSORS = ["square", "shopify", "adyen"];

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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    ])
      .then(([merchantResponse, statementsResponse, transactionsPage]) => {
        setMerchant(merchantResponse);
        setStatements(statementsResponse.statements);
        setTransactions(transactionsPage.transactions);
        setNextCursor(transactionsPage.next_cursor);
      })
      .catch(() =>
        getMerchantInvitation(apiKey, merchantId)
          .then(setInvitation)
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
    setRefreshNote(`Sync #${ingestion_run_id} queued — fresh data will appear shortly.`);
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

  const revokeInvitation = async () => {
    if (!apiKey || !invitation) return;
    if (!window.confirm("Revoke this invitation? The link will stop working immediately.")) return;
    setBusy(true);
    try {
      const updated = await revokeMerchantInvitation(apiKey, invitation.invitation_id);
      setInvitation(updated);
      setInviteLink(null);
    } catch {
      setErrorMessage("Couldn't revoke the invitation.");
    } finally {
      setBusy(false);
    }
  };

  const deleteMerchant = async () => {
    if (!apiKey || !merchantId || !merchant) return;
    if (!window.confirm(`Remove ${merchant.display_name} from your dashboard? You can reconnect them later by inviting again.`)) {
      return;
    }
    setBusy(true);
    try {
      await revokeMerchantAccess(apiKey, merchantId);
      navigate("/dashboard");
    } catch {
      setErrorMessage("Couldn't remove this merchant.");
      setBusy(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (errorMessage && !merchant && !invitation) return <p className="text-red-600">{errorMessage}</p>;

  const displayName =
    merchant?.display_name || invitation?.merchant_name_hint || invitation?.merchant_email || "Merchant";
  const email = merchant?.primary_email ?? invitation?.merchant_email ?? null;

  // Fall back to sample data anywhere the real thing doesn't exist yet.
  const usingMockConnections = !merchant || merchant.connections.length === 0;
  const connections = usingMockConnections ? MOCK_CONNECTIONS : merchant.connections;
  const usingMockTransactions = transactions.length === 0;
  const allTransactions = usingMockTransactions ? MOCK_TRANSACTIONS : transactions;
  const usingMockStatements = statements.length === 0;
  const allStatements = usingMockStatements ? MOCK_STATEMENTS : statements;

  const shownTransactions = selectedProvider
    ? allTransactions.filter((transaction) => transaction.provider_name === selectedProvider)
    : allTransactions;
  const shownInvoices = selectedProvider
    ? MOCK_INVOICES.filter((invoice) => invoice.provider_name === selectedProvider)
    : MOCK_INVOICES;
  const shownStatements = selectedProvider
    ? allStatements.filter((statement) => statement.provider_name === selectedProvider)
    : allStatements;

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
              <>
                <button
                  onClick={requestRefresh}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Refresh data
                </button>
                <button
                  onClick={deleteMerchant}
                  disabled={busy}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Delete merchant
                </button>
              </>
            )}
            {invitation && invitation.status !== "connected" && invitation.status !== "revoked" && (
              <button
                onClick={revokeInvitation}
                disabled={busy}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Revoke invitation
              </button>
            )}
          </div>
        </div>
        {refreshNote && <p className="mt-2 text-sm text-green-700">{refreshNote}</p>}
        {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
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

      {/* Processor rail + data pane */}
      <div className="mt-6 flex flex-col gap-6 md:flex-row">
        {/* Vertical processor tabs */}
        <nav className="w-full shrink-0 md:w-60">
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

            {UPCOMING_PROCESSORS.map((providerName) => (
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
              {usingMockTransactions && <SampleNote />}
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
                        <td className="px-4 py-2.5 capitalize text-slate-700">{transaction.provider_name}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                          {formatMinorUnits(transaction.gross_amount_in_minor_units, transaction.currency_code)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-500">
                          {formatMinorUnits(transaction.processor_fee_in_minor_units, transaction.currency_code)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {formatMinorUnits(transaction.net_amount_in_minor_units, transaction.currency_code)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{transaction.status}</td>
                      </tr>
                    ))}
                    {shownTransactions.length === 0 && <EmptyRow columns={6} />}
                  </tbody>
                </table>
              </div>
              {!usingMockTransactions && nextCursor && (
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
                        <td className="px-4 py-3 capitalize text-slate-700">{invoice.provider_name}</td>
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
              {usingMockStatements && <SampleNote />}
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
                        <td className="px-4 py-3 capitalize text-slate-700">{statement.provider_name}</td>
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
                    {shownStatements.length === 0 && <EmptyRow columns={8} />}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SampleNote() {
  return (
    <p className="mb-3 text-xs text-amber-600">
      Sample data — real data appears here once this merchant connects and syncs.
    </p>
  );
}

function EmptyRow({ columns }: { columns: number }) {
  return (
    <tr>
      <td colSpan={columns} className="px-4 py-8 text-center text-sm text-slate-400">
        Nothing here for this processor.
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
