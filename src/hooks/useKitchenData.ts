/* eslint-disable @typescript-eslint/no-explicit-any -- Realtime payloads are untyped until database types are generated. */
import { useEffect, useState } from "react";
import { hasStoreAccess } from "../lib/access";
import { isMockMode, supabase } from "../lib/supabase";
import { readDemoData, writeDemo } from "../lib/storeDefaults";

const activeStatuses = ["pending", "preparing", "ready"];

export function useKitchenData(storeSlug: string) {
  const [store, setStore] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const queueKey = `kitchen-offline-queue:${storeSlug}`;

  const queueStatusUpdate = (orderId: string, status: string, updates: Record<string, any>) => {
    const current = JSON.parse(localStorage.getItem(queueKey) || "[]");
    const next = [
      ...current.filter((item: any) => item.orderId !== orderId),
      { orderId, status, updates, queuedAt: new Date().toISOString() },
    ];
    localStorage.setItem(queueKey, JSON.stringify(next));
    setPendingSync(next.length);
    setConnectionStatus("offline");
  };

  useEffect(() => {
    let channel: any;
    let cancelled = false;
    const applyOrders = (next: any[]) =>
      setOrders((previous) => {
        const previousIds = new Set(previous.map((o) => o.id));
        if (next.some((o) => o.status === "pending" && !previousIds.has(o.id)))
          setNewOrderAlert(true);
        return next.filter((o) => activeStatuses.includes(o.status));
      });
    const load = async () => {
      try {
        if (!(await hasStoreAccess(storeSlug, ["admin", "kitchen"])))
          throw new Error("AUTH_REQUIRED");
        if (isMockMode) {
          const demo = readDemoData();
          setStore(demo.store);
          applyOrders(demo.orders);
          setConnectionStatus("demo");
          return;
        }
        const { data: foundStore, error: storeError } = await supabase
          .from("stores")
          .select("*")
          .eq("slug", storeSlug)
          .maybeSingle();
        if (storeError) throw storeError;
        if (!foundStore) throw new Error("المطعم غير موجود");
        const { data: subscription, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select("status, plans(features)")
          .eq("organization_id", foundStore.organization_id)
          .maybeSingle();
        if (subscriptionError) throw subscriptionError;
        const features = subscription?.plans?.features || [];
        if (!subscription || !["trial", "active"].includes(subscription.status)) {
          throw new Error("اشتراك المطعم غير نشط");
        }
        if (!features.includes("kitchen")) {
          throw new Error("شاشة المطبخ غير متاحة في باقة المطعم الحالية");
        }
        setStore(foundStore);
        const fetchOrders = async () => {
          const { data, error: ordersError } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .eq("store_id", foundStore.id)
            .in("status", activeStatuses)
            .order("created_at");
          if (ordersError) throw ordersError;
          if (!cancelled) applyOrders(data || []);
        };
        await fetchOrders();
        setConnectionStatus("online");
        const reportConnectionIncident = () =>
          supabase.rpc("report_store_incident", {
            p_store_id: foundStore.id,
            p_source: "kitchen_realtime",
            p_severity: "critical",
            p_title: "انقطع اتصال شاشة المطبخ",
            p_details: "تعذر استقبال تحديثات الطلبات لحظيًا. تحاول الشاشة إعادة الاتصال تلقائيًا.",
          });
        channel = supabase
          .channel(`kitchen-${foundStore.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "orders",
              filter: `store_id=eq.${foundStore.id}`,
            },
            () => {
              fetchOrders().catch(() => setConnectionStatus("offline"));
            },
          )
          .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
            fetchOrders().catch(() => setConnectionStatus("offline"));
          })
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR") reportConnectionIncident();
            setConnectionStatus(
              status === "SUBSCRIBED"
                ? "online"
                : status === "CHANNEL_ERROR"
                  ? "offline"
                  : "connecting",
            );
          });
      } catch (err) {
        setError(err instanceof Error ? err.message : "تعذر تحميل شاشة المطبخ");
        setConnectionStatus("offline");
      } finally {
        setLoading(false);
      }
    };
    load();
    const onStorage = () => {
      if (isMockMode) {
        const demo = readDemoData();
        setStore(demo.store);
        applyOrders(demo.orders);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      if (channel) supabase.removeChannel(channel);
    };
  }, [storeSlug]);

  useEffect(() => {
    if (isMockMode || !store?.id) return;
    const flushQueue = async () => {
      const queued = JSON.parse(localStorage.getItem(queueKey) || "[]");
      if (!queued.length) {
        setPendingSync(0);
        return;
      }
      const remaining = [];
      for (const item of queued) {
        const { error: syncError } = await supabase
          .from("orders")
          .update({ status: item.status, ...item.updates })
          .eq("id", item.orderId)
          .eq("store_id", store.id);
        if (syncError) remaining.push(item);
      }
      localStorage.setItem(queueKey, JSON.stringify(remaining));
      setPendingSync(remaining.length);
      if (!remaining.length) setConnectionStatus("online");
    };
    setPendingSync(JSON.parse(localStorage.getItem(queueKey) || "[]").length);
    window.addEventListener("online", flushQueue);
    if (navigator.onLine) flushQueue();
    return () => window.removeEventListener("online", flushQueue);
  }, [store?.id, queueKey]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    const timestampUpdates =
      status === "preparing"
        ? { accepted_at: new Date().toISOString() }
        : status === "ready"
          ? { ready_at: new Date().toISOString() }
          : status === "completed"
            ? { completed_at: new Date().toISOString() }
            : {};
    if (isMockMode) {
      const next = readDemoData().orders.map((o) =>
        o.id === orderId
          ? { ...o, status, ...timestampUpdates, updated_at: new Date().toISOString() }
          : o,
      );
      writeDemo("orders", next);
      setOrders(next.filter((o) => activeStatuses.includes(o.status)));
      return;
    }
    if (!navigator.onLine) {
      queueStatusUpdate(orderId, status, timestampUpdates);
      setOrders((prev) =>
        status === "completed" || status === "cancelled"
          ? prev.filter((order) => order.id !== orderId)
          : prev.map((order) =>
              order.id === orderId ? { ...order, status, ...timestampUpdates } : order,
            ),
      );
      return;
    }
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status, ...timestampUpdates })
      .eq("id", orderId)
      .eq("store_id", store.id);
    if (updateError) throw updateError;
    setOrders((prev) =>
      status === "completed" || status === "cancelled"
        ? prev.filter((o) => o.id !== orderId)
        : prev.map((o) => (o.id === orderId ? { ...o, status, ...timestampUpdates } : o)),
    );
  };
  const delayOrder = async (orderId: string, minutes: number) => {
    const current = orders.find((order) => order.id === orderId);
    const promisedAt = new Date(current?.promised_at || Date.now());
    promisedAt.setMinutes(promisedAt.getMinutes() + minutes);
    const updates = {
      promised_at: promisedAt.toISOString(),
      delayed_minutes: Number(current?.delayed_minutes || 0) + minutes,
    };
    if (isMockMode) {
      const next = readDemoData().orders.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order,
      );
      writeDemo("orders", next);
      setOrders(next.filter((order) => activeStatuses.includes(order.status)));
      return;
    }
    const { error: delayError } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId)
      .eq("store_id", store.id);
    if (delayError) throw delayError;
    setOrders((currentOrders) =>
      currentOrders.map((order) => (order.id === orderId ? { ...order, ...updates } : order)),
    );
  };
  return {
    store,
    orders,
    loading,
    error,
    connectionStatus,
    newOrderAlert,
    setNewOrderAlert,
    updateOrderStatus,
    delayOrder,
    pendingSync,
  };
}
