// Sample data shown while a merchant has no real synced data yet.
// Everything rendered from this file is labeled "Sample data" in the UI.

import type { ProcessorConnectionSummary, Statement, Transaction } from "./types";

export interface Invoice {
  id: string;
  number: string;
  provider_name: string;
  issued_at: string;
  due_at: string;
  amount_in_minor_units: number;
  currency_code: string;
  status: "paid" | "open" | "overdue";
}

export const MOCK_CONNECTIONS: ProcessorConnectionSummary[] = [
  {
    provider_name: "stripe",
    status: "active",
    connected_at: "2026-06-02T14:21:00Z",
    last_synced_at: "2026-07-22T09:15:00Z",
  },
  {
    provider_name: "paypal",
    status: "active",
    connected_at: "2026-06-18T10:05:00Z",
    last_synced_at: "2026-07-22T09:15:00Z",
  },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "mock-txn-1",
    provider_name: "stripe",
    provider_transaction_id: "ch_3PkQm2Ab",
    occurred_at: "2026-07-21T18:42:00Z",
    funds_available_at: "2026-07-23T00:00:00Z",
    gross_amount_in_minor_units: 12850,
    processor_fee_in_minor_units: 403,
    net_amount_in_minor_units: 12447,
    currency_code: "USD",
    status: "succeeded",
  },
  {
    id: "mock-txn-2",
    provider_name: "paypal",
    provider_transaction_id: "8XA402219H",
    occurred_at: "2026-07-21T15:10:00Z",
    funds_available_at: "2026-07-22T00:00:00Z",
    gross_amount_in_minor_units: 4600,
    processor_fee_in_minor_units: 163,
    net_amount_in_minor_units: 4437,
    currency_code: "USD",
    status: "succeeded",
  },
  {
    id: "mock-txn-3",
    provider_name: "stripe",
    provider_transaction_id: "ch_3PkNw9Cd",
    occurred_at: "2026-07-20T20:03:00Z",
    funds_available_at: "2026-07-22T00:00:00Z",
    gross_amount_in_minor_units: 27999,
    processor_fee_in_minor_units: 841,
    net_amount_in_minor_units: 27158,
    currency_code: "USD",
    status: "succeeded",
  },
  {
    id: "mock-txn-4",
    provider_name: "paypal",
    provider_transaction_id: "3MB871004T",
    occurred_at: "2026-07-20T11:37:00Z",
    funds_available_at: null,
    gross_amount_in_minor_units: 8250,
    processor_fee_in_minor_units: 287,
    net_amount_in_minor_units: 7963,
    currency_code: "USD",
    status: "pending",
  },
  {
    id: "mock-txn-5",
    provider_name: "stripe",
    provider_transaction_id: "ch_3PkJt5Ef",
    occurred_at: "2026-07-19T16:55:00Z",
    funds_available_at: "2026-07-21T00:00:00Z",
    gross_amount_in_minor_units: 15400,
    processor_fee_in_minor_units: 477,
    net_amount_in_minor_units: 14923,
    currency_code: "USD",
    status: "succeeded",
  },
  {
    id: "mock-txn-6",
    provider_name: "stripe",
    provider_transaction_id: "ch_3PkHq1Gh",
    occurred_at: "2026-07-18T13:20:00Z",
    funds_available_at: "2026-07-20T00:00:00Z",
    gross_amount_in_minor_units: 6200,
    processor_fee_in_minor_units: 210,
    net_amount_in_minor_units: 5990,
    currency_code: "USD",
    status: "refunded",
  },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "mock-inv-1",
    number: "INV-2026-0142",
    provider_name: "stripe",
    issued_at: "2026-07-15T00:00:00Z",
    due_at: "2026-08-14T00:00:00Z",
    amount_in_minor_units: 145000,
    currency_code: "USD",
    status: "open",
  },
  {
    id: "mock-inv-2",
    number: "INV-2026-0138",
    provider_name: "stripe",
    issued_at: "2026-07-01T00:00:00Z",
    due_at: "2026-07-31T00:00:00Z",
    amount_in_minor_units: 98500,
    currency_code: "USD",
    status: "paid",
  },
  {
    id: "mock-inv-3",
    number: "PP-88214",
    provider_name: "paypal",
    issued_at: "2026-06-24T00:00:00Z",
    due_at: "2026-07-24T00:00:00Z",
    amount_in_minor_units: 42000,
    currency_code: "USD",
    status: "paid",
  },
  {
    id: "mock-inv-4",
    number: "INV-2026-0121",
    provider_name: "stripe",
    issued_at: "2026-06-05T00:00:00Z",
    due_at: "2026-07-05T00:00:00Z",
    amount_in_minor_units: 61250,
    currency_code: "USD",
    status: "overdue",
  },
];

export const MOCK_STATEMENTS: Statement[] = [
  {
    id: "mock-stmt-1",
    provider_name: "stripe",
    period_start_date: "2026-06-01",
    period_end_date: "2026-06-30",
    currency_code: "USD",
    gross_sales_amount_in_minor_units: 4821500,
    refund_total_amount_in_minor_units: 96400,
    chargeback_total_amount_in_minor_units: 12850,
    processor_fee_total_amount_in_minor_units: 142300,
    net_amount_in_minor_units: 4569950,
    payout_total_amount_in_minor_units: 4560000,
    transaction_count: 412,
    refund_count: 9,
    chargeback_count: 1,
    payout_count: 22,
  },
  {
    id: "mock-stmt-2",
    provider_name: "paypal",
    period_start_date: "2026-06-01",
    period_end_date: "2026-06-30",
    currency_code: "USD",
    gross_sales_amount_in_minor_units: 1240800,
    refund_total_amount_in_minor_units: 31000,
    chargeback_total_amount_in_minor_units: 0,
    processor_fee_total_amount_in_minor_units: 43400,
    net_amount_in_minor_units: 1166400,
    payout_total_amount_in_minor_units: 1160000,
    transaction_count: 168,
    refund_count: 4,
    chargeback_count: 0,
    payout_count: 30,
  },
  {
    id: "mock-stmt-3",
    provider_name: "stripe",
    period_start_date: "2026-05-01",
    period_end_date: "2026-05-31",
    currency_code: "USD",
    gross_sales_amount_in_minor_units: 4512700,
    refund_total_amount_in_minor_units: 84200,
    chargeback_total_amount_in_minor_units: 0,
    processor_fee_total_amount_in_minor_units: 133100,
    net_amount_in_minor_units: 4295400,
    payout_total_amount_in_minor_units: 4290000,
    transaction_count: 389,
    refund_count: 7,
    chargeback_count: 0,
    payout_count: 21,
  },
];
