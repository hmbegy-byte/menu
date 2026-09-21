import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock3,
  MapPin,
  PauseCircle,
  Plus,
  ShoppingBag,
  Store,
  Truck,
  UtensilsCrossed,
} from "lucide-react";

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
import { isOpenAt } from "../lib/workingHours.mjs";
import { discountedPrice } from "../lib/offers.mjs";
import { brandText } from "../lib/brandContrast.mjs";
import { menuSelectionMode } from "../lib/menuSelection.mjs";
import { getMenuOrderMethods, getMenuOrderStatus } from "../lib/storefrontView.mjs";
import type {
  CatalogProduct,
  CatalogCategory,
  CatalogChoice,
  CatalogOption,
} from "../lib/catalogTypes";
type PublicProduct = Omit<CatalogProduct, "options"> & {
  tag?: string;
  options: Array<
    Omit<CatalogOption, "choices"> & {
      choices: Array<CatalogChoice & { label?: string; price?: number }>;
    }
  >;
};

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
  useEffect(() => {
    localStorage.setItem("flavor-flow:last-store", store_slug.toLowerCase());
  }, [store_slug]);
  const {
    store,
    categories: loadedCategories,
    products: loadedProducts,
    offers: loadedOffers,
    settings,
    payment,
    appearance,
    brand_assets,
    banners,
    loading,
    error,
  } = useStoreData(store_slug);
  const categories: CatalogCategory[] = loadedCategories;
  const products: PublicProduct[] = loadedProducts;
  const offers: Array<{
    id: string;
    title: string;
    product_id?: string | null;
    discount_percentage: number;
    active: boolean;
    image_url?: string;
  }> = loadedOffers;
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
      const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((entry) => entry.type === type)?.value;
      const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
        part("weekday") || "",
      );
      return isOpenAt(
        store.working_hours,
        dayIndex,
        Number(part("hour")) * 60 + Number(part("minute")),
      );
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
  const search = useLocation({ select: (location) => location.searchStr });
  const query = useMemo(() => new URLSearchParams(search), [search]);
  const attribution = { campaign: query.get("campaign"), source: query.get("source") };

  // Set initial active category when loaded
  useEffect(() => {
    if (categories.length > 0 && !categories.some((category) => category.id === activeCategory)) {
      setActiveCategory(categories[0]?.id ?? null);
    }
  }, [categories, activeCategory]);

  const mappedCategories = useMemo(() => {
    return (categories || []).map((c) => ({
      id: c.id,
      name: c.name,
    }));
  }, [categories]);

  const mappedProducts = useMemo(() => {
    return products.map((p) => {
      const groups = (p.options || []).map((opt, i) => ({
        id: opt.id ?? opt.title ?? "",
        title: opt.title || "خيارات",
        subtitle: opt.required ? "إجباري" : "اختياري",
        multiple: Boolean(opt.multiple),
        required: Boolean(opt.required),
        minSelections: Number(opt.min_selections ?? (opt.required ? 1 : 0)),
        maxSelections: Number(
          opt.max_selections ?? (opt.multiple ? (opt.choices || []).length : 1),
        ),
        options: (opt.choices || []).map((c, j) => ({
          id: c.id ?? c.name ?? c.label ?? "",
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
        image: p.image_url || "",
        tag: p.tag || "",
        groups: groups,
      };
    });
  }, [products, offers]);

  useEffect(() => {
    const requestedProduct = query.get("product");
    if (requestedProduct) {
      const item = mappedProducts.find((product) => product.id === requestedProduct);
      if (item) {
        setActiveCategory(item.category);
        setCustomizing(item);
      }
    }
  }, [mappedProducts, query]);

  useEffect(() => {
    const token = query.get("reorder") || query.get("usual");
    if (!token || !store?.id) return;
    const rpcName = query.get("usual") ? "usual_order_preview" : "reorder_preview";
    const params = query.get("usual")
      ? { p_store_id: store.id, p_access_token: token }
      : { p_store_id: store.id, p_tracking_token: token };
    supabase.rpc(rpcName, params).then(({ data, error: previewError }) => {
      if (previewError || !data?.items) return setReorderNotice("تعذر استرجاع الطلب السابق.");
      const unavailable: string[] = [];
      const rebuilt = data.items.flatMap(
        (oldItem: {
          product_id: string;
          name: string;
          is_available: boolean;
          quantity: number;
          selected_options?: NonNullable<CartLine["selectedOptions"]>;
        }) => {
          const current = mappedProducts.find((product) => product.id === oldItem.product_id);
          if (!current || !oldItem.is_available) {
            unavailable.push(oldItem.name);
            return [];
          }
          const selectedOptions = (oldItem.selected_options || []).filter((choice) =>
            current.groups.some(
              (group) =>
                group.id === choice.group_id &&
                group.options.some(
                  (option) => option.id === choice.choice_id && option.isAvailable !== false,
                ),
            ),
          );
          const requiredMissing = current.groups.some(
            (group) =>
              (group.minSelections || 0) >
              selectedOptions.filter((choice) => choice.group_id === group.id).length,
          );
          if (requiredMissing) {
            unavailable.push(`${oldItem.name} (تغيّرت خياراته)`);
            return [];
          }
          const optionPrice = current.groups
            .flatMap((group) => group.options)
            .filter((option) => selectedOptions.some((choice) => choice.choice_id === option.id))
            .reduce((sum, option) => sum + option.price, 0);
          return [
            {
              key: `${current.id}-${Date.now()}-${Math.random()}`,
              productId: current.id,
              name: current.name,
              image: current.image,
              quantity: oldItem.quantity,
              unitPrice: current.price + optionPrice,
              selectionLabels: selectedOptions.map((choice) => choice.name),
              selectedOptions,
            },
          ];
        },
      );
      setLines(rebuilt);
      setCartOpen(rebuilt.length > 0);
      setReorderNotice(
        unavailable.length
          ? `لم نضف: ${unavailable.join("، ")}. راجع السلة والأسعار الحالية قبل التأكيد.`
          : "أعدنا بناء الطلب بالأسعار والتوفر الحاليين. راجعه قبل التأكيد.",
      );
    });
  }, [store?.id, mappedProducts, query]);

  const visibleItems = useMemo(
    () => mappedProducts.filter((item) => item.category === activeCategory),
    [activeCategory, mappedProducts],
  );

  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const activeOffers = offers.filter((offer) => offer.active);
  const configuredEta = Number(settings?.pickupEtaMinutes || 0);
  const orderMethods = getMenuOrderMethods(settings);
  const orderStatus = getMenuOrderStatus({
    acceptingOrders: settings?.acceptingOrders,
    isWithinWorkingHours,
    isTemporarilyPaused,
    pauseReason: settings?.pauseReason,
  });

  useEffect(() => {
    const checkoutActive = count > 0 || Boolean(customizing) || cartOpen;
    window.dispatchEvent(
      new CustomEvent("flavor-flow:checkout-active", { detail: checkoutActive }),
    );
    return () => {
      window.dispatchEvent(new CustomEvent("flavor-flow:checkout-active", { detail: false }));
    };
  }, [count, customizing, cartOpen]);

  const selectProduct = (item: MenuItem) => {
    setActiveCategory(item.category);
    if (menuSelectionMode(item) === "customize") {
      setCustomizing(item);
      return;
    }
    setLines((previous) => [
      ...previous,
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
  };

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
      className="storefront min-h-screen font-cairo transition-colors duration-300"
      style={
        {
          "--theme-primary": appearance?.primaryColor || "#2563eb",
          "--primary": appearance?.primaryColor || "#2563eb",
          "--primary-glow": appearance?.primaryColor || "#2563eb",
          "--ring": appearance?.primaryColor || "#2563eb",
          "--primary-foreground": brandText(appearance?.primaryColor || "#2563eb"),
        } as CSSProperties
      }
    >
      <BrandUpdater assets={brand_assets || {}} isStore />

      <header
        className={`relative min-h-40 overflow-hidden ${store.cover_url ? "bg-slate-900" : "bg-primary"}`}
      >
        {store.cover_url && (
          <img
            src={store.cover_url}
            alt=""
            width={1280}
            height={720}
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div
          className={`absolute inset-0 ${store.cover_url ? "bg-gradient-to-t from-black/90 via-black/55 to-black/25" : "bg-gradient-to-l from-black/20 to-transparent"}`}
        />
        <div className="relative mx-auto flex min-h-40 max-w-6xl items-end gap-3 px-4 py-5 text-white sm:min-h-52 sm:gap-5 sm:py-7">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/60 bg-white/15 backdrop-blur-sm sm:h-20 sm:w-20">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={`شعار ${store.name}`}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
              />
            ) : (
              <Store className="h-7 w-7 text-white/85" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {settings?.menuTagline?.trim() && (
              <p className="mb-1 inline-flex max-w-full rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                {settings.menuTagline.trim()}
              </p>
            )}
            <h1 className="text-xl font-black text-white sm:text-3xl">
              <bdi dir="auto">{store.name}</bdi>
            </h1>
            {store.bio?.trim() && (
              <p className="mt-1 line-clamp-2 max-w-2xl text-xs leading-5 text-white/85 sm:text-sm">
                {store.bio.trim()}
              </p>
            )}
            {store.legal?.nationalAddress?.trim() && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-white/75">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="line-clamp-1">{store.legal.nationalAddress.trim()}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      <section
        aria-label="معلومات الطلب"
        className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 text-xs"
      >
        <span
          className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 font-bold ${
            orderStatus.tone === "open"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
          }`}
        >
          {orderStatus.tone === "open" ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {orderStatus.label}
        </span>
        {configuredEta > 0 && (
          <span className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border bg-surface px-3 font-bold">
            <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            التحضير قرابة {configuredEta} دقيقة
          </span>
        )}
        <span className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border bg-surface px-3 font-bold">
          <Truck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {orderMethods.join(" · ")}
        </span>
      </section>

      <OffersSlideshow
        banners={banners}
        onOrder={(id) => {
          const item = mappedProducts.find((p) => p.id === id);
          if (item && isAcceptingOrders) {
            selectProduct(item);
          } else {
            document.getElementById(id ? `product-${id}` : "menu-products")?.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
              block: "center",
            });
          }
        }}
      />
      {activeOffers.length > 0 && (
        <section
          id="store-offers"
          className="mx-auto mt-3 max-w-6xl space-y-2 px-4"
          aria-label="العروض والخصومات"
        >
          {activeOffers.map((offer) => {
            const offerProduct = offer.product_id
              ? mappedProducts.find((product) => product.id === offer.product_id)
              : null;
            return (
              <article
                key={offer.id}
                className="rounded-2xl border border-primary/20 bg-primary/8 p-4"
              >
                <h2 className="text-base font-black">{offer.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  خصم {offer.discount_percentage}%{" "}
                  {offer.product_id ? "على الصنف المحدد" : "على الأصناف المؤهلة"} — يُطبّق تلقائيًا
                  ولا يشمل الإضافات.
                </p>
                {offerProduct && (
                  <button
                    disabled={!isAcceptingOrders}
                    onClick={() => selectProduct(offerProduct)}
                    className="mt-3 min-h-11 rounded-xl border border-primary/30 bg-surface px-4 py-2 text-sm font-bold text-primary"
                  >
                    <bdi dir="auto">{offerProduct.name}</bdi> ·{" "}
                    <bdi dir="ltr">{formatCurrency(offerProduct.price, currency)}</bdi> — إضافة
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}

      {!isAcceptingOrders && (
        <div className="mx-4 mt-3 max-w-6xl rounded-xl bg-destructive/10 p-3 text-center text-sm font-bold text-destructive lg:mx-auto">
          {orderStatus.label}
        </div>
      )}
      {reorderNotice && (
        <div className="mx-4 mt-3 max-w-6xl rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800 lg:mx-auto">
          {reorderNotice}
        </div>
      )}

      <CategoryPills
        active={activeCategory || ""}
        onChange={setActiveCategory}
        categories={mappedCategories}
      />

      <main
        id="menu-products"
        key={activeCategory}
        className={`animate-rise-in mx-auto grid max-w-6xl gap-3 px-4 pt-4 sm:grid-cols-2 lg:grid-cols-3 ${count > 0 ? "pb-28" : "pb-6"}`}
      >
        <h2 className="sr-only">{mappedCategories.find((c) => c.id === activeCategory)?.name}</h2>
        {visibleItems.map((item) => (
          <button
            key={item.id}
            id={`product-${item.id}`}
            type="button"
            onClick={() => {
              try {
                if (isAcceptingOrders) {
                  selectProduct(item);
                }
              } catch (err) {
                console.error("Error handling product click:", err);
              }
            }}
            disabled={!isAcceptingOrders}
            aria-label={`${item.name}، ${formatCurrency(item.price, currency)}، ${item.groups.length ? "اختيار الخيارات" : "إضافة إلى السلة"}`}
            className={`grid min-h-32 w-full grid-cols-[minmax(0,1fr)_6.75rem] items-center gap-3 rounded-2xl border bg-surface p-3 text-right transition-colors hover:bg-surface-strong ${!isAcceptingOrders ? "cursor-not-allowed opacity-50" : "active:bg-surface-strong"}`}
          >
            <div className="min-w-0">
              {item.tag && (
                <span className="mb-1 inline-block rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-extrabold text-accent">
                  {item.tag}
                </span>
              )}
              <h3 className="line-clamp-2 text-base font-extrabold leading-6">
                <bdi dir="auto">{item.name}</bdi>
              </h3>
              {item.description?.trim() && (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {item.description}
                </p>
              )}
              <p className="mt-2 text-base font-black text-primary tabular-nums">
                <bdi dir="ltr">{formatCurrency(item.price, currency)}</bdi>
              </p>
            </div>
            <div className="relative grid aspect-square w-full shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
              <UtensilsCrossed className="h-7 w-7 text-muted-foreground/55" aria-hidden="true" />
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  width={800}
                  height={800}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <span className="absolute bottom-1 left-1 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
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
