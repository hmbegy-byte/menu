/* eslint-disable @typescript-eslint/no-explicit-any -- RPC types are generated after migration. */
import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { formatCurrency } from "../../lib/currency";
import { isMockMode, supabase } from "../../lib/supabase";
import { readDemoData } from "../../lib/storeDefaults";
import type { AdminViewData } from "../../lib/adminViewTypes";

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const firstOfMonth = () => localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
export default function ProfitabilityReport({ adminData }: { adminData: AdminViewData }) {
  const [period, setPeriod] = useState({
    from: firstOfMonth(),
    to: localDate(new Date()),
  });
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");
  const [defaults, setDefaults] = useState({
    defaultPaymentFee: Number(adminData.settings.defaultPaymentFee || 0),
    defaultDeliveryFulfillmentCost: Number(adminData.settings.defaultDeliveryFulfillmentCost || 0),
    defaultCommissionPercent: Number(adminData.settings.defaultCommissionPercent || 0),
  });
  useEffect(() => {
    void (async () => {
      setError("");
      if (isMockMode) {
        const expenses = JSON.parse(
          localStorage.getItem(`demo_expenses:${adminData.store.id}`) || "[]",
        ).filter(
          (expense: { expense_date: string; reporting_scope: string }) =>
            expense.reporting_scope === "store_only" &&
            expense.expense_date >= period.from &&
            expense.expense_date <= period.to,
        );
        const completed = readDemoData().orders.filter(
          (order: { status: string; completed_at?: string; created_at: string }) => {
            const date = String(order.completed_at || order.created_at).slice(0, 10);
            return order.status === "completed" && date >= period.from && date <= period.to;
          },
        );
        const revenue = completed.reduce(
          (
            sum: number,
            order: { total_amount: number; refunded_amount?: number; tax_amount?: number },
          ) =>
            sum +
            Math.max(
              Number(order.total_amount) -
                Number(order.refunded_amount || 0) -
                Number(order.tax_amount || 0),
              0,
            ),
          0,
        );
        const recordedExpenses = expenses.reduce(
          (sum: number, expense: { amount: number }) => sum + Number(expense.amount),
          0,
        );
        setReport({
          revenue,
          variable_costs: 0,
          contribution_margin: revenue,
          recorded_expenses: recordedExpenses,
          result_after_recorded_expenses: revenue - recordedExpenses,
          incomplete_cost_orders: completed.length,
        });
        return;
      }
      const to = new Date(`${period.to}T00:00:00`);
      to.setDate(to.getDate() + 1);
      const { data, error: requestError } = await supabase.rpc("restaurant_profitability_report", {
        p_store: adminData.store.id,
        p_from: `${period.from}T00:00:00`,
        p_to: to.toISOString(),
      });
      if (requestError) setError(requestError.message);
      else setReport(data);
    })();
  }, [adminData.store.id, period]);
  const money = (value: number) => formatCurrency(Number(value || 0), adminData.store.currency);
  if (!adminData.settings.profitabilityEnabled)
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <TrendingUp className="mx-auto mb-3 text-primary" size={34} />
        <h2 className="text-2xl font-black">تقرير الربحية غير مفعل</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          فعّله بعد إدخال تكاليف المكونات والمصروفات حتى لا يعطي قراءة مضللة.
        </p>
        <button
          onClick={() =>
            void adminData
              .saveStoreSection("settings", { ...adminData.settings, profitabilityEnabled: true })
              .then(() => adminData.reload())
          }
          className="mt-5 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground"
        >
          تفعيل التقرير
        </button>
      </div>
    );
  return (
    <div className="space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-2xl font-black">
          <TrendingUp className="text-primary" /> الربحية التشغيلية
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          هامش مساهمة تشغيلي وليس «صافي ربح محاسبي».
        </p>
      </header>
      <div className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2">
        <label className="text-sm font-bold">
          من
          <input
            type="date"
            value={period.from}
            onChange={(e) => setPeriod({ ...period, from: e.target.value })}
            className="mt-1 w-full rounded-xl border bg-background p-3"
          />
        </label>
        <label className="text-sm font-bold">
          إلى
          <input
            type="date"
            value={period.to}
            onChange={(e) => setPeriod({ ...period, to: e.target.value })}
            className="mt-1 w-full rounded-xl border bg-background p-3"
          />
        </label>
      </div>
      <section className="rounded-2xl border bg-card p-5">
        <h3 className="font-bold">التكاليف التشغيلية الافتراضية للطلبات الجديدة</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          تُحفظ لقطة هذه القيم داخل الطلب عند بدء التحضير؛ تغييرها لاحقًا لا يغيّر التقارير القديمة.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm font-bold">
            رسوم الدفع لكل طلب
            <input
              type="number"
              min="0"
              step="0.01"
              value={defaults.defaultPaymentFee}
              onChange={(event) =>
                setDefaults({ ...defaults, defaultPaymentFee: Number(event.target.value) })
              }
              className="mt-1 w-full rounded-xl border bg-background p-3"
            />
          </label>
          <label className="text-sm font-bold">
            تكلفة تنفيذ التوصيل
            <input
              type="number"
              min="0"
              step="0.01"
              value={defaults.defaultDeliveryFulfillmentCost}
              onChange={(event) =>
                setDefaults({
                  ...defaults,
                  defaultDeliveryFulfillmentCost: Number(event.target.value),
                })
              }
              className="mt-1 w-full rounded-xl border bg-background p-3"
            />
          </label>
          <label className="text-sm font-bold">
            العمولة %
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={defaults.defaultCommissionPercent}
              onChange={(event) =>
                setDefaults({ ...defaults, defaultCommissionPercent: Number(event.target.value) })
              }
              className="mt-1 w-full rounded-xl border bg-background p-3"
            />
          </label>
        </div>
        <button
          onClick={() =>
            void adminData
              .saveStoreSection("settings", { ...adminData.settings, ...defaults })
              .then(() => adminData.reload())
          }
          className="mt-4 rounded-xl border px-5 py-3 font-bold"
        >
          حفظ تكاليف الطلبات القادمة
        </button>
      </section>
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      ) : !report ? (
        <p>جارٍ تحميل التقرير…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["إيراد الطلبات بعد الاسترداد والضريبة", money(report.revenue)],
              ["التكاليف المتغيرة المسجلة", money(report.variable_costs)],
              ["هامش مساهمة الطلبات", money(report.contribution_margin)],
              ["مصروفات الفرع المسجلة", money(report.recorded_expenses)],
              ["النتيجة بعد المصروفات المسجلة", money(report.result_after_recorded_expenses)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border bg-card p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <strong className="mt-2 block text-2xl">{value}</strong>
              </div>
            ))}
          </div>
          {Number(report.incomplete_cost_orders) > 0 && (
            <p
              role="status"
              className="flex gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
            >
              <AlertTriangle className="shrink-0" /> يوجد {report.incomplete_cost_orders} طلبًا
              بتكاليف ناقصة؛ النتيجة المعروضة غير مكتملة ولا يجب اعتبار الناقص صفرًا.
            </p>
          )}
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            المصروفات المشتركة لا تدخل تلقائيًا في نتيجة أي فرع لمنع احتسابها أكثر من مرة. وزّعها
            يدويًا كمصروف خاص بالفرع عند اعتماد طريقة توزيع واضحة.
          </p>
        </>
      )}
    </div>
  );
}
