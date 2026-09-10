import React, { useCallback, useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Volume2, VolumeX, LogOut } from "lucide-react";
import { useKitchenData } from "../hooks/useKitchenData";
import OrderCard from "../components/OrderCard";
import PrintReceipt from "../components/PrintReceipt";
import { signOutStore } from "../lib/access";

export default function Kitchen({ storeSlug }) {
  const navigate = useNavigate();
  const {
    store,
    orders,
    loading,
    error,
    newOrderAlert,
    setNewOrderAlert,
    updateOrderStatus,
    connectionStatus,
    delayOrder,
    pendingSync,
  } = useKitchenData(storeSlug);

  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);
  const [actionError, setActionError] = useState("");

  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Initialize Wake Lock and Audio Context
  const enableAlerts = async () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }

      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }

      setAlertsEnabled(true);
    } catch (err) {
      console.error("Failed to enable alerts:", err);
      alert("تعذر تفعيل التنبيهات. يرجى التأكد من صلاحيات المتصفح.");
    }
  };

  const playBeep = useCallback(() => {
    if (!audioCtxRef.current || !alertsEnabled) return;

    // Stop previous if exists
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch {
        // The previous oscillator may already have stopped naturally.
      }
    }

    const osc = audioCtxRef.current.createOscillator();
    const gainNode = audioCtxRef.current.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(440, audioCtxRef.current.currentTime); // 440Hz A4
    osc.frequency.exponentialRampToValueAtTime(880, audioCtxRef.current.currentTime + 0.5); // rise to 880Hz

    gainNode.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(audioCtxRef.current.destination);

    osc.start();
    osc.stop(audioCtxRef.current.currentTime + 0.5);
    oscillatorRef.current = osc;
  }, [alertsEnabled]);

  useEffect(() => {
    let interval;
    if (newOrderAlert && alertsEnabled) {
      playBeep(); // initial
      interval = setInterval(playBeep, 1500); // repeat every 1.5s
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [newOrderAlert, alertsEnabled, playBeep]);

  useEffect(() => {
    const renewWakeLock = async () => {
      if (alertsEnabled && document.visibilityState === "visible" && "wakeLock" in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        } catch {
          /* unsupported or denied */
        }
      }
    };
    document.addEventListener("visibilitychange", renewWakeLock);
    return () => {
      document.removeEventListener("visibilitychange", renewWakeLock);
      wakeLockRef.current?.release?.();
    };
  }, [alertsEnabled]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setActionError("");
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch {
      setActionError("لم يتم حفظ تغيير الحالة. تحقق من الاتصال وحاول مرة أخرى.");
      return;
    }

    // Check if there are still any pending orders, if not, stop alarm
    const hasPendingOrders = orders.some((o) => o.id !== orderId && o.status === "pending");
    if (!hasPendingOrders) {
      setNewOrderAlert(false);
    }
  };

  const handlePrint = (order) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
  };
  const handleDelay = async (orderId, minutes) => {
    setActionError("");
    try {
      await delayOrder(orderId, minutes);
    } catch {
      setActionError("تعذر تحديث الوقت المتوقع للعميل.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <p className="text-xl text-gray-700">
          {error === "AUTH_REQUIRED"
            ? "يجب تسجيل الدخول بحساب مطبخ مصرح له"
            : error || "المتجر غير موجود"}
        </p>
        <button
          onClick={() => navigate({ to: "/kitchen" })}
          className="px-4 py-2 bg-orange-600 text-white rounded"
        >
          العودة لاختيار المتجر
        </button>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  return (
    <>
      <div
        className={`min-h-screen bg-gray-50 flex flex-col print:hidden ${newOrderAlert ? "animate-pulse ring-8 ring-red-500 ring-inset bg-red-50" : ""}`}
        dir="rtl"
      >
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 sticky top-0 z-10 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h1 className="font-bold text-xl text-gray-900">شاشة المطبخ - {store.name}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-2 rounded-lg text-sm font-bold ${connectionStatus === "online" ? "bg-green-100 text-green-700" : connectionStatus === "demo" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
            >
              {connectionStatus === "online"
                ? "متصل"
                : connectionStatus === "demo"
                  ? "تجريبي"
                  : "غير متصل"}
            </span>
            {pendingSync > 0 && (
              <span className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold text-amber-700">
                {pendingSync} تحديث بانتظار المزامنة
              </span>
            )}
            {!alertsEnabled ? (
              <button
                onClick={enableAlerts}
                className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-200"
              >
                <VolumeX size={18} /> تفعيل التنبيهات الصوتية
              </button>
            ) : (
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                <Volume2 size={18} /> التنبيهات مفعلة
              </div>
            )}
            <button
              onClick={async () => {
                await signOutStore(true);
                navigate({ to: "/kitchen" });
              }}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="تغيير المتجر"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        {actionError && (
          <div
            role="alert"
            className="m-4 mb-0 rounded-lg bg-red-100 p-3 text-center font-bold text-red-700"
          >
            {actionError}
          </div>
        )}

        {/* Board */}
        {!['online','demo'].includes(connectionStatus) && <div role="alert" className="m-4 rounded-xl border border-red-400 bg-red-50 p-4 font-bold text-red-700">الاتصال المباشر غير متاح. قد تتأخر الطلبات والتحديثات؛ تحقق من الاتصال قبل الاعتماد على الشاشة.</div>}
        <main className="flex-1 p-4 grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
          {/* Column 1: Pending */}
          <div className="min-w-0 flex flex-col gap-3">
            <h2 className="font-bold text-lg flex items-center justify-between border-b-2 border-red-500 pb-2">
              <span>طلبات جديدة</span>
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-sm">
                {pendingOrders.length}
              </span>
            </h2>
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pb-10">
              {pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  store={store}
                  onUpdateStatus={handleUpdateStatus}
                  onPrint={handlePrint}
                  onDelay={handleDelay}
                />
              ))}
            </div>
          </div>

          {/* Column 2: Preparing */}
          <div className="min-w-0 flex flex-col gap-3">
            <h2 className="font-bold text-lg flex items-center justify-between border-b-2 border-blue-500 pb-2">
              <span>قيد التحضير</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm">
                {preparingOrders.length}
              </span>
            </h2>
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pb-10">
              {preparingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  store={store}
                  onUpdateStatus={handleUpdateStatus}
                  onPrint={handlePrint}
                  onDelay={handleDelay}
                />
              ))}
            </div>
          </div>

          {/* Column 3: Ready */}
          <div className="min-w-0 flex flex-col gap-3">
            <h2 className="font-bold text-lg flex items-center justify-between border-b-2 border-green-500 pb-2">
              <span>جاهزة ومكتملة</span>
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-sm">
                {readyOrders.length}
              </span>
            </h2>
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pb-10">
              {readyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  store={store}
                  onUpdateStatus={handleUpdateStatus}
                  onPrint={handlePrint}
                  onDelay={handleDelay}
                />
              ))}
            </div>
          </div>
        </main>
      </div>

      <PrintReceipt order={printOrder} store={store} />
    </>
  );
}
