import { useState } from "react";
import { createMerchantInvitation } from "../../api";
import { useDashboardAuth } from "../../auth";
import type { MerchantInvitation } from "../../types";

export default function InviteMerchantPage() {
  const { apiKey } = useDashboardAuth();
  const [merchantEmail, setMerchantEmail] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<MerchantInvitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!apiKey) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      setInvitation(await createMerchantInvitation(apiKey, merchantEmail.trim(), merchantName.trim()));
    } catch {
      setErrorMessage("Couldn't create the invitation. Check the email address and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!invitation?.merchant_link_url) return;
    await navigator.clipboard.writeText(invitation.merchant_link_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (invitation) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8">
        <h1 className="text-xl font-semibold text-slate-900">Invitation created ✓</h1>
        <p className="mt-1 text-sm text-slate-500">
          Send this link to {merchantName || merchantEmail}. It expires{" "}
          {new Date(invitation.expires_at).toLocaleDateString()}.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {invitation.merchant_link_url}
          </code>
          <button
            onClick={copyLink}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <p className="mt-3 text-xs text-amber-600">
          This link is shown once — it can't be retrieved later. If it's lost, create a new invitation.
        </p>
        <button
          onClick={() => {
            setInvitation(null);
            setMerchantEmail("");
            setMerchantName("");
          }}
          className="mt-6 text-sm text-indigo-600 hover:underline"
        >
          Invite another merchant
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold text-slate-900">Invite a merchant</h1>
      <p className="mt-1 text-sm text-slate-500">
        You'll get a secure link to send them. When they connect their payment processor, their
        verified revenue data appears in your dashboard and API.
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
          {submitting ? "Creating…" : "Create invitation link"}
        </button>
        {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}
      </form>
    </div>
  );
}
