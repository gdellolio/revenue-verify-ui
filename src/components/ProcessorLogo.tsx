import { siAdyen, siPaypal, siShopify, siSquare, siStripe, type SimpleIcon } from "simple-icons";

export const PROCESSOR_ICONS: Record<string, SimpleIcon> = {
  stripe: siStripe,
  paypal: siPaypal,
  square: siSquare,
  shopify: siShopify,
  adyen: siAdyen,
};

export function ProcessorLogo({
  providerName,
  size = "md",
  className = "",
}: {
  providerName: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const icon = PROCESSOR_ICONS[providerName];
  const box = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const glyph = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  if (!icon) {
    return (
      <span
        className={`flex ${box} items-center justify-center rounded-lg bg-slate-100 text-xs font-bold uppercase text-slate-500 ${className}`}
      >
        {providerName.slice(0, 2)}
      </span>
    );
  }
  return (
    <span
      title={providerName}
      className={`flex ${box} items-center justify-center rounded-lg border border-slate-200 bg-white ${className}`}
    >
      <svg viewBox="0 0 24 24" className={glyph} fill={`#${icon.hex}`} aria-hidden="true">
        <path d={icon.path} />
      </svg>
    </span>
  );
}
