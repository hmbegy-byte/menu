import { CheckCircle2, CreditCard, Puzzle, ReceiptText } from "lucide-react";

const catalog = [
  {
    code: "delivery_plus",
    name: "التوصيل المتقدم",
    description: "مناطق ورسوم وأوقات مختلفة",
    price: 49,
  },
  {
    code: "customer_insights",
    name: "تحليلات العملاء",
    description: "شرائح العملاء وتقارير متقدمة",
    price: 39,
  },
  {
    code: "priority_support",
    name: "الدعم ذو الأولوية",
    description: "استجابة أسرع ومتابعة إعداد الحساب",
    price: 59,
  },
  { code: "extra_branch", name: "فرع إضافي", description: "إضافة فرع فوق حد الباقة", price: 79 },
];
export default function BillingAddons({ adminData }) {
  const activeCodes = new Set(
    (adminData.subscriptionAddons || []).filter((item) => item.active).map((item) => item.code),
  );
  return (
    <div className="space-y-7">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <CreditCard className="text-purple-600" /> الفوترة والإضافات
        </h2>
        <p className="mt-1 text-gray-500">راجع الفواتير وفعّل الخدمات التي يحتاجها المطعم فقط.</p>
      </div>
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-bold">
          <Puzzle size={19} /> الإضافات المتاحة
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {catalog.map((addon) => {
            const active = activeCodes.has(addon.code);
            return (
              <div
                key={addon.code}
                className={`rounded-2xl border p-5 ${active ? "border-green-300 bg-green-50" : "bg-white"}`}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <h4 className="font-bold">{addon.name}</h4>
                    <p className="mt-1 text-sm text-gray-500">{addon.description}</p>
                  </div>
                  <p className="whitespace-nowrap font-bold">{addon.price} ر.س/شهر</p>
                </div>
                <button
                  onClick={() => adminData.toggleSubscriptionAddon?.(addon)}
                  className={`mt-4 w-full rounded-xl py-2.5 font-bold ${active ? "bg-white text-green-700" : "bg-purple-600 text-white"}`}
                >
                  {active ? "مفعلة — إلغاء" : "تفعيل الإضافة"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-bold">
          <ReceiptText size={19} /> سجل الفواتير
        </h3>
        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4">رقم الفاتورة</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">المبلغ</th>
                <th className="p-4">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(adminData.invoices || []).map((invoice) => (
                <tr key={invoice.id} className="border-t">
                  <td className="p-4 font-bold">{invoice.number}</td>
                  <td className="p-4">{invoice.issued_at}</td>
                  <td className="p-4">
                    {invoice.amount} {invoice.currency}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-green-700">
                      <CheckCircle2 size={14} />{" "}
                      {invoice.status === "paid" ? "مدفوعة" : invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
