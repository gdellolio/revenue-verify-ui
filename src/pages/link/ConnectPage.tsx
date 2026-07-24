// The merchant consent screen — the highest-trust moment in the product.
// States: loading → consent (processor picker) | already connected | invalid | expired.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError, getLinkDetails, startStripeAuthorization } from "../../api";
import { ProcessorLogo } from "../../components/ProcessorLogo";
import type { LinkDetails } from "../../types";

type PageState =
  | { kind: "loading" }
  | { kind: "ready"; details: LinkDetails }
  | { kind: "invalid" }
  | { kind: "expired" };

// Stripe is live; the rest are shown so merchants see where their processor fits.
const PROCESSORS: { name: string; label: string; available: boolean }[] = [
  { name: "stripe", label: "Stripe", available: true },
  { name: "square", label: "Square", available: false },
  { name: "paypal", label: "PayPal", available: false },
  { name: "shopify", label: "Shopify Payments", available: false },
];

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
          <h1 className="text-xl font-semibold text-slate-900">
            {state.details.lender_name} is requesting your revenue data
          </h1>
          {state.details.merchant_name_hint && (
            <p className="mt-1 text-sm text-slate-500">for {state.details.merchant_name_hint}</p>
          )}

          <p className="mt-5 text-sm font-medium text-slate-900">Choose your payment processor</p>
          <div className="mt-2 space-y-2">
            {PROCESSORS.map((processor) =>
              processor.available ? (
                <button
                  key={processor.name}
                  onClick={connectStripe}
                  disabled={redirecting}
                  className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50/50 disabled:opacity-60"
                >
                  <ProcessorLogo providerName={processor.name} />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-slate-900">{processor.label}</span>
                    <span className="block text-xs text-slate-400">
                      {redirecting ? "Redirecting…" : "Sign in securely on their site"}
                    </span>
                  </span>
                  <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500">
                    →
                  </span>
                </button>
              ) : (
                <div
                  key={processor.name}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 opacity-60"
                >
                  <ProcessorLogo providerName={processor.name} />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-slate-500">{processor.label}</span>
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    Coming soon
                  </span>
                </div>
              ),
            )}
          </div>
          {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Read-only access.</span> Only your payment
              history — transactions and monthly statements — is shared, solely to verify your revenue.
            </p>
            <p className="mt-2">
              <span className="font-medium text-slate-900">Your login stays yours.</span> You sign in on
              your processor's own site — we never see your password, and no one can move money or
              change your account. You can revoke access there at any time.
            </p>
          </div>
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
