import React from "react";
import { Banknote, ShoppingBag, Clock, PlusCircle, FileText, ArrowLeft } from "lucide-react";
import OnboardingChecklist from "./OnboardingChecklist";

export default function StoreSettings({ adminData, setActiveTab }) {
  const { store, orders } = adminData;

  // Calculate Metrics
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  const todayOrders = orders.filter(
    (o) => o.created_at.startsWith(today) && o.status !== "cancelled",
  );
  const totalRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">أهلاً بك في لوحة الإدارة 👋</h2>
        <p className="text-gray-500 mt-1">إليك نظرة سريعة على أداء متجرك اليوم.</p>
      </div>

      <section aria-label="التشغيل الحالي" className="grid gap-3 sm:grid-cols-3">
        <button onClick={()=>setActiveTab('orders')} className="rounded-xl border bg-card p-5 text-start"><span className="block text-muted-foreground">الطلبات الحالية</span><strong className="text-2xl">{orders.filter(o=>['pending','preparing','ready','out_for_delivery'].includes(o.status)).length}</strong></button>
        <button onClick={()=>setActiveTab('products')} className="rounded-xl border bg-card p-5 text-start"><span className="block text-muted-foreground">أصناف غير متاحة</span><strong className="text-2xl">{adminData.products.filter(p=>p.is_available===false).length}</strong></button>
        <button onClick={()=>setActiveTab('settings')} className="rounded-xl border bg-card p-5 text-start"><span className="block text-muted-foreground">استقبال الطلبات اليدوي</span><strong>{adminData.settings?.acceptingOrders===false?'متوقف':'مفعّل'}</strong><span className="mt-1 block text-sm text-muted-foreground">تظل ساعات العمل والإيقاف المؤقت سارية</span></button>
      </section>
      <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer font-bold">تجهيز المطعم للإطلاق</summary><div className="pt-4"><OnboardingChecklist adminData={adminData} setActiveTab={setActiveTab} /></div></details>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
            <Banknote size={32} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">مبيعات اليوم</p>
            <p className="text-3xl font-bold text-gray-900">
              {totalRevenue}{" "}
              <span className="text-sm font-normal text-gray-500">{store.currency}</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <ShoppingBag size={32} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">إجمالي الطلبات</p>
            <p className="text-3xl font-bold text-gray-900">{totalOrdersCount}</p>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setActiveTab("orders")}
        >
          <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={32} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">قيد الانتظار</p>
            <p className="text-3xl font-bold text-gray-900">{pendingOrdersCount}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">إجراءات سريعة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab("products")}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-gray-200 rounded-2xl hover:border-purple-500 hover:text-purple-600 transition-colors group"
          >
            <div className="w-12 h-12 bg-gray-50 group-hover:bg-purple-50 rounded-full flex items-center justify-center">
              <PlusCircle size={24} />
            </div>
            <span className="font-medium text-gray-700 group-hover:text-purple-700">
              إضافة منتج
            </span>
          </button>

          <button
            onClick={() => setActiveTab("offers")}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-gray-200 rounded-2xl hover:border-purple-500 hover:text-purple-600 transition-colors group"
          >
            <div className="w-12 h-12 bg-gray-50 group-hover:bg-purple-50 rounded-full flex items-center justify-center">
              <PlusCircle size={24} />
            </div>
            <span className="font-medium text-gray-700 group-hover:text-purple-700">إنشاء عرض</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-gray-200 rounded-2xl hover:border-purple-500 hover:text-purple-600 transition-colors group"
          >
            <div className="w-12 h-12 bg-gray-50 group-hover:bg-purple-50 rounded-full flex items-center justify-center">
              <FileText size={24} />
            </div>
            <span className="font-medium text-gray-700 group-hover:text-purple-700">
              تصفح الطلبات
            </span>
          </button>

          <button
            onClick={() => window.open(`/s/${store.slug}`, "_blank")}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-colors shadow-sm shadow-purple-200"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <ArrowLeft size={24} />
            </div>
            <span className="font-medium">زيارة المتجر</span>
          </button>
        </div>
      </div>
    </div>
  );
}
