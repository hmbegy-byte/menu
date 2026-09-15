/* eslint-disable @typescript-eslint/no-explicit-any -- Realtime payloads are untyped until database types are generated. */
import { useEffect, useRef, useState } from "react";
import { hasStoreAccess } from "../lib/access";
import { isMockMode, kitchenSupabase as supabase } from "../lib/supabase";
import { readDemoData, writeDemo } from "../lib/storeDefaults";

import { reconcileKitchen } from "../lib/kitchenRecovery.mjs";

const activeStatuses = ["pending", "preparing", "ready"];

export function useKitchenData(storeSlug: string) {
  const [store, setStore] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncNotice, setSyncNotice] = useState("");
  const queueKeyRef = useRef("");
  const recoverRef = useRef<() => Promise<void>>(async () => {});

  const queueStatusUpdate = (orderId: string, status: string) => {
    if (!queueKeyRef.current) throw new Error("تعذر تحديد حساب المطبخ");
    const current = JSON.parse(localStorage.getItem(queueKeyRef.current) || "[]");
    if (current.some((item: any) => item.orderId === orderId))
      throw new Error("هذا الطلب لديه تحديث بانتظار المزامنة");
    const next = [
      ...current.filter((item: any) => item.orderId !== orderId),
      {
        orderId,
        status,
        expected: orders.find((o) => o.id === orderId)?.status,
        command: crypto.randomUUID(),
        queuedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(queueKeyRef.current, JSON.stringify(next));
    setPendingSync(next.length);
    setConnectionStatus("offline");
  };

  useEffect(() => {
    setLoading(true);
    setOrders([]);
    setStore(null);
    setError(null);
    setSyncNotice("");
    setConnectionStatus("connecting");
    let channel: any;
    let cancelled = false;
    let subscribed = false;
    let recovering: Promise<void> | null = null;
    let recoverAgain = false;
    const applyOrders = (next: any[]) =>
      setOrders((previous) => {
        const previousIds = new Set(previous.map((o) => o.id));
        if (next.some((o) => o.status === "pending" && !previousIds.has(o.id)))
          setNewOrderAlert(true);
        return next.filter((o) => activeStatuses.includes(o.status));
      });
    const load = async () => {
      try {
        if (!(await hasStoreAccess(storeSlug, ["admin", "kitchen"], supabase)))
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("AUTH_REQUIRED");
        const queueKey = `kitchen-queue-v2:${foundStore.id}:${user.id}`;
        queueKeyRef.current = queueKey;
        if (localStorage.getItem(`kitchen-queue:${storeSlug}`)) {
          setSyncNotice(
            "توجد قائمة قديمة غير مرتبطة بحساب؛ لم تُرسل تلقائيًا. راجع حالات الطلبات الحالية قبل تحديثها.",
          );
        }
        const { data: access, error: accessError } = await supabase.rpc("check_kitchen_access", {
          p_store_id: foundStore.id,
        });
        if (accessError) throw new Error("تعذر التحقق من صلاحية تشغيل المطبخ. حاول مرة أخرى.");
        const accessMessages: Record<string, string> = {
          AUTH_REQUIRED: "AUTH_REQUIRED",
          ACCESS_DENIED: "لا تملك صلاحية دخول مطبخ هذا المطعم",
          SUBSCRIPTION_MISSING: "لم يتم إعداد اشتراك المطعم. تواصل مع مالك المنصة.",
          SUBSCRIPTION_INACTIVE: "اشتراك المطعم غير نشط. تواصل مع مالك المنصة.",
          KITCHEN_NOT_INCLUDED: "شاشة المطبخ غير متاحة في باقة المطعم الحالية",
        };
        if (access !== "ALLOWED") {
          throw new Error(
            accessMessages[access] || "تعذر التحقق من صلاحية تشغيل المطبخ. حاول مرة أخرى.",
          );
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
        const recover = (): Promise<void> => {
          if (recovering) {
            recoverAgain = true;
            return recovering;
          }
          recovering = (async () => {
            if (cancelled) return;
            setConnectionStatus("connecting");
            try {
              await reconcileKitchen({
                authorize: async () => {
                  if (cancelled) throw new Error("AUTH_REQUIRED");
                  if (!(await hasStoreAccess(storeSlug, ["admin", "kitchen"], supabase))) {
                    if (!cancelled) {
                      setOrders([]);
                      setError("AUTH_REQUIRED");
                    }
                    throw new Error("AUTH_REQUIRED");
                  }
                  const {
                    data: { user: currentUser },
                  } = await supabase.auth.getUser();
                  if (currentUser?.id !== user.id) {
                    setOrders([]);
                    setError("AUTH_REQUIRED");
                    throw new Error("Account changed");
                  }
                },
                read: () => {
                  const queue = JSON.parse(localStorage.getItem(queueKey) || "[]");
                  setPendingSync(Array.isArray(queue) ? queue.length : 0);
                  return queue;
                },
                send: async (command) => {
                  const { data, error } = await supabase.rpc("kitchen_set_status", {
                    p_store: foundStore.id,
                    p_order: command.orderId,
                    p_expected: command.expected,
                    p_target: command.status,
                    p_command: command.command,
                  });
                  if (error) throw error;
                  return data;
                },
                remove: (id) => {
                  const remaining = JSON.parse(localStorage.getItem(queueKey) || "[]").filter(
                    (c: { command: string }) => c.command !== id,
                  );
                  localStorage.setItem(queueKey, JSON.stringify(remaining));
                  setPendingSync(remaining.length);
                },
                snapshot: fetchOrders,
                stale: () =>
                  setSyncNotice(
                    "تغيّر أحد الطلبات من جهاز آخر؛ أُهمل التحديث القديم لحماية الحالة الحالية",
                  ),
              });
              if (!cancelled)
                setConnectionStatus(subscribed && navigator.onLine ? "online" : "connecting");
            } catch {
              if (!cancelled) setConnectionStatus("offline");
            }
          })().finally(() => {
            recovering = null;
            if (recoverAgain && !cancelled) {
              recoverAgain = false;
              void recover();
            }
          });
          return recovering;
        };
        recoverRef.current = recover;
        await recover();
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
              void recover();
            },
          )
          .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
            void recover();
          })
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR") reportConnectionIncident();
            subscribed = status === "SUBSCRIBED";
            if (subscribed) void recover();
            else if (!cancelled) setConnectionStatus("offline");
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
    const onOnline = () => {
      void recoverRef.current();
    };
    const onOffline = () => setConnectionStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const recoveryTimer = window.setInterval(() => {
      if (navigator.onLine) void recoverRef.current();
    }, 30000);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(recoveryTimer);
      recoverRef.current = async () => {};
      queueKeyRef.current = "";
      if (channel) supabase.removeChannel(channel);
    };
  }, [storeSlug]);

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
      const next = (readDemoData().orders as Array<{ id: string; status: string }>).map((o) =>
        o.id === orderId
          ? { ...o, status, ...timestampUpdates, updated_at: new Date().toISOString() }
          : o,
      );
      writeDemo("orders", next);
      setOrders(next.filter((o) => activeStatuses.includes(o.status)));
      return;
    }
    if (!navigator.onLine) {
      queueStatusUpdate(orderId, status);
      setOrders((prev) =>
        status === "completed" || status === "cancelled"
          ? prev.filter((order) => order.id !== orderId)
          : prev.map((order) =>
              order.id === orderId ? { ...order, status, ...timestampUpdates } : order,
            ),
      );
      return;
    }
    const current = orders.find((o) => o.id === orderId);
    const { data: commandResult, error: updateError } = await supabase.rpc("kitchen_set_status", {
      p_store: store.id,
      p_order: orderId,
      p_expected: current?.status,
      p_target: status,
      p_command: crypto.randomUUID(),
    });
    if (updateError) throw updateError;
    if (commandResult !== "APPLIED") {
      await recoverRef.current();
      throw new Error("تغيّرت حالة الطلب؛ تم تحديث الشاشة، راجع الطلب مجددًا");
    }
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
      const next = (readDemoData().orders as Array<{ id: string; status: string }>).map((order) =>
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
  const acknowledgeCurbside = async (orderId: string) => {
    const acknowledgedAt = new Date().toISOString();
    if (isMockMode) {
      const next = (readDemoData().orders as any[]).map((order) =>
        order.id === orderId ? { ...order, curbside_acknowledged_at: acknowledgedAt } : order,
      );
      writeDemo("orders", next);
      setOrders(next.filter((order) => activeStatuses.includes(order.status)));
      return;
    }
    const { data, error: acknowledgeError } = await supabase.rpc("acknowledge_curbside_arrival", {
      p_store: store.id,
      p_order: orderId,
    });
    if (acknowledgeError) throw acknowledgeError;
    if (!data) throw new Error("لم يتم العثور على تنبيه وصول لهذا الطلب");
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, curbside_acknowledged_at: acknowledgedAt } : order,
      ),
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
    acknowledgeCurbside,
    pendingSync,
    syncNotice,
  };
}
