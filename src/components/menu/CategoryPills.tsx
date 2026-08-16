import { useEffect, useRef } from "react";
import { categories } from "@/lib/menu-data";

type Props = {
  active: string;
  onChange: (id: string) => void;
};

export function CategoryPills({ active, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-cat="${active}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  return (
    <nav
      className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl"
      aria-label="تصنيفات القائمة"
    >
      <div
        ref={containerRef}
        className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3"
      >
        {categories.map((cat) => {
          const isActive = cat.id === active;
          return (
            <button
              key={cat.id}
              data-cat={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              aria-current={isActive ? "true" : undefined}
              className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 ${
                isActive
                  ? "gradient-primary text-primary-foreground shadow-glow scale-105"
                  : "bg-surface text-muted-foreground hover:bg-surface-strong"
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
