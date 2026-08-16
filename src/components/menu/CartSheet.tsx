import { useEffect } from "react";
import { ShoppingBag, Trash2, X } from "lucide-react";
import { formatPrice } from "@/lib/menu-data";

export type CartLine = {
  key: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  selectionLabels: string[];
};

type Props = {
  lines: CartLine[];
  onClose: () => void;
  onRemove: (key: string) => void;
};

export function CartSheet({ lines, onClose, onRemove }: Props) {
  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const whatsappHref = () => {
    const body = lines
      .map(
        (l) =>
          `• ${l.quantity}× ${l.name}${
            l.selectionLabels.length ? ` (${l.selectionLabels.join("، ")})` : ""
          } — ${formatPrice(l.unitPrice * l.quantity)}`,
      )
      .join("\n");
    const text = `طلب جديد من مطعم موج البحر\n\n${body}\n\nالإجمالي: ${formatPrice(total)}`;
    return `https://wa.me/966500000000?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="سلة الطلب"
        className="animate-sheet-up relative flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-popover shadow-float"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 px-4 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <ShoppingBag className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="truncate text-lg font-extrabold">سلة الطلب</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {lines.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              السلة فارغة — اختر طبقك المفضل
            </p>
          )}
          {lines.map((l) => (
            <div
              key={l.key}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-surface p-3"
            >
              <img
                src={l.image}
                alt={l.name}
                width={800}
                height={800}
                loading="lazy"
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {l.quantity}× {l.name}
                </p>
                {l.selectionLabels.length > 0 && (
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">
                    {l.selectionLabels.join("، ")}
                  </p>
                )}
                <p className="mt-1 text-xs font-extrabold text-primary tabular-nums">
                  {formatPrice(l.unitPrice * l.quantity)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(l.key)}
                aria-label={`حذف ${l.name}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-strong text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-border/70 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">الإجمالي</span>
            <span className="text-xl font-extrabold tabular-nums">{formatPrice(total)}</span>
          </div>
          <a
            href={lines.length ? whatsappHref() : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={lines.length === 0}
            className={`gradient-primary mt-3 flex h-13 items-center justify-center rounded-2xl py-3.5 text-sm font-extrabold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] ${
              lines.length === 0 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            إرسال الطلب على واتساب
          </a>
        </div>
      </div>
    </div>
  );
}
