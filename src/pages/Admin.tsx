import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAdminData } from "../hooks/useAdminData";
import {
  LayoutDashboard,
  Package,
  History,
  LogOut,
  FolderTree,
  Tag,
  PlusCircle,
  Store,
  Palette,
  Settings,
  CreditCard,
  QrCode,
  Building2,
  Users,
  Globe2,
  Crown,
  Truck,
  BarChart3,
  ContactRound,
  ReceiptText,
  Activity,
  DatabaseBackup,
  Gift,
  Megaphone,
  Workflow,
} from "lucide-react";

import StoreSettings from "./admin/StoreSettings";
import ProductManager from "./admin/ProductManager";
import OrderHistory from "./admin/OrderHistory";
import CategoryManager from "./admin/CategoryManager";
import OffersManager from "./admin/OffersManager";
import AddonsManager from "./admin/AddonsManager";
import RestaurantProfile from "./admin/RestaurantProfile";
import AppearanceSettings from "./admin/AppearanceSettings";
import GeneralSettings from "./admin/GeneralSettings";
import PaymentSettings from "./admin/PaymentSettings";
import QRCodeGenerator from "./admin/QRCodeGenerator";
import { ADMIN_FEATURES } from '../lib/adminFeatures';
import BranchManager from "./admin/BranchManager";
import TeamManager from "./admin/TeamManager";
import WhiteLabelSettings from "./admin/WhiteLabelSettings";
import SubscriptionSettings from "./admin/SubscriptionSettings";
import DeliverySettings from "./admin/DeliverySettings";
import ReportsDashboard from "./admin/ReportsDashboard";
import CustomersManager from "./admin/CustomersManager";
import BillingAddons from "./admin/BillingAddons";
import OperationalHealth from "./admin/OperationalHealth";
import DataTools from "./admin/DataTools";
import LoyaltySettings from "./admin/LoyaltySettings";
import CampaignManager from "./admin/CampaignManager";
import OperationsSuite from "./admin/OperationsSuite";
import RetentionManager from "./admin/RetentionManager";
import { signOutStore } from "../lib/access";

