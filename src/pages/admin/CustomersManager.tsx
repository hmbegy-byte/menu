import { useState } from "react";
import { formatCurrency } from "../../lib/currency";
import { useSalesReport } from "../../hooks/useSalesReport";
import ReportPeriod from "../../components/ReportPeriod";
export default function CustomersManager({
  adminData,
}: {
  adminData: { store: { id: string; currency: string } };
}) {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const data = useSalesReport(adminData.store.id, search, offset);
  const r = data.report;
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">العملاء</h2>
      <ReportPeriod
        {...data}
        setFrom={(v) => {
          setOffset(0);
          data.setFrom(v);
        }}
        setTo={(v) => {
          setOffset(0);
          data.setTo(v);
        }}
      />
      <p>
        الإنفاق للطلبات المكتملة بعد المرتجعات المسجلة. الأرقام تخص الفترة المختارة، وليست دليلًا
        على التحصيل.
      </p>
      <label className="block">
        البحث بالاسم أو الهاتف
        <input
          className="block w-full rounded border p-3"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
        />
      </label>
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !r ? (
        <p role="status">جارٍ التحميل…</p>
      ) : (
        <>
          <p>عدد العملاء المطابقين: {r.customer_count}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr>
                  {["العميل", "الهاتف", "المكتملة", "صافي الإنفاق", "آخر طلب"].map((h) => (
                    <th key={h} className="p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.customers.map((c) => (
                  <tr key={c.phone} className="border-t">
                    <td className="p-3">{c.name}</td>
                    <td dir="ltr" className="p-3">
                      {c.phone}
                    </td>
                    <td className="p-3">{c.orders}</td>
                    <td className="p-3">{formatCurrency(c.spent, adminData.store.currency)}</td>
                    <td className="p-3">
                      {new Date(c.last_order).toLocaleDateString("ar-SA", {
                        timeZone: "Asia/Riyadh",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <button
              className="rounded border p-2 disabled:opacity-40"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 50))}
            >
              السابق
            </button>
            <button
              className="rounded border p-2 disabled:opacity-40"
              disabled={offset + 50 >= r.customer_count}
              onClick={() => setOffset(offset + 50)}
            >
              التالي
            </button>
          </div>
        </>
      )}
    </div>
  );
}
