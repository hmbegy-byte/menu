import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChefHat,
  ClipboardList,
  Gift,
  Menu,
  ShieldCheck,
  Store,
  Users,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import HmbWordmark from "../components/HmbWordmark";
import { fallbackPlatformBrand, type PublicBrand } from "../lib/platformBrand";
import { isMockMode, supabase } from "../lib/supabase";

const features = [
  {
    icon: Menu,
    title: "منيو بهوية مطعمك",
    text: "أصناف وتصنيفات وخيارات وعروض قابلة للإدارة من لوحة واحدة.",
  },
  {
    icon: ClipboardList,
    title: "طلبات ومتابعة",
    text: "استقبال الطلبات وتحديث حالتها وإتاحة صفحة متابعة واضحة للعميل.",
  },
  {
    icon: ChefHat,
    title: "شاشة مطبخ",
    text: "تنظيم الطلبات الجارية والجاهزة مع دعم الاستخدام على الجوال والشاشات.",
  },
  { icon: Gift, title: "ولاء العملاء", text: "نقاط وأختام ومكافآت يضبطها المطعم وفق آلية عمله." },
  {
    icon: Users,
    title: "صلاحيات للفريق",
    text: "حسابات منفصلة للإدارة والمطبخ مع عزل بيانات كل مطعم.",
  },
  {
    icon: ShieldCheck,
    title: "تشغيل موثوق",
    text: "تقارير تشغيلية ومصروفات ونسخ بيانات وفق المزايا المفعلة.",
  },
];

