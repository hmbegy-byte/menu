export default function HmbWordmark({
  compact = false,
  dark = false,
  productName = "HMB Serve",
  companyName = "HMB Digital Solutions",
  logoUrl = "/hmb-logo-mark.png",
}: {
  compact?: boolean;
  dark?: boolean;
  productName?: string;
  companyName?: string | undefined;
  logoUrl?: string;
}) {
  return (
    <div className="flex items-center gap-3" aria-label={`${productName} — ${companyName}`}>
      <img
        src={logoUrl}
        alt=""
        width="88"
        height="44"
        className="h-11 w-[5.5rem] shrink-0 object-contain"
      />
      {!compact && (
        <div className="leading-tight">
          <strong className={`block text-lg ${dark ? "text-white" : "text-[#0B1F3B]"}`}>
            {productName}
          </strong>
          <span className={`text-xs tracking-wide ${dark ? "text-slate-300" : "text-slate-500"}`}>
            {companyName}
          </span>
        </div>
      )}
    </div>
  );
}
