/* eslint-disable @typescript-eslint/no-explicit-any -- RPC types are generated after the migration is applied. */
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ChefHat, RefreshCw, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { isMockMode, supabase } from "../lib/supabase";
import { readDemoData } from "../lib/storeDefaults";

export const Route = createFileRoute("/display/$access_token")({ component: OrderDisplayBoard });

type BoardOrder = { order_number: number; status: "preparing" | "ready"; updated_at: string };

function OrderDisplayBoard() {
  const { access_token } = Route.useParams();
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [error, setError] = useState("");
  const [online, setOnline] = useState<boolean | null>(null);
  const load = useCallback(async () => {
    try {
      if (isMockMode) {
        const valid = Object.keys(localStorage).some(
          (key) =>
            key.startsWith("demo_order_board:") && localStorage.getItem(key) === access_token,
        );
        if (!valid) throw new Error("رابط الشاشة غير صالح أو متوقف");
        setOrders(
          readDemoData()
            .orders.filter((order: any) => ["preparing", "ready"].includes(order.status))
            .map((order: any) => ({
              order_number: order.order_number,
              status: order.status,
              updated_at: order.updated_at || order.created_at,
            })),
        );
      } else {
        const { data, error: requestError } = await supabase.rpc("order_board_snapshot", {
          p_access_token: access_token,
        });
        if (requestError) throw requestError;
        setOrders((data || []) as BoardOrder[]);
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحديث الشاشة");
    }
  }, [access_token]);

  useEffect(() => {
    setOnline(window.navigator.onLine);
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    const onOnline = () => {
      setOnline(true);
      void load();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("storage", load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("storage", load);
    };
  }, [load]);

  const preparing = orders.filter((order) => order.status === "preparing");
  const ready = orders.filter((order) => order.status === "ready");
  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <header className="mx-auto mb-8 flex max-w-7xl items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">متابعة الاستلام</p>
          <h1 className="text-3xl font-black md:text-5xl">حالة الطلبات</h1>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full px-4 py-2 ${online === null ? "bg-slate-800 text-slate-300" : online ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-200"}`}
        >
          {online === false ? <WifiOff size={18} /> : <RefreshCw size={18} />}
          {online === null
            ? "جاري فحص الاتصال"
            : online
              ? "تحديث تلقائي"
              : "الاتصال منقطع — آخر بيانات محفوظة"}
        </div>
      </header>
      {error && (
        <p role="alert" className="mx-auto mb-5 max-w-7xl rounded-2xl bg-red-950 p-4 text-red-200">
          {error}
        </p>
      )}
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
        <BoardColumn title="قيد التحضير" icon={<ChefHat />} orders={preparing} tone="amber" />
        <BoardColumn title="جاهز للاستلام" icon={<CheckCircle2 />} orders={ready} tone="emerald" />
      </div>
      <p className="mx-auto mt-8 max-w-7xl text-center text-sm text-slate-500">
        تعرض الشاشة أرقام الطلبات فقط حفاظًا على خصوصية العملاء.
      </p>
    </main>
  );
}

function BoardColumn({
  title,
  icon,
  orders,
  tone,
}: {
  title: string;
  icon: ReactNode;
  orders: BoardOrder[];
  tone: "amber" | "emerald";
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <h2
        className={`mb-5 flex items-center gap-3 text-2xl font-black ${tone === "emerald" ? "text-emerald-300" : "text-amber-300"}`}
      >
        {icon}
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {orders.map((order) => (
          <div
            key={order.order_number}
            className="rounded-2xl bg-slate-800 p-5 text-center text-3xl font-black"
          >
            #{order.order_number}
          </div>
        ))}
      </div>
      {orders.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
          لا توجد طلبات الآن
        </p>
      )}
    </section>
  );
}
