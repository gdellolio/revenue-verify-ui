import type {
  LinkDetails,
  Merchant,
  MerchantInvitation,
  Statement,
  TransactionPage,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  code: string | null;

  constructor(status: number, code: string | null, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<ResponseBody>(
  path: string,
  options: { method?: string; body?: unknown; apiKey?: string } = {},
): Promise<ResponseBody> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.apiKey) headers["Authorization"] = `Bearer ${options.apiKey}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let code: string | null = null;
    let message = `Request failed (${response.status})`;
    try {
      const errorBody = await response.json();
      code = errorBody?.detail?.code ?? null;
      message = errorBody?.detail?.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, code, message);
  }
  return response.json() as Promise<ResponseBody>;
}

// --- merchant link flow (no auth: the link token is the auth) ---

export function getLinkDetails(token: string): Promise<LinkDetails> {
  return request(`/v1/link/${token}`);
}

export function startStripeAuthorization(token: string): Promise<{ redirect_url: string }> {
  return request(`/v1/link/${token}/stripe/authorize`, { method: "POST" });
}

// --- lender API (API key auth) ---

export function listMerchants(apiKey: string): Promise<{ merchants: Merchant[] }> {
  return request("/v1/merchants", { apiKey });
}

export function getMerchant(apiKey: string, merchantId: string): Promise<Merchant> {
  return request(`/v1/merchants/${merchantId}`, { apiKey });
}

export function listStatements(apiKey: string, merchantId: string): Promise<{ statements: Statement[] }> {
  return request(`/v1/merchants/${merchantId}/statements`, { apiKey });
}

export function listTransactions(
  apiKey: string,
  merchantId: string,
  cursor: string | null,
): Promise<TransactionPage> {
  const query = cursor ? `?limit=50&cursor=${encodeURIComponent(cursor)}` : "?limit=50";
  return request(`/v1/merchants/${merchantId}/transactions${query}`, { apiKey });
}

export function refreshMerchant(
  apiKey: string,
  merchantId: string,
): Promise<{ ingestion_run_id: number; status: string }> {
  return request(`/v1/merchants/${merchantId}/refresh`, { method: "POST", apiKey });
}

export function createMerchantInvitation(
  apiKey: string,
  merchantEmail: string,
  merchantNameHint: string,
): Promise<MerchantInvitation> {
  return request("/v1/merchant-invitations", {
    method: "POST",
    apiKey,
    body: {
      merchant_email: merchantEmail,
      merchant_name_hint: merchantNameHint || null,
    },
  });
}
