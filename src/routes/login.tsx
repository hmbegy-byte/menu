import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import HmbWordmark from "../components/HmbWordmark";
import StaffPasswordSetup from "../components/StaffPasswordSetup";
import { signInUnified } from "../lib/access";
import { fallbackPlatformBrand, readPublicBrand } from "../lib/platformBrand";

export const Route = createFileRoute("/login")({
  loader: () => readPublicBrand(),
  head: ({ loaderData }) => ({
    meta: [
      { title: `تسجيل الدخول — ${loaderData?.brand_name || fallbackPlatformBrand.brand_name}` },
    ],
  }),
  component: UnifiedLogin,
});

function UnifiedLogin() {
  const navigate = useNavigate();
  const brand = { ...fallbackPlatformBrand, ...Route.useLoaderData() };
  const [form, setForm] = useState({ slug: "", username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{
    kitchen: boolean;
    destination: string;
    slug: string;
  } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signInUnified(form.slug, form.username, form.password);
      if (result.needsPasswordChange) {
        setPending({
          kitchen: result.destination === "kitchen",
          destination: result.destination,
          slug: result.slug,
        });
        return;
      }
      const destination =
        result.destination === "scanner"
          ? `/s/${result.slug}/scanner`
          : `/${result.destination}/${result.slug}`;
      window.location.assign(destination);
    } catch {
      setError("تعذر تسجيل الدخول. تحقق من معرّف المطعم واسم المستخدم وكلمة المرور.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setLoading(false);
    }
  };

  if (pending)
    return (
      <StaffPasswordSetup
        kitchen={pending.kitchen}
        onDone={() =>
          window.location.assign(
            pending.destination === "scanner"
              ? `/s/${pending.slug}/scanner`
              : `/${pending.destination}/${pending.slug}`,
          )
        }
      />
    );

  return (
    <main dir="rtl" className="min-h-screen bg-[#F4F6F8] px-4 py-8 text-[#0B1F3B]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-[1fr_1.1fr]">
        <section className="hidden bg-[#0B1F3B] p-10 text-white md:flex md:flex-col md:justify-between">
          <HmbWordmark
            dark
            productName={brand.brand_name}
            companyName={brand.legal_name}
            logoUrl={brand.logo_url || "/hmb-logo-mark.png"}
          />
          <div>
            <ShieldCheck className="mb-5 text-[#00D1B2]" size={38} />
            <h1 className="text-4xl font-black leading-tight">
              إدارة مطعمك تبدأ من دخول واحد واضح.
            </h1>
            <p className="mt-4 text-slate-300">
              يتم توجيهك تلقائيًا حسب الصلاحية المسجلة لحسابك، دون اختيار دور يدوي.
            </p>
          </div>
          <p className="text-sm text-slate-400">
            {brand.brand_name} — أحد حلول HMB Digital Solutions
          </p>
        </section>
        <section className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-8 md:hidden">
            <HmbWordmark
              productName={brand.brand_name}
              companyName={brand.legal_name}
              logoUrl={brand.logo_url || "/hmb-logo-mark.png"}
            />
          </div>
          <h2 className="text-3xl font-black">تسجيل الدخول</h2>
          <p className="mt-2 text-sm text-slate-600">
            معرّف المطعم هو الجزء الموجود في رابطه، وقد يختلف عن اسمه التجاري.
          </p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            <label className="block text-sm font-bold" htmlFor="restaurant-id">
              معرّف المطعم
              <input
                id="restaurant-id"
                dir="ltr"
                autoComplete="organization"
                placeholder="la-gaufres"
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase() })}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                required
              />
            </label>
            <label className="block text-sm font-bold" htmlFor="staff-username">
              اسم المستخدم
              <input
                id="staff-username"
                dir="ltr"
                autoComplete="username"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                required
              />
            </label>
            <div>
              <label className="block text-sm font-bold" htmlFor="staff-password">
                كلمة المرور
              </label>
              <span className="relative mt-2 block">
                <input
                  id="staff-password"
                  dir="ltr"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-12 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  className="absolute inset-y-0 left-2 grid w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
            </div>
            <div className="min-h-14">
              {error && (
                <p
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"
                >
                  {error}
                </p>
              )}
            </div>
            <button
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-60"
            >
              <LogIn size={19} />
              {loading ? "جارٍ التحقق…" : "تسجيل الدخول"}
            </button>
          </form>
          <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
            <a
              href={
                brand.support_email
                  ? `mailto:${brand.support_email}?subject=${encodeURIComponent("مساعدة في استعادة الدخول")}`
                  : "/#contact"
              }
              className="font-bold text-[#2563EB] underline-offset-4 hover:underline"
            >
              لا تستطيع الدخول؟ اطلب المساعدة
            </a>
            <Link to="/platform" className="text-slate-600 hover:text-[#0B1F3B]">
              دخول إدارة المنصة
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