export default function Landing({ brand: suppliedBrand }: { brand?: PublicBrand }) {
  const brand = { ...fallbackPlatformBrand, ...suppliedBrand };
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#F4F6F8] text-[#0B1F3B]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <nav
          aria-label="التنقل الرئيسي"
          className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"
        >
          <HmbWordmark
            productName={brand.brand_name}
            companyName={brand.legal_name}
            logoUrl={brand.logo_url || "/hmb-logo-mark.png"}
          />
          <div className="hidden items-center gap-7 text-sm font-bold md:flex">
            <a href="#features" className="hover:text-[#2563EB]">
              المميزات
            </a>
            <a href="#steps" className="hover:text-[#2563EB]">
              كيف تبدأ
            </a>
            <a href="#contact" className="hover:text-[#2563EB]">
              التواصل
            </a>
            <Link
              to="/login"
              className="rounded-xl bg-[#2563EB] px-5 py-3 text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              تسجيل الدخول
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-300 md:hidden"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </nav>
        {menuOpen && (
          <div className="border-t bg-white px-5 py-4 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 font-bold">
              <a href="#features" onClick={() => setMenuOpen(false)}>
                المميزات
              </a>
              <a href="#steps" onClick={() => setMenuOpen(false)}>
                كيف تبدأ
              </a>
              <a href="#contact" onClick={() => setMenuOpen(false)}>
                التواصل
              </a>
              <Link
                to="/login"
                className="rounded-xl bg-[#2563EB] px-5 py-3 text-center text-white"
              >
                تسجيل الدخول
              </Link>
            </div>
          </div>
        )}
      </header>

      <section className="relative isolate">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(0,209,178,0.16),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(37,99,235,0.16),transparent_34%)]"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800">
              منصة إدارة المطاعم والمقاهي
            </p>
            <h1 className="text-4xl font-black leading-[1.25] sm:text-5xl lg:text-6xl">
              منيو مطعمك وطلباتك وولاء عملائك، في مكان واحد
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              أدر حضور مطعمك الرقمي وتشغيل الطلبات وفريقك من تجربة عربية واضحة، مع هوية مستقلة لكل
              مطعم.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#trial"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                طلب تجربة <ArrowLeft size={18} />
              </a>
              <Link
                to="/login"
                className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold transition hover:border-[#2563EB] hover:text-[#2563EB] focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                تسجيل الدخول
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              {brand.brand_name} — أحد حلول HMB Digital Solutions
            </p>
          </div>
          <SystemPreview />
        </div>
      </section>

      <section id="features" className="scroll-mt-24 bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-2xl">
            <p className="font-bold text-[#2563EB]">المميزات المتاحة</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">
              الأدوات التي يحتاجها التشغيل اليومي
            </h2>
            <p className="mt-4 text-slate-600">
              لا وعود بتكاملات غير مكتملة؛ هذه إمكانات موجودة داخل النظام الحالي.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg motion-reduce:transform-none"
              >
                <Icon className="text-[#2563EB]" size={28} />
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="steps" className="scroll-mt-24 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <p className="font-bold text-[#2563EB]">كيف تبدأ</p>
          <h2 className="mt-2 text-3xl font-black">ثلاث خطوات واضحة</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              "اطلب تجربة وأرسل بيانات نشاطك الأساسية.",
              "نراجع احتياجك ونجهّز حساب المطعم دون إنشاء تلقائي.",
              "أدخل قائمتك وابدأ إدارة الطلبات والفريق.",
            ].map((text, index) => (
              <article key={text} className="rounded-2xl bg-[#0B1F3B] p-6 text-white">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#00D1B2] font-black text-[#0B1F3B]">
                  {index + 1}
                </span>
                <p className="mt-5 text-lg font-bold leading-8">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="trial" className="scroll-mt-24 bg-[#0B1F3B] py-16 text-white md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="font-bold text-[#00D1B2]">ابدأ معنا</p>
            <h2 className="mt-2 text-4xl font-black">اطلب تجربة تناسب مطعمك</h2>
            <p className="mt-5 leading-8 text-slate-300">
              الطلب لا ينشئ حسابًا أو اشتراكًا تلقائيًا. سنراجعه أولًا ثم نتواصل معك.
            </p>
          </div>
          <TrialRequestForm />
        </div>
      </section>

      <footer id="contact" className="scroll-mt-24 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <HmbWordmark
              productName={brand.brand_name}
              companyName={brand.legal_name}
              logoUrl={brand.logo_url || "/hmb-logo-mark.png"}
            />
            <p className="mt-3 text-sm text-slate-500">
              {brand.brand_name} — أحد حلول HMB Digital Solutions
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-bold">
            <a href="/legal/privacy">الخصوصية</a>
            <a href="/legal/terms">الشروط</a>
            {brand.support_email && (
              <a dir="ltr" href={`mailto:${brand.support_email}`}>
                {brand.support_email}
              </a>
            )}
            {brand.support_phone && (
              <a dir="ltr" href={`tel:${brand.support_phone}`}>
                {brand.support_phone}
              </a>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}

function SystemPreview() {
  return (
    <div
      aria-label="معاينة توضيحية للوحة تشغيل المطعم"
      className="relative mx-auto w-full max-w-xl rounded-3xl border border-white/70 bg-white/80 p-4 shadow-2xl backdrop-blur"
    >
      <div className="rounded-2xl bg-[#0B1F3B] p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">حالة التشغيل</p>
            <p className="mt-1 text-xl font-black">الطلبات الحالية</p>
          </div>
          <span className="rounded-full bg-teal-400/20 px-3 py-1 text-sm font-bold text-[#51F0D6]">
            متصل
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {["طلب جديد", "قيد التحضير", "جاهز"].map((label) => (
            <div key={label} className="rounded-xl bg-white/10 p-4 text-center">
              <strong className="text-sm">{label}</strong>
              <span className="mt-1 block text-xs text-slate-300">حالة توضيحية</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">الأصناف المتاحة</p>
          <p className="mt-1 text-2xl font-black">قائمة مرتبة</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">برنامج الولاء</p>
          <p className="mt-1 text-2xl font-black">نقاط ومكافآت</p>
        </div>
      </div>
    </div>
  );
}

function TrialRequestForm() {
  const [form, setForm] = useState({
    contact_name: "",
    business_name: "",
    phone: "",
    business_type: "restaurant",
    branch_count: "1",
    notes: "",
    website: "",
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      if (isMockMode)
        localStorage.setItem(
          `trial-request:${crypto.randomUUID()}`,
          JSON.stringify({ ...form, created_at: new Date().toISOString() }),
        );
      else {
        const keyName = "hmb-trial-request-key";
        const requestKey = sessionStorage.getItem(keyName) || crypto.randomUUID();
        sessionStorage.setItem(keyName, requestKey);
        const { error } = await supabase.rpc("submit_trial_request", {
          p_contact_name: form.contact_name,
          p_business_name: form.business_name,
          p_phone: form.phone,
          p_business_type: form.business_type,
          p_branch_count: Number(form.branch_count),
          p_notes: form.notes || null,
          p_request_key: requestKey,
          p_website: form.website,
        });
        if (error) throw error;
        sessionStorage.removeItem(keyName);
      }
      setStatus("تم استلام طلبك بنجاح. سنراجعه قبل تجهيز أي حساب.");
      setForm({
        contact_name: "",
        business_name: "",
        phone: "",
        business_type: "restaurant",
        branch_count: "1",
        notes: "",
        website: "",
      });
    } catch {
      setStatus("تعذر إرسال الطلب الآن. تحقق من البيانات وحاول لاحقًا.");
    } finally {
      setLoading(false);
    }
  };
  const input =
    "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[#0B1F3B] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100";
  return (
    <form onSubmit={submit} className="rounded-3xl bg-white p-6 text-[#0B1F3B] shadow-xl sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold">
          اسم المسؤول
          <input
            required
            minLength={2}
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            className={input}
          />
        </label>
        <label className="text-sm font-bold">
          اسم المطعم أو المقهى
          <input
            required
            minLength={2}
            value={form.business_name}
            onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            className={input}
          />
        </label>
        <label className="text-sm font-bold">
          رقم التواصل
          <input
            required
            dir="ltr"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={input}
          />
        </label>
        <label className="text-sm font-bold">
          نوع النشاط
          <select
            value={form.business_type}
            onChange={(e) => setForm({ ...form, business_type: e.target.value })}
            className={input}
          >
            <option value="restaurant">مطعم</option>
            <option value="cafe">مقهى</option>
            <option value="bakery">مخبز أو حلويات</option>
            <option value="food_truck">عربة طعام</option>
            <option value="other">أخرى</option>
          </select>
        </label>
        <label className="text-sm font-bold">
          عدد الفروع
          <input
            required
            type="number"
            min="1"
            max="100"
            value={form.branch_count}
            onChange={(e) => setForm({ ...form, branch_count: e.target.value })}
            className={input}
          />
        </label>
        <label aria-hidden="true" className="absolute -left-[9999px]">
          الموقع
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </label>
        <label className="text-sm font-bold sm:col-span-2">
          ملاحظات اختيارية
          <textarea
            maxLength={1000}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={`${input} min-h-24 py-3`}
          />
        </label>
      </div>
      <div className="min-h-14 pt-3">
        {status && (
          <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm font-bold">
            {status}
          </p>
        )}
      </div>
      <button
        disabled={loading}
        className="min-h-12 w-full rounded-xl bg-[#2563EB] px-5 font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-60"
      >
        {loading ? "جارٍ الإرسال…" : "إرسال طلب التجربة"}
      </button>
    </form>
  );
}
