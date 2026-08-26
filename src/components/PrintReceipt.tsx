import React from "react";

export default function PrintReceipt({ order, store }) {
  if (!order || !store) return null;

  const dateFormatted = new Date(order.created_at).toLocaleDateString("ar-EG");
  const timeFormatted = new Date(order.created_at).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="hidden print:block text-black bg-white"
      dir="rtl"
      style={{ width: "80mm", margin: "0 auto", fontSize: "12px" }}
    >
      <div className="text-center border-b border-black pb-2 mb-2">
        <h1 className="font-bold text-xl">{store.name}</h1>
        <p>رقم الطلب: #{order.order_number}</p>
        <p>
          {dateFormatted} - {timeFormatted}
        </p>
      </div>

      <div className="border-b border-black pb-2 mb-2">
        <p>العميل: {order.customer_name}</p>
        <p>تليفون: {order.customer_phone}</p>
        <p>النوع: {order.order_type === "delivery" ? "توصيل" : "استلام"}</p>
        {order.order_type === "delivery" && <p>العنوان: {order.delivery_address}</p>}
      </div>

      <div className="border-b border-black pb-2 mb-2">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-black border-dashed">
              <th className="py-1">الصنف</th>
              <th className="py-1">الكمية</th>
              <th className="py-1 text-left">السعر</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items &&
              order.order_items.map((item, idx) => (
                <React.Fragment key={idx}>
                  <tr>
                    <td className="py-1">{item.product_name}</td>
                    <td className="py-1">{item.quantity}</td>
                    <td className="py-1 text-left">{item.unit_price * item.quantity}</td>
                  </tr>
                  {item.selected_options &&
                    item.selected_options.map((opt, oIdx) => (
                      <tr key={`opt-${oIdx}`} className="text-gray-600 text-xs">
                        <td colSpan="3" className="pb-1 pl-2">
                          - {opt.choice ? `${opt.name}: ${opt.choice.label}` : opt.name}
                          {opt.choice?.price > 0 ? ` (+${opt.choice.price})` : ""}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between font-bold text-lg mb-2">
        <span>الإجمالي:</span>
        <span>
          {order.total_amount} {store.currency}
        </span>
      </div>

      {order.notes && (
        <div className="border border-black p-1 mb-2">
          <strong>ملاحظات:</strong> {order.notes}
        </div>
      )}

      <div className="text-center mt-4 pt-2 border-t border-black border-dashed">
        <p>شكراً لطلبكم!</p>
      </div>
    </div>
  );
}
