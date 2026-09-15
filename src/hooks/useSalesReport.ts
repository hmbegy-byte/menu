import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
export interface SalesReport {
  completed_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  gross_known: number;
  discounts_known: number;
  unknown_discount_orders: number;
  refunds: number;
  net_sales: number;
  average_order: number;
  customer_count: number;
  customers: Array<{
    phone: string;
    name: string;
    orders: number;
    spent: number;
    last_order: string;
  }>;
  products: Array<{ product_id: string | null; product_name: string; quantity: number }>;
}
export function useSalesReport(storeId: string, search = "", offset = 0) {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  useEffect(() => {
    let active = true;
    setReport(null);
    setError("");
    if (!from || !to || from > to) {
      setError("اختر فترة صحيحة");
      return () => {
        active = false;
      };
    }
    const end = new Date(`${to}T00:00:00+03:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    const timer = setTimeout(() => {
      void supabase
        .rpc("restaurant_sales_report", {
          p_store: storeId,
          p_from: `${from}T00:00:00+03:00`,
          p_to: end.toISOString(),
          p_search: search,
          p_offset: offset,
        })
        .then(({ data, error: failure }) => {
          if (!active) return;
          if (failure) setError("تعذر تحميل التقرير. لم تُعرض أرقام جزئية.");
          else setReport(data as SalesReport);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [storeId, from, to, search, offset]);
  return { report, error, from, to, setFrom, setTo };
}