export default function Admin({ storeSlug }) {
  const navigate = useNavigate();
  const [activeTab, changeTab] = useState("overview");
  const setActiveTab = (tab: string) => {
    if (tab === activeTab || window.dispatchEvent(new Event('admin:leave', {cancelable:true}))) changeTab(tab);
  };

  const adminData = useAdminData(storeSlug);
  const { store, loading, error, updateStore } = adminData;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <p className="text-xl text-gray-700">
          {error === "AUTH_REQUIRED"
            ? "يجب تسجيل الدخول بحساب إدارة مصرح له"
            : error || "المتجر غير موجود"}
        </p>
        <button
          onClick={() => navigate({ to: "/admin" })}
          className="px-4 py-2 bg-purple-600 text-white rounded"
        >
          العودة
        </button>
      </div>
    );
  }

  const navItems = [
    { id: "overview", label: "الرئيسية", icon: LayoutDashboard },
    { id: "orders", label: "الطلبات", icon: History },
    { id: "delivery", label: "التوصيل والاستلام", icon: Truck },
    { id: "reports", label: "التقارير", icon: BarChart3 },
    { id: "campaigns", label: "روابط الحملات", icon: Megaphone },
    { id: "operations", label: "التشغيل المتقدم", icon: Workflow },
    { id: "customers", label: "العملاء", icon: ContactRound },
    { id: "retention", label: "الاحتفاظ والعملاء", icon: Users },
    { id: "categories", label: "التصنيفات", icon: FolderTree },
    { id: "products", label: "المنتجات", icon: Package },
    { id: "offers", label: "العروض والخصومات", icon: Tag },
    { id: "addons", label: "الإضافات السريعة", icon: PlusCircle },
    { id: "profile", label: "معلومات المطعم", icon: Store },
    { id: "appearance", label: "المظهر والتخصيص", icon: Palette },
    { id: "settings", label: "الإعدادات العامة", icon: Settings },
    { id: "payment", label: "إعدادات الدفع", icon: CreditCard },
    { id: "qrcode", label: "الكيو ار كود", icon: QrCode },
    { id: "branches", label: "الفروع", icon: Building2 },
    { id: "team", label: "الموظفون والصلاحيات", icon: Users },
    { id: "loyalty", label: "نظام الولاء", icon: Gift },
    { id: "white-label", label: "الهوية والنطاق", icon: Globe2 },
    { id: "subscription", label: "الباقة والاشتراك", icon: Crown },
    { id: "billing", label: "الفوترة والإضافات", icon: ReceiptText },
    { id: "health", label: "حالة التشغيل", icon: Activity },
    { id: "data", label: "البيانات والنسخ", icon: DatabaseBackup },
  ];

  return (
    <div className="admin-shell min-h-screen bg-background text-foreground flex flex-col md:flex-row" dir="rtl">
      <a href="#admin-content" className="skip-link">انتقل إلى المحتوى</a>
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 md:shrink-0 bg-card border-b md:border-b-0 md:border-l border-border flex flex-col md:sticky top-0 md:h-dvh z-20">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl text-gray-900">لوحة الإدارة</h1>
            <p className="text-sm text-gray-500 mt-1">{store.name}</p>
          </div>
          {/* Mobile menu toggle could go here if needed */}
        </div>

        <div className="px-4 pb-4 md:hidden">
          <label htmlFor="admin-section" className="mb-2 block text-sm font-bold">القسم الحالي</label>
          <select id="admin-section" value={activeTab} onChange={event=>setActiveTab(event.target.value)} className="w-full min-h-12 rounded-xl border border-input bg-background px-3 text-foreground">
            {navItems.filter(item=>!ADMIN_FEATURES[item.id]||adminData.features.includes(ADMIN_FEATURES[item.id])).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        <nav aria-label="أقسام إدارة المطعم" className="hidden md:flex flex-1 min-h-0 p-4 flex-col gap-2 overflow-y-auto">
          {navItems.filter(item => !ADMIN_FEATURES[item.id] || adminData.features.includes(ADMIN_FEATURES[item.id])).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={activeTab === item.id ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap ${
                  activeTab === item.id
                    ? "bg-purple-50 text-purple-700 font-bold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-2 md:p-4 border-t border-border">
          <a href={`/s/${encodeURIComponent(store.slug)}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl text-primary hover:bg-muted"><Store size={20} aria-hidden="true"/>معاينة المتجر<span className="sr-only">في نافذة جديدة</span></a>
          <button
            onClick={async () => {
              if (!window.dispatchEvent(new Event('admin:leave', {cancelable:true}))) return;
              await signOutStore();
              navigate({ to: "/admin" });
            }}
            className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl w-full transition-colors"
          >
            <LogOut size={20} />
            <span>خروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="admin-content" tabIndex={-1} className="flex-1 min-w-0 p-4 md:p-8">
        <div className="max-w-5xl mx-auto pb-20 md:pb-0">
          {ADMIN_FEATURES[activeTab] && !adminData.features.includes(ADMIN_FEATURES[activeTab]) ? <p className="rounded-xl border p-5">هذه الميزة غير متاحة في الباقة الحالية.</p> : <>
          {activeTab === "overview" && (
            <StoreSettings adminData={adminData} setActiveTab={setActiveTab} />
          )}
          {activeTab === "orders" && <OrderHistory store={store} orders={adminData.orders} />}
          {activeTab === "delivery" && <DeliverySettings adminData={adminData} />}
          {activeTab === "reports" && <ReportsDashboard adminData={adminData} />}
          {activeTab === "campaigns" && <CampaignManager adminData={adminData} />}
          {activeTab === "operations" && <OperationsSuite adminData={adminData} />}
          {activeTab === "customers" && <CustomersManager adminData={adminData} />}
          {activeTab === "retention" && <RetentionManager adminData={adminData} />}
          {activeTab === "categories" && <CategoryManager adminData={adminData} />}
          {activeTab === "products" && (
            <ProductManager
              store={store}
              products={adminData.products}
              setProducts={adminData.setProducts}
              categories={adminData.categories}
              adminData={adminData}
            />
          )}
          {activeTab === "offers" && <OffersManager adminData={adminData} />}
          {activeTab === "addons" && <AddonsManager adminData={adminData} />}
          {activeTab === "profile" && <RestaurantProfile adminData={adminData} />}
          {activeTab === "appearance" && <AppearanceSettings adminData={adminData} />}
          {activeTab === "settings" && <GeneralSettings adminData={adminData} />}
          {activeTab === "payment" && <PaymentSettings adminData={adminData} />}
          {activeTab === "qrcode" && <QRCodeGenerator store={store} />}
          {activeTab === "branches" && <BranchManager adminData={adminData} />}
          {activeTab === "team" && <TeamManager adminData={adminData} />}
          {activeTab === "loyalty" && <LoyaltySettings adminData={adminData} />}
          {activeTab === "white-label" && <WhiteLabelSettings adminData={adminData} />}
          {activeTab === "subscription" && <SubscriptionSettings adminData={adminData} />}
          {activeTab === "billing" && <BillingAddons adminData={adminData} />}
          {activeTab === "health" && <OperationalHealth adminData={adminData} />}
          {activeTab === "data" && <DataTools adminData={adminData} />}
          </>}
        </div>
      </main>
    </div>
  );
}
