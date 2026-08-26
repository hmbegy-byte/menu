import React, { useState } from "react";
import { Search, Filter, Phone, User, Calendar, FileText, X, MapPin } from "lucide-react";

export default function OrderHistory({ store, orders }) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchPhone, setSearchPhone] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = orders.filter((order) => {
    let match = true;
    if (filterStatus !== "all" && order.status !== filterStatus) match = false;
    if (searchPhone && !String(order.customer_phone || "").includes(searchPhone)) match = false;
    if (filterDate && !order.created_at.startsWith(filterDate)) match = false;
    return match;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">
            جديد
          </span>
        );
      case "preparing":
        return (
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
            يُحضّر
          </span>
        );
      case "ready":
        return (
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
            مكتمل
          </span>
        );
      case "cancelled":
        return (
          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
            ملغي
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">سجل الطلبات</h2>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="بحث برقم هاتف العميل..."
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            className="w-full pl-3 pr-10 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        <div className="relative">
          <Filter className="absolute right-3 top-3 text-gray-400" size={18} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="pl-3 pr-10 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm appearance-none bg-white min-w-[150px]"
          >
            <option value="all">كل الحالات</option>
            <option value="pending">الجديدة</option>
            <option value="preparing">قيد التحضير</option>
            <option value="ready">المكتملة</option>
            <option value="cancelled">الملغاة</option>
          </select>
        </div>

        <div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm text-gray-700 h-full"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
              <tr>
                <th className="p-4 font-medium">رقم الطلب</th>
                <th className="p-4 font-medium">التاريخ والوقت</th>
                <th className="p-4 font-medium">العميل</th>
                <th className="p-4 font-medium">المنتجات</th>
                <th className="p-4 font-medium">الإجمالي</th>
                <th className="p-4 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    لا توجد طلبات مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="p-4">
                      <span className="font-bold text-gray-900">#{order.order_number}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar size={14} />
                        {new Date(order.created_at).toLocaleString("ar-EG", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm font-bold text-gray-900">
                          <User size={14} className="text-gray-400" /> {order.customer_name}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500" dir="ltr">
                          <Phone size={12} /> {order.customer_phone}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      <div className="flex items-start gap-1">
                        <FileText size={16} className="text-gray-400 mt-0.5" />
                        <div>
                          {(order.order_items || []).map((item, idx) => (
                            <div key={idx} className="line-clamp-1">
                              {item.quantity}x {item.product_name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      {order.total_amount}{" "}
                      <span className="text-xs text-gray-500">{store.currency}</span>
                    </td>
                    <td className="p-4">{getStatusBadge(order.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-xl text-gray-900">
                  طلب #{selectedOrder.order_number}
                </h3>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-gray-900 mb-2 border-b border-gray-200 pb-2">
                  معلومات العميل
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-gray-700 text-sm">
                    <User size={16} className="text-purple-600" />
                    <span className="font-bold">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 text-sm" dir="ltr">
                    <Phone size={16} className="text-purple-600" />
                    <span className="font-bold">{selectedOrder.customer_phone}</span>
                  </div>
                  {selectedOrder.customer_address && (
                    <div className="col-span-full flex items-start gap-2 text-gray-700 text-sm mt-2">
                      <MapPin size={16} className="text-purple-600 shrink-0 mt-0.5" />
                      <span>{selectedOrder.customer_address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                  تفاصيل الطلب
                </h4>
                <div className="space-y-3">
                  {(selectedOrder.order_items || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <div className="font-bold text-gray-900">
                          {item.quantity}x {item.product_name}
                        </div>
                        {item.selected_options && item.selected_options.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1 space-y-1">
                            {item.selected_options.map((opt, oIdx) => (
                              <div key={oIdx}>
                                -{" "}
                                {opt.choice
                                  ? `${opt.name}: ${opt.choice.label || opt.choice}`
                                  : opt.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-gray-900">
                        {item.unit_price * item.quantity} {store.currency}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>المجموع الفرعي</span>
                  <span>
                    {selectedOrder.total_amount} {store.currency}
                  </span>
                </div>
                {/* Assuming no tax/delivery for simplicity unless added to order payload */}
                <div className="flex justify-between font-bold text-lg text-purple-900 pt-2 border-t border-purple-100 mt-2">
                  <span>الإجمالي</span>
                  <span>
                    {selectedOrder.total_amount} {store.currency}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
