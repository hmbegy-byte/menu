import { Banknote, Clock3, ShoppingBag, TrendingUp, Truck, XCircle } from "lucide-react";
import { formatCurrency } from "../../lib/currency";

export default function ReportsDashboard({ adminData }) {
  const { orders, store } = adminData;
  const completed = orders.filter((order) => order.status === "completed");
  const valid = orders.filter((order) => order.status !== "cancelled");
  const revenue = valid.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const average = valid.length ? revenue / valid.length : 0;
  const prepTimes = completed
    .map(
      (order) =>
        (new Date(order.completed_at || order.updated_at || order.created_at).getTime() -
          new Date(order.created_at).getTime()) /
        60000,
    )
    .filter((value) => value >= 0);
  const averagePrep = prepTimes.length
    ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length)
    : 0;
  const byProduct = new Map();
  orders
    .flatMap((order) => order.order_items || [])
    .forEach((item) =>
      byProduct.set(
        item.product_name,
        (byProduct.get(item.product_name) || 0) + Number(item.quantity || 0),
      ),
    );
  const topProducts = [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const cards = [
    [
      "إجمالي المبيعات",
      formatCurrency(revenue, store.currency),
      Banknote,
      "text-green-600 bg-green-50",
    ],
    ["الطلبات", valid.length, ShoppingBag, "text-blue-600 bg-blue-50"],
    [
      "متوسط الطلب",
      formatCurrency(average, store.currency),
      TrendingUp,
      "text-purple-600 bg-purple-50",
    ],
    ["متوسط التجهيز", `${averagePrep} دقيقة`, Clock3, "text-orange-600 bg-orange-50"],
  ];
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">التقارير التشغيلية</h2>
        <p className="mt-1 text-gray-500">مؤشرات تساعدك على اتخاذ قرارات يومية أفضل.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map(([label, value, Icon, color]) => (
          <div key={label} className="rounded-2xl border bg-white p-5">
            <span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
              <Icon size={22} />
            </span>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="mb-4 font-bold">الأصناف الأكثر طلبًا</h3>
          {topProducts.length ? (
            topProducts.map(([name, count], index) => (
              <div key={name} className="flex justify-between border-b py-3 last:border-0">
                <span>
                  {index + 1}. {name}
                </span>
                <strong>{count} طلب</strong>
              </div>
            ))
          ) : (
            <p className="text-gray-500">ستظهر النتائج بعد وصول الطلبات.</p>
          )}
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="mb-4 font-bold">جودة التشغيل</h3>
          <p className="flex justify-between py-3">
            <span className="flex gap-2">
              <Truck size={18} /> طلبات التوصيل
            </span>
            <strong>{orders.filter((o) => o.order_type === "delivery").length}</strong>
          </p>
          <p className="flex justify-between border-t py-3">
            <span className="flex gap-2">
              <XCircle size={18} /> الطلبات الملغاة
            </span>
            <strong>{orders.filter((o) => o.status === "cancelled").length}</strong>
          </p>
          <p className="flex justify-between border-t py-3">
            <span>نسبة الإلغاء</span>
            <strong>
              {orders.length
                ? Math.round(
                    (orders.filter((o) => o.status === "cancelled").length / orders.length) * 100,
                  )
                : 0}
              %
            </strong>
          </p>
        </section>
      </div>
    </div>
  );
}
