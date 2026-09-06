/* eslint-disable @typescript-eslint/no-explicit-any -- Public tracking RPC types are added after applying the database migration. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChefHat, Clock3, PackageCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { isMockMode, supabase } from "../lib/supabase";
import { readDemoData } from "../lib/storeDefaults";
import { formatCurrency } from "../lib/currency";

export const Route = createFileRoute("/track/$tracking_token")({ component: TrackingPage });
const steps = [
  { id: "pending", label: "تم استلام الطلب", icon: Check },
  { id: "preparing", label: "قيد التحضير", icon: ChefHat },
  { id: "ready", label: "الطلب جاهز", icon: PackageCheck },
  { id: "completed", label: "تم التسليم", icon: Truck },
];
function TrackingPage() {
  const { tracking_token } = Route.useParams();
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");
  const [usualToken, setUsualToken] = useState("");
  useEffect(() => {
    let channel: any;
    const load = async () => {
      try {
        if (isMockMode) {
          const found = readDemoData().orders.find(
            (item) => item.tracking_token === tracking_token || item.id === tracking_token,
          );
          if (!found) throw new Error("رابط التتبع غير صحيح");
          setOrder(found);
          return;
        }
        const { data, error: trackError } = await supabase.rpc("track_order", {
          p_tracking_token: tracking_token,
        });
        if (trackError) throw trackError;
        const found = Array.isArray(data) ? data[0] : data;
        if (!found) throw new Error("الطلب غير موجود");
        setOrder(found);
      } catch (trackError) {
        setError(trackError instanceof Error ? trackError.message : "تعذر تحميل الطلب");
      }
    };
    load();
    if (!isMockMode)
      channel = supabase
        .channel(`track-${tracking_token}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, load)
        .subscribe();
    const timer = window.setInterval(load, 20000);
    return () => {
      window.clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [tracking_token]);
  if (error)
    return (
      <main dir="rtl" className="grid min-h-screen place-items-center bg-gray-50 p-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">تعذر تتبع الطلب</h1>
          <p className="mt-2 text-gray-500">{error}</p>
        </div>
      </main>
    );
  if (!order)
    return <main className="grid min-h-screen place-items-center">جارٍ تحميل حالة الطلب…</main>;
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === order.status),
  );
  const promised = order.promised_at ? new Date(order.promised_at) : null;
  return (
    <main dir="rtl" className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-lg space-y-5 pt-8">
        <section className="rounded-3xl bg-gray-900 p-6 text-white shadow-xl">
          <p className="text-sm text-gray-300">طلب رقم</p>
          <h1 className="mt-1 text-3xl font-black">#{order.order_number}</h1>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 p-4">
            <span className="flex items-center gap-2">
              <Clock3 size={19} /> الوقت المتوقع
            </span>
            <strong>
              {promised
                ? promised.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
                : "قريبًا"}
            </strong>
          </div>
          {order.delayed_minutes > 0 && (
            <p className="mt-3 rounded-xl bg-amber-500/20 p-3 text-sm font-bold text-amber-200">
              تم تحديث الوقت المتوقع بإضافة {order.delayed_minutes} دقيقة.
            </p>
          )}
        </section>
        {order.status === "cancelled" ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center font-bold text-red-700">
            تم إلغاء الطلب. تواصل مع المطعم للمساعدة.
          </section>
        ) : (
          <section className="rounded-3xl border bg-white p-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const done = index <= currentIndex;
              return (
                <div key={step.id} className="relative flex gap-4 pb-7 last:pb-0">
                  {index < steps.length - 1 && (
                    <span
                      className={`absolute right-5 top-10 h-full w-0.5 ${index < currentIndex ? "bg-green-500" : "bg-gray-200"}`}
                    />
                  )}
                  <span
                    className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full ${done ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400"}`}
                  >
                    <Icon size={19} />
                  </span>
                  <div>
                    <h2 className={`font-bold ${done ? "text-gray-900" : "text-gray-400"}`}>
                      {step.label}
                    </h2>
                    {index === currentIndex && (
                      <p className="mt-1 text-sm text-green-700">هذه هي الحالة الحالية</p>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
        <section className="rounded-2xl border bg-white p-5 text-sm">
          <div className="flex justify-between py-2">
            <span className="text-gray-500">نوع الطلب</span>
            <strong>
              {order.order_type === "delivery"
                ? `توصيل${order.delivery_zone ? ` — ${order.delivery_zone}` : ""}`
                : order.order_type === "dine_in"
                  ? `داخل المطعم — طاولة ${order.table_number}`
                  : "استلام"}
            </strong>
          </div>
          <div className="flex justify-between border-t py-2">
            <span className="text-gray-500">الإجمالي</span>
            <strong>{formatCurrency(order.total_amount, order.currency || "SAR")}</strong>
          </div>
        </section>
        <Link
          to="/s/$store_slug"
          params={{ store_slug: order.store_slug || "demo" }}
          className="block rounded-2xl bg-white py-3 text-center font-bold text-gray-700"
        >
          العودة إلى قائمة المطعم
        </Link>
        <button onClick={async () => {
          const { data, error: saveError } = await supabase.rpc("save_usual_order", { p_store_id: order.store_id, p_tracking_token: tracking_token, p_label: "طلبي المعتاد" });
          if (saveError) setError(saveError.message); else setUsualToken(data);
        }} className="w-full rounded-2xl border bg-white py-3 text-center font-bold text-purple-700">حفظ كطلبي المعتاد</button>
        {usualToken && <Link to="/s/$store_slug" params={{ store_slug: order.store_slug || "demo" }} search={{ usual: usualToken } as any} className="block rounded-2xl bg-purple-50 py-3 text-center font-bold text-purple-700">فتح طلبي المعتاد</Link>}
        <Link
          to="/s/$store_slug"
          params={{ store_slug: order.store_slug || "demo" }}
          search={{ reorder: tracking_token } as any}
          className="block rounded-2xl bg-purple-600 py-3 text-center font-bold text-white"
        >
          اطلب نفس الطلب مرة أخرى
        </Link>
      </div>
    </main>
  );
}
