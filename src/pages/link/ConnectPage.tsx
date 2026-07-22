// The merchant consent screen — the highest-trust moment in the product.
// States: loading → consent | already connected | invalid | expired.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError, getLinkDetails, startStripeAuthorization } from "../../api";
import type { LinkDetails } from "../../types";

type PageState =
  | { kind: "loading" }
  | { kind: "ready"; details: LinkDetails }
  | { kind: "invalid" }
  | { kind: "expired" };

export default function ConnectPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [redirecting, setRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getLinkDetails(token)
      .then((details) => setState({ kind: "ready", details }))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 410) setState({ kind: "expired" });
        else setState({ kind: "invalid" });
      });
  }, [token]);

  const connectStripe = async () => {
    if (!token) return;
    setRedirecting(true);
    setErrorMessage(null);
    try {
      const { redirect_url } = await startStripeAuthorization(token);
      window.location.href = redirect_url;
    } catch (error: unknown) {
      setRedirecting(false);
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <Shell>
      {state.kind === "loading" && <p className="text-center text-slate-500">Loading…</p>}

      {state.kind === "invalid" && (
        <Notice title="This link isn't valid">
          Please check the link you received, or ask your lender to send a new one.
        </Notice>
      )}

      {state.kind === "expired" && (
        <Notice title="This link has expired">
          For your security, connection links only work for a limited time. Ask your lender to send a
          fresh one.
        </Notice>
      )}

      {state.kind === "ready" && state.details.status === "connected" && (
        <Notice title="Already connected ✓">
          Your revenue data is already being securely shared with {state.details.lender_name}. There's
          nothing more to do.
        </Notice>
      )}

      {state.kind === "ready" && state.details.status !== "connected" && (
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {state.details.lender_name} is requesting your revenue data
          </h1>
          {state.details.merchant_name_hint && (
            <p className="mt-1 text-slate-500">for {state.details.merchant_name_hint}</p>
          )}

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-medium text-slate-900">What will be shared</p>
            <ul className="mt-2 space-y-1.5 text-slate-600">
              <li>✓ Read-only payment history — transactions and monthly statements</li>
              <li>✓ Used only to verify your revenue for financing</li>
            </ul>
            <p className="mt-3 font-medium text-slate-900">What will never happen</p>
            <ul className="mt-2 space-y-1.5 text-slate-600">
              <li>✗ We never see your password — you sign in on Stripe's own site</li>
              <li>✗ No one can move money or make changes to your account</li>
            </ul>
          </div>

          <button
            onClick={connectStripe}
            disabled={redirecting}
            className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {redirecting ? "Redirecting to Stripe…" : "Connect with Stripe"}
          </button>
          {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}
          <p className="mt-4 text-center text-xs text-slate-400">
            You can revoke access at any time from your Stripe dashboard.
          </p>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <p className="mb-4 text-center text-sm font-semibold tracking-wide text-slate-400">
          REVENUE VERIFY
        </p>
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">{children}</div>
      </div>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{children}</p>
    </div>
  );
}
