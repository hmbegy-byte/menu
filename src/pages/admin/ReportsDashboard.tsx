import { formatCurrency } from "../../lib/currency";
import { useSalesReport } from "../../hooks/useSalesReport";
import ReportPeriod from "../../components/ReportPeriod";
export default function ReportsDashboard({
  adminData,
}: {
  adminData: { store: { id: string; currency: string } };
}) {
  const data = useSalesReport(adminData.store.id);
  const r = data.report;
  const money = (n: number) => formatCurrency(n, adminData.store.currency);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">تقارير المبيعات</h2>
      <ReportPeriod {...data} />
      <p>
        المبيعات للطلبات المكتملة فقط، بعد المرتجعات المسجلة، وتشمل الضريبة والتوصيل. المعلقة
        والملغاة لا تدخل في المبيعات. هذه ليست أرباحًا ولا إثبات تحصيل.
      </p>
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !r ? (
        <p role="status">جارٍ تحميل التقرير…</p>
      ) : (
        <>
          {r.unknown_discount_orders > 0 && (
            <p role="status" className="rounded-xl border p-4">
              هناك {r.unknown_discount_orders} طلبًا قديمًا لم يُسجل خصمه الأصلي. الإجمالي قبل الخصم
              والخصومات أدناه للطلبات الموثقة فقط؛ صافي المبيعات يشمل كل المكتملة.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["صافي المبيعات", money(r.net_sales)],
              ["الطلبات المكتملة", r.completed_orders],
              ["متوسط المكتمل بعد المرتجعات", money(r.average_order)],
              ["المرتجعات المسجلة", money(r.refunds)],
              ["قبل الخصم — الموثق", money(r.gross_known)],
              ["الخصومات الموثقة", money(r.discounts_known)],
              ["قيد التنفيذ", r.pending_orders],
              ["ملغاة", r.cancelled_orders],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border p-4">
                <p>{label}</p>
                <strong className="text-2xl">{value}</strong>
              </div>
            ))}
          </div>
          <section className="rounded-xl border p-4">
            <h3 className="font-bold">الأصناف الأكثر طلبًا</h3>
            <p className="text-sm">
              كميات الطلبات المكتملة غير المستردة بالكامل؛ الاسترداد الجزئي مبلغ على الطلب ولا يحدد
              وحدات صنف مرتجعة.
            </p>
            {r.products.map((p) => (
              <div
                key={String(p.product_id) + p.product_name}
                className="flex justify-between border-b py-3"
              >
                <span>{p.product_name}</span>
                <strong>{p.quantity}</strong>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
