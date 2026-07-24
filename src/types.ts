// Mirrors the backend API contract (app/schemas/api.py).

export interface LinkDetails {
  lender_name: string;
  merchant_name_hint: string | null;
  status: "pending" | "opened" | "connected" | "expired";
  connected_processors: string[];
}

export interface ProcessorConnectionSummary {
  provider_name: string;
  status: "active" | "revoked" | "error";
  connected_at: string;
  last_synced_at: string | null;
}

export interface Merchant {
  id: string;
  display_name: string;
  legal_name: string | null;
  primary_email: string | null;
  invitation_id: string | null;
  created_at: string;
  connections: ProcessorConnectionSummary[];
}

export interface Transaction {
  id: string;
  provider_name: string;
  provider_transaction_id: string;
  occurred_at: string;
  funds_available_at: string | null;
  gross_amount_in_minor_units: number;
  processor_fee_in_minor_units: number;
  net_amount_in_minor_units: number;
  currency_code: string;
  status: string;
}

export interface TransactionPage {
  transactions: Transaction[];
  next_cursor: string | null;
}

export interface Statement {
  id: string;
  provider_name: string;
  period_start_date: string;
  period_end_date: string;
  currency_code: string;
  gross_sales_amount_in_minor_units: number;
  refund_total_amount_in_minor_units: number | null;
  chargeback_total_amount_in_minor_units: number | null;
  processor_fee_total_amount_in_minor_units: number | null;
  net_amount_in_minor_units: number | null;
  payout_total_amount_in_minor_units: number | null;
  transaction_count: number | null;
  refund_count: number | null;
  chargeback_count: number | null;
  payout_count: number | null;
}

export interface ActivityEvent {
  id: number;
  action: string;
  actor_type: string;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
}

export interface SyncRun {
  id: number;
  status: "queued" | "running" | "succeeded" | "failed";
  triggered_by: string;
  started_at: string | null;
  finished_at: string | null;
  record_counts: Record<string, number> | null;
}

export interface MerchantInvitation {
  invitation_id: string;
  merchant_email: string;
  merchant_name_hint: string | null;
  merchant_link_url: string | null;
  status: "pending" | "opened" | "connected" | "expired" | "revoked";
  merchant_id: string | null;
  merchant_display_name: string | null;
  connections: ProcessorConnectionSummary[];
  created_at: string;
  expires_at: string;
}
