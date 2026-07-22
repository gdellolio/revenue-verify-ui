// Where the Stripe OAuth callback lands the merchant: ?outcome=connected|failed|invalid

import { useSearchParams } from "react-router-dom";

const OUTCOMES: Record<string, { title: string; message: string; tone: "success" | "error" }> = {
  connected: {
    title: "You're connected ✓",
    message:
      "Your revenue data is now being securely shared. You can close this window — there's nothing more to do.",
    tone: "success",
  },
  failed: {
    title: "Connection not completed",
    message:
      "Your Stripe account was not connected. You can reopen the link from your lender and try again.",
    tone: "error",
  },
  invalid: {
    title: "This link isn't valid",
    message: "The connection link is no longer valid. Ask your lender to send a new one.",
    tone: "error",
  },
};

export default function CompletePage() {
  const [searchParams] = useSearchParams();
  const outcome = OUTCOMES[searchParams.get("outcome") ?? ""] ?? OUTCOMES.invalid;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <p className="mb-4 text-center text-sm font-semibold tracking-wide text-slate-400">
          REVENUE VERIFY
        </p>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
              outcome.tone === "success" ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {outcome.tone === "success" ? "✓" : "!"}
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">{outcome.title}</h1>
          <p className="mt-2 text-slate-600">{outcome.message}</p>
        </div>
      </div>
    </div>
  );
}
