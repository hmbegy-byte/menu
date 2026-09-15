import { CheckCircle2, CreditCard, ReceiptText } from "lucide-react";

export default function BillingAddons({
  adminData,
}: {
  adminData: {
    invoices?: Array<{
      id: string;
      number: string;
      issued_at: string;
      amount: number;
      currency: string;
      status: string;
    }>;
  };
}) {
  return (
    <div className="space-y-7">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <CreditCard className="text-purple-600" /> الفوترة والإضافات
        </h2>
        <p className="mt-1 text-gray-500">
          فواتير اشتراك المنصة، وليست مدفوعات عملاء المطعم. شراء الإضافات غير متاح حتى اكتمال
          التحصيل وتطبيق حدودها.
        </p>
      </div>
      <p className="rounded-xl border p-4">
        شراء الإضافات متوقف حاليًا. لا يتغير اشتراكك من هذه الصفحة.
      </p>
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
