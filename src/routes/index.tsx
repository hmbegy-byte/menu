import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flame, MapPin, Plus, ShoppingBag } from "lucide-react";
import heroImage from "@/assets/sea-hero.jpg";
import { CategoryPills } from "@/components/menu/CategoryPills";
import { ItemCustomizer } from "@/components/menu/ItemCustomizer";
import { CartSheet, type CartLine } from "@/components/menu/CartSheet";
import { categories, formatPrice, menuItems, type MenuItem } from "@/lib/menu-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "موج البحر — قائمة المأكولات البحرية الطازجة" },
      {
        name: "description",
        content:
          "اطلب من قائمة موج البحر: أطباق روبيان وهامور مشوي ومقليات طازجة. خصّص طبقك وأرسل طلبك على واتساب.",
      },
      { property: "og:title", content: "موج البحر — قائمة المأكولات البحرية" },
      {
        property: "og:description",
        content: "قائمة رقمية سريعة: خصّص طبقك البحري وأرسل الطلب على واتساب.",
      },
      { property: "og:type", content: "restaurant.menu" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const [activeCategory, setActiveCategory] = useState(categories[0]!.id);
  const [customizing, setCustomizing] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);

  const visibleItems = useMemo(
    () => menuItems.filter((item) => item.category === activeCategory),
    [activeCategory],
  );

  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  return (
    <div className="min-h-screen pb-32">
      <header className="relative h-52 overflow-hidden">
        <img
          src={heroImage}
          alt="واجهة مأكولات بحرية طازجة على الثلج"
          width={1280}
          height={720}
          className="h-full w-full object-cover"
        />
        <div className="fade-mask-bottom absolute inset-0" />
        <div className="absolute right-4 bottom-4 left-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-bold text-primary-glow">
            <Flame className="h-3 w-3" /> طازج من المزاد اليوم
          </span>
          <h1 className="mt-2 text-2xl font-extrabold">موج البحر</h1>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" /> طاولة ١٢ • مشويات وبحريات
          </p>
        </div>
      </header>

      <CategoryPills active={activeCategory} onChange={setActiveCategory} />

      <main key={activeCategory} className="animate-rise-in space-y-3 px-4 pt-4">
        <h2 className="sr-only">
          {categories.find((c) => c.id === activeCategory)?.name}
        </h2>
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCustomizing(item)}
            className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-surface p-3 text-right transition-all duration-200 active:scale-[0.99] hover:bg-surface-strong"
          >
            <div className="min-w-0">
              {item.tag && (
                <span className="mb-1 inline-block rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-extrabold text-accent">
                  {item.tag}
                </span>
              )}
              <h3 className="truncate text-base font-extrabold">{item.name}</h3>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
              <p className="mt-2 text-sm font-extrabold text-primary tabular-nums">
                {formatPrice(item.price)}
              </p>
            </div>
            <div className="relative shrink-0">
              <img
                src={item.image}
                alt={item.name}
                width={800}
                height={800}
                loading="lazy"
                className="h-24 w-24 rounded-2xl object-cover"
              />
              <span className="gradient-primary absolute -bottom-1 -left-1 grid h-8 w-8 place-items-center rounded-full text-primary-foreground shadow-glow">
                <Plus className="h-4 w-4" />
              </span>
            </div>
          </button>
        ))}
      </main>

      {count > 0 && (
        <div className="fixed bottom-0 right-0 left-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="animate-rise-in gradient-primary mx-auto grid w-full max-w-md grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-4 py-3.5 text-primary-foreground shadow-float transition-transform active:scale-[0.98]"
          >
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-foreground/15">
              <ShoppingBag className="h-4 w-4" />
              <span
                key={count}
                className="animate-pop-in absolute -top-1 -left-1 grid h-5 min-w-5 place-items-center rounded-full bg-background px-1 text-[10px] font-extrabold text-foreground"
              >
                {count}
              </span>
            </span>
            <span className="min-w-0 truncate text-sm font-extrabold">عرض السلة</span>
            <span className="shrink-0 text-sm font-extrabold tabular-nums">
              {formatPrice(total)}
            </span>
          </button>
        </div>
      )}

      {customizing && (
        <ItemCustomizer
          item={customizing}
          onClose={() => setCustomizing(null)}
          onAdd={({ item, quantity, unitPrice, selectionLabels }) => {
            setLines((prev) => [
              ...prev,
              {
                key: `${item.id}-${Date.now()}`,
                name: item.name,
                image: item.image,
                quantity,
                unitPrice,
                selectionLabels,
              },
            ]);
            setCustomizing(null);
          }}
        />
      )}

      {cartOpen && (
        <CartSheet
          lines={lines}
          onClose={() => setCartOpen(false)}
          onRemove={(key) => setLines((prev) => prev.filter((l) => l.key !== key))}
        />
      )}
    </div>
  );
}
