import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMerchant, listStatements, listTransactions, refreshMerchant } from "../../api";
import { useDashboardAuth } from "../../auth";
import { formatCount, formatDate, formatDateTime, formatMinorUnits, formatPeriod } from "../../format";
import type { Merchant, Statement, Transaction } from "../../types";
import { StatusBadge } from "./MerchantsPage";

export default function MerchantDetailPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const { apiKey } = useDashboardAuth();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [statements, setStatements] = useState<Statement[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || !merchantId) return;
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
      .catch(() => setErrorMessage("Couldn't load this merchant."));
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
    if (!apiKey || !merchantId) return;
    const { ingestion_run_id } = await refreshMerchant(apiKey, merchantId);
    setRefreshNote(`Sync #${ingestion_run_id} queued — fresh data will appear shortly.`);
  };

  if (errorMessage) return <p className="text-red-600">{errorMessage}</p>;
  if (!merchant || statements === null) return <p className="text-slate-500">Loading…</p>;

  const connection = merchant.connections[0];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{merchant.display_name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            {connection && (
              <>
                <span className="capitalize">{connection.provider_name}</span>
                <StatusBadge status={connection.status} />
                <span>· last synced {formatDateTime(connection.last_synced_at)}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={requestRefresh}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh data
        </button>
      </div>
      {refreshNote && <p className="mt-2 text-sm text-green-700">{refreshNote}</p>}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Monthly statements</h2>
        <p className="text-sm text-slate-500">
          The processor's own monthly totals, normalized.
        </p>
        {statements.length === 0 ? (
          <EmptyPanel>No statements yet — the first sync may still be running.</EmptyPanel>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Gross sales</th>
                  <th className="px-4 py-3 text-right">Refunds</th>
                  <th className="px-4 py-3 text-right">Chargebacks</th>
                  <th className="px-4 py-3 text-right">Fees</th>
                  <th className="px-4 py-3 text-right">Payouts</th>
                  <th className="px-4 py-3 text-right">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statements.map((statement) => (
                  <tr key={statement.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatPeriod(statement.period_start_date)}
                      {statements.some(
                        (other) =>
                          other.id !== statement.id &&
                          other.period_start_date === statement.period_start_date,
                      ) && <span className="ml-1 text-xs text-slate-400">({statement.currency_code})</span>}
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
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>
        {transactions.length === 0 ? (
          <EmptyPanel>No transactions yet.</EmptyPanel>
        ) : (
          <>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Fee</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-4 py-2.5 text-slate-700">{formatDate(transaction.occurred_at)}</td>
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
          </>
        )}
      </section>
    </div>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
