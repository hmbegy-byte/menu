import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Banner = {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  product_id?: string;
};

const AUTOPLAY_MS = 5000;

export function OffersSlideshow({ banners = [], onOrder }: { banners?: Banner[]; onOrder?: (id?: string) => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (next: number) => {
      if (banners.length === 0) return;
      setIndex((next + banners.length) % banners.length);
    },
    [banners.length],
  );

  // Autoplay
  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, banners.length]);

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

  // Don't render if no banners
  if (banners.length === 0) return null;

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
          {banners.map((banner, i) => (
            <article
              key={banner.id}
              className="relative w-full shrink-0 snap-center h-40 sm:h-52 md:h-60 overflow-hidden rounded-2xl"
              aria-roledescription="slide"
              aria-label={`${i + 1} من ${banners.length}: ${banner.title}`}
            >
              <img
                src={banner.image_url}
                alt={banner.title}
                width={1200}
                height={600}
                loading={i === 0 ? "eager" : "lazy"}
                className="h-full w-full object-cover"
              />
              <div className="fade-mask-bottom absolute inset-0" />
              <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="mt-1.5 truncate text-lg font-extrabold text-white drop-shadow">
                    {banner.title}
                  </h2>
                  <p className="truncate text-xs text-gray-200">{banner.subtitle}</p>
                  {onOrder && <button type="button" onClick={() => onOrder(banner.product_id)} className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{banner.product_id ? 'اطلب الآن' : 'تصفح الأصناف'}</button>}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Arrow controls */}
        {banners.length > 1 && (
          <>
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
          </>
        )}
      </div>

      {/* Dots */}
      {banners.length > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`اذهب إلى العرض ${i + 1}`}
              onClick={() => goTo(i)}
              className={
                "h-1.5 rounded-full transition-all duration-300 " +
                (i === index ? "w-6 gradient-primary" : "w-1.5 bg-border")
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
