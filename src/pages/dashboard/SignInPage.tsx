import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, listMerchants } from "../../api";
import { useDashboardAuth } from "../../auth";

export default function SignInPage() {
  const { signIn } = useDashboardAuth();
  const navigate = useNavigate();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const apiKey = apiKeyInput.trim();
    if (!apiKey) return;
    setChecking(true);
    setErrorMessage(null);
    try {
      await listMerchants(apiKey); // validates the key
      signIn(apiKey);
      navigate("/dashboard");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof ApiError && error.status === 401
          ? "That API key wasn't recognized."
          : "Couldn't reach the API. Is the backend running?",
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <p className="mb-4 text-center text-sm font-semibold tracking-wide text-slate-400">
          REVENUE VERIFY
        </p>
        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Lender dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in with your organization's API key.</p>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
            placeholder="rvk_live_…"
            autoFocus
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={checking || !apiKeyInput.trim()}
            className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {checking ? "Checking…" : "Continue"}
          </button>
          {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}
        </form>
      </div>
    </div>
  );
}
