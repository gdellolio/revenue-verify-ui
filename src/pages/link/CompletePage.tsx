// Where the Stripe OAuth callback lands the merchant: ?outcome=connected|failed|invalid

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const OUTCOMES: Record<string, { title: string; message: string; tone: "success" | "error" }> = {
  connected: {
    title: "You're all set",
    message:
      "Your revenue data is now being securely shared. You can close this window, there's nothing more to do.",
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

const CONFETTI_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#0ea5e9", "#a855f7"];

export default function CompletePage() {
  const [searchParams] = useSearchParams();
  const outcome = OUTCOMES[searchParams.get("outcome") ?? ""] ?? OUTCOMES.invalid;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      {outcome.tone === "success" && <Confetti />}
      <div className="w-full max-w-md">
        <p className="mb-4 text-center text-sm font-semibold tracking-wide text-slate-400">
          REVENUE VERIFY
        </p>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          {outcome.tone === "success" ? (
            <AnimatedCheck />
          ) : (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
              !
            </div>
          )}
          <h1 className="mt-4 text-xl font-semibold text-slate-900">{outcome.title}</h1>
          <p className="mt-2 text-slate-600">{outcome.message}</p>
        </div>
      </div>
    </div>
  );
}

function AnimatedCheck() {
  return (
    <>
      <style>{`
        @keyframes check-pop {
          0% { transform: scale(0); }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes check-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100"
        style={{ animation: "check-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" strokeWidth="3">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: 24,
              animation: "check-draw 0.4s ease-out 0.3s forwards",
            }}
          />
        </svg>
      </div>
    </>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.4 + Math.random() * 1.8,
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        tilt: Math.random() * 360,
        drift: -40 + Math.random() * 80,
        round: Math.random() > 0.6,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translate3d(0, -8vh, 0) rotate(0deg); opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translate3d(var(--drift), 105vh, 0) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 block"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.round ? piece.size : piece.size * 0.45,
            backgroundColor: piece.color,
            borderRadius: piece.round ? "50%" : 2,
            transform: `rotate(${piece.tilt}deg)`,
            ["--drift" as string]: `${piece.drift}px`,
            animation: `confetti-fall ${piece.duration}s ease-in ${piece.delay}s both`,
          }}
        />
      ))}
    </div>
  );
}
