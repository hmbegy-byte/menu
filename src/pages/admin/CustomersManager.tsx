import { Search, ShoppingBag, Star, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "../../lib/currency";

export default function CustomersManager({ adminData }) {
  const [search, setSearch] = useState("");
  const customers = useMemo(() => {
    const grouped = new Map();
    adminData.orders
      .filter((o) => o.status !== "cancelled")
      .forEach((order) => {
        const key = String(order.customer_phone || "").replace(/\s/g, "");
        const current = grouped.get(key) || {
          phone: order.customer_phone,
          name: order.customer_name,
          orders: 0,
          spent: 0,
          lastOrder: order.created_at,
        };
        current.orders += 1;
        current.spent += Number(order.total_amount || 0);
        if (new Date(order.created_at) > new Date(current.lastOrder)) {
          current.lastOrder = order.created_at;
          current.name = order.customer_name;
        }
        grouped.set(key, current);
      });
    return [...grouped.values()].sort((a, b) => b.spent - a.spent);
  }, [adminData.orders]);
  const visible = customers.filter((c) =>
    `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="text-purple-600" /> العملاء
        </h2>
        <p className="mt-1 text-gray-500">قاعدة عملاء موحدة مبنية تلقائيًا من الطلبات.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">إجمالي العملاء</p>
          <p className="text-3xl font-bold">{customers.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">العملاء المتكررون</p>
          <p className="text-3xl font-bold">{customers.filter((c) => c.orders > 1).length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">كبار العملاء</p>
          <p className="text-3xl font-bold">{customers.filter((c) => c.orders >= 3).length}</p>
        </div>
      </div>
      <label className="flex items-center gap-2 rounded-xl border bg-white px-4">
        <Search size={18} className="text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الهاتف"
          className="w-full p-3 outline-none"
        />
      </label>
      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4">العميل</th>
                <th className="p-4">الطلبات</th>
                <th className="p-4">إجمالي الإنفاق</th>
                <th className="p-4">آخر طلب</th>
                <th className="p-4">التصنيف</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((customer) => (
                <tr key={customer.phone} className="border-t">
                  <td className="p-4">
                    <strong>{customer.name}</strong>
                    <p className="text-gray-500" dir="ltr">
                      {customer.phone}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1">
                      <ShoppingBag size={15} /> {customer.orders}
                    </span>
                  </td>
                  <td className="p-4 font-bold">
                    {formatCurrency(customer.spent, adminData.store.currency)}
                  </td>
                  <td className="p-4">
                    {new Date(customer.lastOrder).toLocaleDateString("ar-SA")}
                  </td>
                  <td className="p-4">
                    {customer.orders >= 3 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-700">
                        <Star size={13} /> مميز
                      </span>
                    ) : customer.orders > 1 ? (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                        متكرر
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-1">جديد</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && <p className="p-8 text-center text-gray-500">لا توجد نتائج.</p>}
      </div>
    </div>
  );
}
