import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flame, MapPin, Plus, ShoppingBag, Store } from "lucide-react";

import { CategoryPills } from "../components/menu/CategoryPills";
import { ItemCustomizer } from "../components/menu/ItemCustomizer";
import { CartSheet, type CartLine } from "../components/menu/CartSheet";
import { StoreFooter } from "../components/menu/StoreFooter";
import { OffersSlideshow } from "../components/menu/OffersSlideshow";
import { type MenuItem } from "../lib/menu-data";
import { formatCurrency } from "../lib/currency";
import { useStoreData } from "../hooks/useStoreData";
import { BrandUpdater } from "../components/BrandUpdater";
import { supabase } from "../lib/supabase";
import { isOpenAt } from '../lib/workingHours.mjs';
import { discountedPrice } from '../lib/offers.mjs';

export const Route = createFileRoute("/s/$store_slug")({
  head: () => ({
    meta: [
      { property: "og:type", content: "restaurant.menu" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const { store_slug } = Route.useParams();
  const { store, categories, products, offers, settings, payment, appearance, brand_assets, banners, loading, error } =
    useStoreData(store_slug);
  const isWithinWorkingHours =
    !store?.working_hours?.length ||
    (() => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: store.timezone || "Asia/Riyadh",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const part = (type) => parts.find((entry) => entry.type === type)?.value;
      const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
        part("weekday") || "",
      );
      return isOpenAt(store.working_hours, dayIndex, Number(part('hour')) * 60 + Number(part('minute')));
    })();
  const pauseEndsAt = settings?.pausedUntil ? new Date(settings.pausedUntil) : null;
  const isTemporarilyPaused = Boolean(pauseEndsAt && pauseEndsAt.getTime() > Date.now());
  const isAcceptingOrders =
    settings?.acceptingOrders !== false && isWithinWorkingHours && !isTemporarilyPaused;
  const currency = payment?.currency || store?.currency || "SAR";

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [reorderNotice, setReorderNotice] = useState("");
  const query = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const attribution = { campaign: query.get("campaign"), source: query.get("source") };

  // Set initial active category when loaded
  useEffect(() => {
    if (categories.length > 0 && !categories.some((category) => category.id === activeCategory)) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  const mappedCategories = useMemo(() => {
    return (categories || []).map((c) => ({
      id: c.id,
      name: c.name,
      icon: "fish", // Placeholder
    }));
  }, [categories]);

  const mappedProducts = useMemo(() => {
    return products.map((p) => {
      const groups = (p.options || []).map((opt, i) => ({
        id: opt.id || `group_${i}`,
        title: opt.title || "خيارات",
        subtitle: opt.required ? "إجباري" : "اختياري",
        multiple: Boolean(opt.multiple),
        required: Boolean(opt.required),
        minSelections: Number(opt.min_selections ?? (opt.required ? 1 : 0)),
        maxSelections: Number(opt.max_selections ?? (opt.multiple ? (opt.choices || []).length : 1)),
        options: (opt.choices || []).map((c, j) => ({
          id: c.id || `choice_${i}_${j}`,
          name: c.name || c.label || "",
          price: Number(c.extra_price) || Number(c.price) || 0,
          isAvailable: c.is_available !== false,
        })),
      }));

      return {
        id: p.id,
        category: p.category_id,
        name: p.name,
        description: p.description,
        price: discountedPrice(p, offers),
        image: p.image_url || "https://images.unsplash.com/photo-1559286699-2321287c8005?w=800",
        tag: p.tag || "",
        groups: groups,
      };
    });
  }, [products, offers]);

  useEffect(() => {
    const requestedProduct = query.get("product");
    if (requestedProduct) {
      const item = mappedProducts.find((product) => product.id === requestedProduct);
      if (item) { setActiveCategory(item.category); setCustomizing(item); }
    }
  }, [mappedProducts]);

  useEffect(() => {
    const token = query.get("reorder") || query.get("usual");
    if (!token || !store?.id) return;
    const rpcName = query.get("usual") ? "usual_order_preview" : "reorder_preview";
    const params = query.get("usual") ? { p_store_id: store.id, p_access_token: token } : { p_store_id: store.id, p_tracking_token: token };
    supabase.rpc(rpcName, params).then(({ data, error: previewError }) => {
      if (previewError || !data?.items) return setReorderNotice("تعذر استرجاع الطلب السابق.");
      const unavailable: string[] = [];
      const rebuilt = data.items.flatMap((oldItem: any) => {
        const current = mappedProducts.find((product) => product.id === oldItem.product_id);
        if (!current || !oldItem.is_available) { unavailable.push(oldItem.name); return []; }
        const selectedOptions = (oldItem.selected_options || []).filter((choice: any) => current.groups.some((group) => group.id === choice.group_id && group.options.some((option) => option.id === choice.choice_id && option.isAvailable !== false)));
        const requiredMissing = current.groups.some((group) => (group.minSelections || 0) > selectedOptions.filter((choice:any) => choice.group_id===group.id).length);
        if (requiredMissing) { unavailable.push(`${oldItem.name} (تغيّرت خياراته)`); return []; }
        const optionPrice = current.groups.flatMap((group) => group.options).filter((option) => selectedOptions.some((choice:any) => choice.choice_id===option.id)).reduce((sum, option) => sum+option.price,0);
        return [{ key: `${current.id}-${Date.now()}-${Math.random()}`, productId: current.id, name: current.name, image: current.image, quantity: oldItem.quantity, unitPrice: current.price+optionPrice, selectionLabels: selectedOptions.map((choice:any) => choice.name), selectedOptions }];
      });
      setLines(rebuilt); setCartOpen(rebuilt.length>0);
      setReorderNotice(unavailable.length ? `لم نضف: ${unavailable.join("، ")}. راجع السلة والأسعار الحالية قبل التأكيد.` : "أعدنا بناء الطلب بالأسعار والتوفر الحاليين. راجعه قبل التأكيد.");
    });
  }, [store?.id, mappedProducts]);

  const visibleItems = useMemo(
    () => mappedProducts.filter((item) => item.category === activeCategory),
    [activeCategory, mappedProducts],
  );

  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }
  if (error || !store)
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-extrabold">تعذر فتح القائمة</h1>
          <p className="mt-2 text-muted-foreground">{error || "المطعم غير موجود"}</p>
        </div>
      </div>
    );

  return (
    <div
      className="min-h-screen bg-slate-50 font-cairo transition-colors duration-300"
      style={{
        "--theme-primary": appearance?.primaryColor || "#0284c7",
      } as CSSProperties}
    >
      <BrandUpdater assets={brand_assets || {}} isStore />

      <header className="relative h-52 overflow-hidden bg-surface-strong">
        <img
          src={
            store.cover_url ||
            "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=1000"
          }
          alt={store.name}
          width={1280}
          height={720}
          className="h-full w-full object-cover"
        />
        <div className="fade-mask-bottom absolute inset-0 bg-black/30" />
        <div className="absolute right-4 bottom-4 left-4 flex gap-4 items-end">
          <div className="w-20 h-20 rounded-full border-2 border-white shadow-lg bg-white/20 backdrop-blur-sm overflow-hidden flex items-center justify-center shrink-0">
            {store.logo_url ? (
              <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Store className="w-8 h-8 text-white/70" />
            )}
          </div>
          <div className="flex-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-bold text-primary-glow">
              <Flame className="h-3 w-3" /> طازج من المزاد اليوم
            </span>
            <h1 className="mt-2 text-2xl font-extrabold text-white">{store.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-200">
              <MapPin className="h-3 w-3 shrink-0" /> {store.bio || "مشويات وبحريات"}
            </p>
          </div>
        </div>
      </header>

      <OffersSlideshow banners={banners} onOrder={id => { const item = mappedProducts.find(p => p.id===id); if (item && isAcceptingOrders) { setActiveCategory(item.category); setCustomizing(item); } else document.getElementById('store-offers')?.scrollIntoView({behavior:'smooth'}); }} />
      <section id="store-offers" className="mx-4 mt-4 space-y-3" aria-label="العروض والخصومات">
        {offers.filter(o => o.active).map(offer => <article key={offer.id} className="rounded-2xl border bg-surface p-4">
          <h2 className="text-lg font-bold">{offer.title}</h2><p className="text-primary">خصم {offer.discount_percentage}% {offer.product_id ? 'على الصنف المحدد' : 'على الأصناف'} — يطبق تلقائيًا، ولا يشمل الإضافات.</p>
          <div className="mt-3 flex flex-wrap gap-2">{mappedProducts.filter(p => !offer.product_id || p.id===offer.product_id).map(p => <button disabled={!isAcceptingOrders} key={p.id} onClick={() => { setActiveCategory(p.category); setCustomizing(p); }} className="rounded-xl border px-3 py-2">{p.name} · {formatCurrency(p.price,currency)} — إضافة</button>)}</div>
        </article>)}
      </section>

      {!isAcceptingOrders && (
        <div className="bg-destructive/10 text-destructive p-3 text-center text-sm font-bold mx-4 mt-4 rounded-xl">
          {isTemporarilyPaused && settings?.pauseReason
            ? settings.pauseReason
            : "عذراً، المطعم لا يستقبل طلبات في الوقت الحالي."}
        </div>
      )}
      {reorderNotice && <div className="mx-4 mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">{reorderNotice}</div>}

      <CategoryPills
        active={activeCategory || ""}
        onChange={setActiveCategory}
        categories={mappedCategories}
      />

      <main key={activeCategory} className="animate-rise-in space-y-3 px-4 pt-4">
        <h2 className="sr-only">{mappedCategories.find((c) => c.id === activeCategory)?.name}</h2>
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              try {
                if (isAcceptingOrders) {
                  if (!item.groups || item.groups.length === 0) {
                    setLines((prev) => [
                      ...prev,
                      {
                        key: `${item.id}-${Date.now()}`,
                        productId: item.id,
                        name: item.name,
                        image: item.image,
                        quantity: 1,
                        unitPrice: item.price,
                        selectionLabels: [],
                        selectedOptions: [],
                      },
                    ]);
                  } else {
                    setCustomizing(item);
                  }
                }
              } catch (err) {
                console.error("Error handling product click:", err);
              }
            }}
            disabled={!isAcceptingOrders}
            className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-surface p-3 text-right transition-all duration-200 hover:bg-surface-strong ${!isAcceptingOrders ? "opacity-50 cursor-not-allowed" : "active:scale-[0.99]"}`}
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
                {formatCurrency(item.price, currency)}
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

      {mappedCategories.length === 0 && (
        <div className="px-4 py-16 text-center text-muted-foreground">
          لم تُضف تصنيفات إلى القائمة بعد.
        </div>
      )}
      {mappedCategories.length > 0 && visibleItems.length === 0 && (
        <div className="px-4 py-12 text-center text-muted-foreground">
          لا توجد أصناف متاحة في هذا التصنيف.
        </div>
      )}

      <StoreFooter store={store} />

      {count > 0 && isAcceptingOrders && (
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
              {formatCurrency(total, currency)}
            </span>
          </button>
        </div>
      )}

      {customizing && (
        <ItemCustomizer
          item={customizing}
          currency={currency}
          onClose={() => setCustomizing(null)}
          onAdd={({ item, quantity, unitPrice, selectionLabels, selectedOptions }) => {
            try {
              setLines((prev) => [
                ...prev,
                {
                  key: `${item.id}-${Date.now()}`,
                  productId: item.id,
                  name: item.name,
                  image: item.image,
                  quantity,
                  unitPrice,
                  selectionLabels,
                  selectedOptions,
                },
              ]);
              setCustomizing(null);
            } catch (err) {
              console.error("Error adding customized item:", err);
            }
          }}
        />
      )}

      {cartOpen && (
        <CartSheet
          lines={lines}
          onClose={() => setCartOpen(false)}
          onRemove={(key) => setLines((prev) => prev.filter((l) => l.key !== key))}
          onChangeQuantity={(key, quantity) =>
            setLines((prev) =>
              prev.map((line) => (line.key === key ? { ...line, quantity } : line)),
            )
          }
          onSubmitted={() => setLines([])}
          store={{ ...store, attribution }}
          settings={settings}
          payment={payment}
        />
      )}
    </div>
  );
}
