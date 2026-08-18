import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import offerFriday from "@/assets/offer-friday.jpg";
import offerCombo from "@/assets/offer-combo.jpg";
import offerFreeDrink from "@/assets/offer-free-drink.jpg";

type Offer = {
  id: string;
  image: string;
  badge: string;
  title: string;
  subtitle: string;
};

const offers: Offer[] = [
  {
    id: "friday",
    image: offerFriday,
    badge: "عرض الأسبوع",
    title: "عرض الجمعة",
    subtitle: "خصم ٢٥٪ على كل المشويات",
  },
  {
    id: "combo",
    image: offerCombo,
    badge: "وفّر أكثر",
    title: "وجبتان بخصم ٢٠٪",
    subtitle: "اطلب وجبتين واحصل على الخصم فوراً",
  },
  {
    id: "free-drink",
    image: offerFreeDrink,
    badge: "هدية",
    title: "مشروب مجاني مع كل طبق",
    subtitle: "مع كل طلب رئيسي احصل على مشروب على الحساب",
  },
];

const AUTOPLAY_MS = 5000;

export function OffersSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((next: number) => {
    setIndex((next + offers.length) % offers.length);
  }, []);

  // Autoplay
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % offers.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused]);

  // Sync horizontal scroll with index (RTL aware)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[index] as HTMLElement | undefined;
    if (slide) {
      track.scrollTo({
        left: slide.offsetLeft - track.offsetLeft,
        behavior: "smooth",
      });
    }
  }, [index]);

  // Update index when user swipes manually
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    let closest = 0;
    let minDist = Infinity;
    Array.from(track.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const dist = Math.abs(el.offsetLeft - track.offsetLeft - track.scrollLeft);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setIndex(closest);
  }, []);

  return (
    <section
      aria-label="العروض"
      className="px-4 pt-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth"
        >
          {offers.map((offer, i) => (
            <article
              key={offer.id}
              className="relative w-full shrink-0 snap-center overflow-hidden rounded-3xl"
              aria-roledescription="slide"
              aria-label={`${i + 1} من ${offers.length}: ${offer.title}`}
            >
              <img
                src={offer.image}
                alt={offer.title}
                width={1200}
                height={600}
                loading={i === 0 ? "eager" : "lazy"}
                className="aspect-[2/1] w-full object-cover"
              />
              <div className="fade-mask-bottom absolute inset-0" />
              <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <span className="inline-block rounded-full bg-primary px-2.5 py-1 text-[10px] font-extrabold text-primary-foreground">
                    {offer.badge}
                  </span>
                  <h2 className="mt-1.5 truncate text-lg font-extrabold text-foreground drop-shadow">
                    {offer.title}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {offer.subtitle}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Arrow controls */}
        <button
          type="button"
          aria-label="العرض السابق"
          onClick={() => goTo(index - 1)}
          className="absolute top-1/2 -translate-y-1/2 right-2 grid h-9 w-9 place-items-center rounded-full bg-background/70 text-foreground backdrop-blur transition active:scale-90"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="العرض التالي"
          onClick={() => goTo(index + 1)}
          className="absolute top-1/2 -translate-y-1/2 left-2 grid h-9 w-9 place-items-center rounded-full bg-background/70 text-foreground backdrop-blur transition active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Dots */}
      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        {offers.map((offer, i) => (
          <button
            key={offer.id}
            type="button"
            aria-label={`اذهب إلى العرض ${i + 1}`}
            onClick={() => goTo(i)}
            className={
              "h-1.5 rounded-full transition-all duration-300 " +
              (i === index
                ? "w-6 gradient-primary"
                : "w-1.5 bg-border")
            }
          />
        ))}
      </div>
    </section>
  );
}
