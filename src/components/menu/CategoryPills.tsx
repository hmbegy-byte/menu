import { useEffect, useRef } from "react";

type Category = {
  id: string;
  name: string;
  icon?: string;
};

type Props = {
  active: string;
  onChange: (id: string) => void;
  categories: Category[];
};

export function CategoryPills({ active, onChange, categories = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-cat="${active}"]`);
    el?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [active]);

  return (
    <nav
      className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl"
      aria-label="تصنيفات القائمة"
    >
      <div
        ref={containerRef}
        className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2.5"
      >
        {(categories || []).map((cat) => {
          const isActive = cat.id === active;
          return (
            <button
              key={cat.id}
              data-cat={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              aria-current={isActive ? "true" : undefined}
              className={`relative min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-transparent bg-surface text-muted-foreground hover:bg-surface-strong hover:text-foreground"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
