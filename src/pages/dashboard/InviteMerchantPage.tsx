import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMerchantInvitation } from "../../api";
import { useDashboardAuth } from "../../auth";

export default function InviteMerchantPage() {
  const { apiKey } = useDashboardAuth();
  const navigate = useNavigate();
  const [merchantEmail, setMerchantEmail] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invited, setInvited] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!apiKey) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await createMerchantInvitation(apiKey, merchantEmail.trim(), merchantName.trim());
      setInvited(true);
    } catch {
      setErrorMessage("Couldn't create the invitation. Check the email address and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold text-slate-900">Invite a merchant</h1>
      <p className="mt-1 text-sm text-slate-500">
        When they connect their payment processor, their verified revenue data appears in your
        dashboard and API.
      </p>
      <form onSubmit={submit} className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
        <label className="block text-sm font-medium text-slate-700">
          Merchant email
          <input
            type="email"
            required
            value={merchantEmail}
            onChange={(event) => setMerchantEmail(event.target.value)}
            placeholder="owner@joespizza.com"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Business name <span className="font-normal text-slate-400">(optional)</span>
          <input
            type="text"
            value={merchantName}
            onChange={(event) => setMerchantName(event.target.value)}
            placeholder="Joe's Pizza"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send invitation"}
        </button>
        {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}
      </form>

      {invited && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <span className="text-2xl text-green-600">✓</span>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Invitation sent</h2>
            <p className="mt-1 text-sm text-slate-500">
              {merchantName || merchantEmail} has been invited. You'll see their status update on the
              merchants list once they open the link.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700"
            >
              Back to merchants
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
