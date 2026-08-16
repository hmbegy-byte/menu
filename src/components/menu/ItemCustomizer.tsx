import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Minus, Plus, X } from "lucide-react";
import { formatPrice, type MenuItem } from "@/lib/menu-data";

type Props = {
  item: MenuItem;
  onClose: () => void;
  onAdd: (payload: {
    item: MenuItem;
    quantity: number;
    unitPrice: number;
    selectionLabels: string[];
  }) => void;
};

export function ItemCustomizer({ item, onClose, onAdd }: Props) {
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const group of item.groups) {
      initial[group.id] = group.multiple ? [] : [group.options[0].id];
    }
    return initial;
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const group = item.groups[step];
  const isLast = step === item.groups.length - 1;

  const { unitPrice, labels } = useMemo(() => {
    let total = item.price;
    const names: string[] = [];
    for (const g of item.groups) {
      for (const id of selected[g.id] ?? []) {
        const opt = g.options.find((o) => o.id === id);
        if (opt) {
          total += opt.price;
          names.push(opt.name);
        }
      }
    }
    return { unitPrice: total, labels: names };
  }, [item, selected]);

  const toggle = (optionId: string) => {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (group.multiple) {
        return {
          ...prev,
          [group.id]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      }
      return { ...prev, [group.id]: [optionId] };
    });
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
        aria-label={item.name}
        className="animate-sheet-up relative flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-popover shadow-float"
      >
        <div className="relative h-44 shrink-0">
          <img
            src={item.image}
            alt={item.name}
            width={800}
            height={800}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="fade-mask-bottom absolute inset-0" />
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute top-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-background/70 text-foreground backdrop-blur"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 right-4 left-4">
            <h2 className="truncate text-xl font-extrabold">{item.name}</h2>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {item.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 px-4 pt-4">
          {item.groups.map((g, i) => (
            <div
              key={g.id}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "gradient-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div key={group.id} className="animate-rise-in flex-1 overflow-y-auto px-4 pt-4 pb-5">
          <p className="text-[11px] font-bold text-primary">
            الخطوة {step + 1} من {item.groups.length}
          </p>
          <h3 className="mt-1 text-lg font-extrabold">{group.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{group.subtitle}</p>

          <div className="mt-4 space-y-2">
            {group.options.map((opt) => {
              const isOn = (selected[group.id] ?? []).includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-right transition-all duration-200 ${
                    isOn
                      ? "border-primary bg-primary/12 shadow-glow"
                      : "border-border bg-surface hover:bg-surface-strong"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center border-2 transition-colors ${
                      group.multiple ? "rounded-md" : "rounded-full"
                    } ${isOn ? "gradient-primary border-transparent" : "border-input"}`}
                  >
                    {isOn && (
                      <Check className="animate-pop-in h-3.5 w-3.5 text-primary-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 truncate text-sm font-bold">{opt.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-extrabold ${
                      opt.price === 0
                        ? "bg-muted text-muted-foreground"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    {opt.price === 0 ? "مجانًا" : `+ ${formatPrice(opt.price)}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 border-t border-border/70 bg-popover px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-full bg-surface p-1">
              <button
                type="button"
                aria-label="زيادة"
                onClick={() => setQuantity((q) => q + 1)}
                className="grid h-8 w-8 place-items-center rounded-full bg-surface-strong"
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-sm font-extrabold">{quantity}</span>
              <button
                type="button"
                aria-label="إنقاص"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="grid h-8 w-8 place-items-center rounded-full bg-surface-strong disabled:opacity-40"
                disabled={quantity === 1}
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[11px] text-muted-foreground">الإجمالي</p>
              <p className="truncate text-lg font-extrabold tabular-nums">
                {formatPrice(unitPrice * quantity)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface"
                aria-label="الخطوة السابقة"
              >
                <ChevronLeft className="h-5 w-5 rotate-180" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  onAdd({ item, quantity, unitPrice, selectionLabels: labels });
                } else {
                  setStep((s) => s + 1);
                }
              }}
              className="gradient-primary h-12 flex-1 rounded-2xl text-sm font-extrabold text-primary-foreground shadow-glow transition-transform active:scale-[0.98]"
            >
              {isLast ? "أضف إلى السلة" : "التالي"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
