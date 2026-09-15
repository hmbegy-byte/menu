import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
export const Route = createFileRoute("/platform-info")({ component: PlatformInfo });
function PlatformInfo() {
  const [plans, setPlans] = useState<
    Array<{
      id: string;
      name: string;
      limits: { branches?: number; staff?: number; products?: number };
    }>
  >([]);
  const [failed, setFailed] = useState(false);
  const email = import.meta.env["VITE_PUBLIC_CONTACT_EMAIL"];
  useEffect(() => {
    void supabase
      .from("plans")
      .select("id,name,limits")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data, error }) => {
        setFailed(Boolean(error));
        setPlans(data || []);
      });
  }, []);
  return (
    <main dir="rtl" className="mx-auto max-w-5xl space-y-8 px-5 py-12">
      <h1 className="text-4xl font-bold">قائمة وطلبات مباشرة بهوية مطعمك</h1>
      <p className="text-xl">
        Flavor Flow — إطلاق موجه للسعودية. منيو قابل للتخصيص، طلبات وتتبع، وشاشة مطبخ حسب الباقة.
      </p>
      <p className="rounded-xl border p-4">
        نطاق الدفع الحالي: نقد أو تحويل بنكي يدوي للمطعم. البطاقات وApple Pay غير متاحة بعد. اشتراك
        المنصة يُحصّل ويُؤكد يدويًا بشكل مستقل.
      </p>
      <section>
        <h2 className="mb-4 text-2xl font-bold">الباقات وحدودها الحالية</h2>
        {failed ? (
          <p role="alert">تعذر تحميل الباقات. لا تتوفر عروض أسعار مؤكدة حاليًا.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <article key={p.id} className="rounded-xl border p-5">
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p>الفروع: {p.limits.branches ?? "حسب الاتفاق"}</p>
                <p>حسابات الموظفين: {p.limits.staff ?? "حسب الاتفاق"}</p>
                <p>الأصناف: {p.limits.products ?? "حسب الاتفاق"}</p>
              </article>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="text-2xl font-bold">استفسار عن الاشتراك</h2>
        {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? (
          <a
            className="mt-3 inline-block rounded-xl border p-3"
            href={`mailto:${email}?subject=${encodeURIComponent("استفسار اشتراك Flavor Flow")}`}
          >
            تواصل لعرض سعر وتحديد الباقة المناسبة
          </a>
        ) : (
          <p>التسجيل التجاري العام لم يُفتح بعد؛ بيانات التواصل قيد الإعداد.</p>
        )}
        {import.meta.env["VITE_SUPPORT_HOURS"] && (
          <p>ساعات الدعم: {import.meta.env["VITE_SUPPORT_HOURS"]}</p>
        )}
      </section>
      <footer className="flex flex-wrap gap-5">
        <a href="/legal/terms">الشروط</a>
        <a href="/legal/privacy">الخصوصية</a>
        <a href="/platform">دخول إدارة المنصة</a>
      </footer>
      <p className="text-sm">
        لا تشمل هذه الصفحة ادعاء الامتثال الضريبي أو جاهزية فوترة اشتراكات مصر.
      </p>
    </main>
  );
}
