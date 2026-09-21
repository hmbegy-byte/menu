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

export function OffersSlideshow({
  banners = [],
  onOrder,
}: {
  banners?: Banner[];
  onOrder?: (id?: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (banners.length === 0) return;
      setIndex((next + banners.length) % banners.length);
    },
    [banners.length],
  );

  // Autoplay
  useEffect(() => {
    if (paused || reduceMotion || banners.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, reduceMotion, banners.length]);

  // Sync horizontal scroll with index (RTL aware)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[index] as HTMLElement | undefined;
    if (slide) {
      track.scrollTo({
        left: slide.offsetLeft - track.offsetLeft,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  }, [index, reduceMotion]);

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
      className="mx-auto max-w-6xl px-4 pt-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto motion-safe:scroll-smooth"
          aria-live="off"
        >
          {banners.map((banner, i) => (
            <article
              key={banner.id}
              className="relative h-36 w-full shrink-0 snap-center overflow-hidden rounded-2xl sm:h-48 md:h-56"
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
              <div className="absolute right-4 bottom-4 left-4 pr-11 pl-11 sm:pr-4 sm:pl-4">
                <div className="max-w-xl min-w-0">
                  <h2 className="text-lg font-extrabold text-white drop-shadow-sm">
                    <bdi dir="auto">{banner.title}</bdi>
                  </h2>
                  <p
                    className={`${expanded[banner.id] ? "" : "line-clamp-2"} mt-1 text-xs leading-5 text-gray-100`}
                  >
                    {banner.subtitle}
                  </p>
                  {banner.subtitle?.length > 90 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((current) => ({
                          ...current,
                          [banner.id]: !current[banner.id],
                        }))
                      }
                      className="mt-1 min-h-8 text-xs font-bold text-white underline underline-offset-4"
                      aria-expanded={Boolean(expanded[banner.id])}
                    >
                      {expanded[banner.id] ? "عرض أقل" : "التفاصيل"}
                    </button>
                  )}
                  {onOrder && (
                    <button
                      type="button"
                      onClick={() => onOrder(banner.product_id)}
                      className="mt-2 min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm"
                    >
                      {banner.product_id ? "اطلب الآن" : "تصفح الأصناف"}
                    </button>
                  )}
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
              className="absolute top-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition active:scale-90"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="العرض التالي"
              onClick={() => goTo(index + 1)}
              className="absolute top-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition active:scale-90"
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
