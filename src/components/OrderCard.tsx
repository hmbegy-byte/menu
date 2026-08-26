import React, { useEffect, useState } from "react";
import { Printer, Check, XCircle, Clock, TimerReset } from "lucide-react";

export default function OrderCard({ order, store, onUpdateStatus, onPrint, onDelay }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 60000));
  const warningAt = Number(store.settings?.kitchenWarningMinutes || 15);
  const lateAt = Number(store.settings?.kitchenLateMinutes || 25);
  const urgency =
    elapsed >= lateAt
      ? "border-red-400 bg-red-50"
      : elapsed >= warningAt
        ? "border-amber-300 bg-amber-50"
        : "border-gray-200 bg-white";
  const timeFormatted = new Date(order.created_at).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`rounded-xl shadow-sm border p-4 flex flex-col gap-3 ${urgency}`}>
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">
          #{order.order_number || String(order.id).slice(0, 8)}
        </span>
        <div className="flex items-center text-sm text-gray-500 gap-1">
          <Clock size={14} />
          <span>{timeFormatted}</span>
          <span
            className={`mr-2 rounded-full px-2 py-1 font-bold ${elapsed >= lateAt ? "bg-red-600 text-white" : elapsed >= warningAt ? "bg-amber-500 text-white" : "bg-gray-100"}`}
          >
            {elapsed} د
          </span>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <div className="font-semibold text-gray-800">{order.customer_name}</div>
        <div className="text-gray-600">{order.customer_phone}</div>
        <div className="flex gap-2 items-center mt-2">
          <span
            className={`px-2 py-1 rounded text-xs font-bold ${order.order_type === "delivery" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}
          >
            {order.order_type === "delivery" ? "توصيل" : "استلام"}
          </span>
          {order.order_type === "delivery" && (
            <span className="text-gray-600 truncate">{order.delivery_address}</span>
          )}
        </div>
        {order.delivery_zone && (
          <p className="text-xs font-bold text-blue-700">المنطقة: {order.delivery_zone}</p>
        )}
        {order.table_number && (
          <p className="text-xs font-bold text-purple-700">الطاولة: {order.table_number}</p>
        )}
      </div>

      <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-2 max-h-40 overflow-y-auto">
        {order.order_items &&
          order.order_items.map((item, itemIndex) => (
            <div
              key={item.id || `${item.product_id || item.product_name}-${itemIndex}`}
              className="border-b border-gray-200 last:border-0 pb-2 last:pb-0"
            >
              <div className="font-semibold">
                {item.quantity}x {item.product_name}
              </div>
              {item.selected_options && item.selected_options.length > 0 && (
                <div className="text-gray-500 text-xs pr-4 space-y-0.5 mt-1">
                  {item.selected_options.map((opt, idx) => (
                    <div key={idx}>
                      - {opt.choice ? `${opt.name}: ${opt.choice.label}` : opt.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        {order.notes && (
          <div className="pt-2 mt-2 border-t border-red-100 text-red-600 font-medium text-xs">
            ملاحظة: {order.notes}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-gray-100">
        {order.status === "pending" && (
          <button
            onClick={() => onUpdateStatus(order.id, "preparing")}
            className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-blue-700"
          >
            <Check size={16} /> قبول وتجهيز
          </button>
        )}

        {order.status === "preparing" && (
          <button
            onClick={() => onUpdateStatus(order.id, "ready")}
            className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-green-700"
          >
            <Check size={16} /> جاهز التسليم
          </button>
        )}
        {order.status === "ready" && (
          <button
            onClick={() => onUpdateStatus(order.id, "completed")}
            className="flex-1 bg-gray-900 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-black"
          >
            <Check size={16} /> تم التسليم
          </button>
        )}

        <button
          onClick={() => onPrint(order)}
          className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          title="طباعة"
        >
          <Printer size={18} />
        </button>

        {order.status !== "ready" && (
          <button
            onClick={() => onDelay?.(order.id, 10)}
            className="p-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100"
            title="إضافة 10 دقائق"
          >
            <TimerReset size={18} />
          </button>
        )}

        <button
          onClick={() => {
            if (window.confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) {
              onUpdateStatus(order.id, "cancelled");
            }
          }}
          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
          title="إلغاء الطلب"
        >
          <XCircle size={18} />
        </button>
      </div>
    </div>
  );
}
