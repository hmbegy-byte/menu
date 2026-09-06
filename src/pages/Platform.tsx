import { useEffect, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import {
  Building2,
  CreditCard,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { usePlatformData } from "../hooks/usePlatformData";
import { hasPlatformAccess, signInPlatform, signOutStore } from "../lib/access";
import { PLAN_CATALOG, resolvePlan } from "../lib/plans";
import { isMockMode } from "../lib/supabase";

export default function Platform() {
  return (
    <ClientOnly fallback={<CenteredMessage>جارٍ تحميل لوحة المنصة…</CenteredMessage>}>
      <PlatformClient />
    </ClientOnly>
  );
}

function PlatformClient() {
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    let active = true;
    hasPlatformAccess().then((allowed) => {
      if (!active) return;
      setAuthorized(allowed);
      setChecked(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!checked) return <CenteredMessage>جارٍ التحقق من الصلاحية…</CenteredMessage>;

  if (!authorized) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-gray-50 p-4">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setLoginError("");
            try {
              await signInPlatform(form.email, form.password);
              setAuthorized(true);
            } catch (error) {
              setLoginError(error instanceof Error ? error.message : "تعذر الدخول");
            }
          }}
          className="w-full max-w-md rounded-3xl border bg-white p-7 shadow-sm"
        >
          <ShieldCheck className="mb-4 text-purple-600" size={38} />
          <h1 className="text-2xl font-bold">دخول مالك المنصة</h1>
          <p className="mt-1 text-gray-500">إدارة المطاعم والاشتراكات والميزات.</p>
          <label className="mt-6 block text-sm font-bold">
            البريد
            <input
              required
              type="email"
              dir="ltr"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="mt-1 w-full rounded-xl border p-3 font-normal"
            />
          </label>
          <label className="mt-3 block text-sm font-bold">
            كلمة المرور
            <input
              required
              type="password"
              dir="ltr"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="mt-1 w-full rounded-xl border p-3 font-normal"
            />
          </label>
          {loginError && (
            <p role="alert" className="mt-3 text-sm font-bold text-red-600">
              {loginError}
            </p>
          )}
          <button className="mt-5 w-full rounded-xl bg-purple-600 py-3 font-bold text-white">
            دخول لوحة المنصة
          </button>
          <p className="mt-4 text-xs text-gray-500">
            {isMockMode
              ? "تجريبي: owner@platform.local / 12345678"
              : "استخدم حساب مالك المنصة المسجل في Supabase."}
          </p>
        </form>
      </div>
    );
  }

  return (
    <PlatformDashboard
      onLogout={async () => {
        await signOutStore();
        setAuthorized(false);
      }}
    />
  );
}

function CenteredMessage({ children }) {
  return <div className="grid min-h-screen place-items-center bg-gray-50">{children}</div>;
}

function PlatformDashboard({ onLogout }) {
  const data = usePlatformData(true);
  if (data.loading) return <CenteredMessage>جارٍ تحميل المنصة…</CenteredMessage>;
  if (data.error) return <CenteredMessage>{data.error}</CenteredMessage>;

  const activeStores = data.stores.filter((store) => store.is_active).length;
  const monthlyRevenue = data.subscriptions
    .filter((item) => item.status === "active")
    .reduce((sum, item) => sum + resolvePlan(item.plans?.code || item.plan_id).monthlyPrice, 0);
  const stats = [
    { icon: Building2, label: "المؤسسات", value: data.organizations.length },
    { icon: Store, label: "الفروع النشطة", value: activeStores },
    { icon: Users, label: "إجمالي الفروع", value: data.stores.length },
    {
      icon: CreditCard,
      label: "الاشتراكات النشطة",
      value: data.subscriptions.filter((item) => item.status === "active").length,
    },
    { icon: CreditCard, label: "الإيراد الشهري المتوقع", value: `${monthlyRevenue} ر.س` },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-5">
          <div>
            <h1 className="text-xl font-bold">مركز إدارة المنصة</h1>
            <p className="text-sm text-gray-500">White‑Label Restaurant OS</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2"
          >
            <LogOut size={17} /> خروج
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        <div className="grid gap-4 md:grid-cols-5">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border bg-white p-5">
              <Icon className="mb-3 text-purple-600" />
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>
        <NewOrganizationForm data={data} />
        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-5">
            <h2 className="font-bold">المطاعم والعملاء</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-4">المطعم</th>
                  <th className="p-4">الفروع</th>
                  <th className="p-4">الباقة</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">إدارة</th>
                </tr>
              </thead>
              <tbody>
                {data.organizations.map((organization) => (
                  <OrganizationRow key={organization.id} organization={organization} data={data} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function NewOrganizationForm({ data }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    legal_name: "",
    owner_email: "",
    branch_name: "الفرع الرئيسي",
    slug: "",
    phone_whatsapp: "",
    plan_id: "starter",
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-purple-600 px-5 py-3 font-bold text-white"
      >
        إضافة مطعم جديد
      </button>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setMessage("");
        try {
          await data.createOrganization(form);
          setMessage("تم إنشاء المطعم والفرع والاشتراك ودعوة المالك.");
          setForm({
            name: "",
            legal_name: "",
            owner_email: "",
            branch_name: "الفرع الرئيسي",
            slug: "",
            phone_whatsapp: "",
            plan_id: "starter",
          });
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "تعذر إنشاء المطعم");
        }
      }}
      className="rounded-2xl border bg-white p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold">تهيئة مطعم جديد</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500">
          إغلاق
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <PlatformField
          label="اسم المطعم"
          value={form.name}
          onChange={(name) => setForm({ ...form, name })}
        />
        <PlatformField
          label="الاسم القانوني"
          value={form.legal_name}
          onChange={(legal_name) => setForm({ ...form, legal_name })}
        />
        <PlatformField
          label="بريد المالك"
          type="email"
          value={form.owner_email}
          onChange={(owner_email) => setForm({ ...form, owner_email })}
        />
        <PlatformField
          label="اسم الفرع"
          value={form.branch_name}
          onChange={(branch_name) => setForm({ ...form, branch_name })}
        />
        <PlatformField
          label="الرابط المختصر"
          dir="ltr"
          value={form.slug}
          onChange={(value) =>
            setForm({ ...form, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
          }
        />
        <PlatformField
          label="واتساب"
          dir="ltr"
          value={form.phone_whatsapp}
          onChange={(phone_whatsapp) => setForm({ ...form, phone_whatsapp })}
        />
        <label className="text-sm font-bold">
          الباقة
          <select
            value={form.plan_id}
            onChange={(event) => setForm({ ...form, plan_id: event.target.value })}
            className="mt-1 w-full rounded-xl border p-3 font-normal"
          >
            {Object.values(PLAN_CATALOG).map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm font-bold text-purple-700">
          {message}
        </p>
      )}
      <button className="mt-4 rounded-xl bg-purple-600 px-5 py-3 font-bold text-white">
        إنشاء الحساب
      </button>
    </form>
  );
}

function PlatformField({ label, value, onChange, type = "text", dir }) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        required
        type={type}
        dir={dir}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border p-3 font-normal"
      />
    </label>
  );
}

function OrganizationRow({ organization, data }) {
  const stores = data.stores.filter((store) => store.organization_id === organization.id);
  const subscription = data.subscriptions.find((item) => item.organization_id === organization.id);
  const plan = resolvePlan(subscription?.plans?.code || subscription?.plan_id);
  const active = stores.some((store) => store.is_active);
  return (
    <tr className="border-t">
      <td className="p-4">
        <p className="font-bold">{organization.name}</p>
        <p dir="ltr" className="text-xs text-gray-500">
          {organization.owner_email}
        </p>
      </td>
      <td className="p-4">{stores.length}</td>
      <td className="p-4">
        <select
          value={plan.id}
          onChange={(event) => data.changePlan(organization.id, event.target.value)}
          className="rounded-lg border p-2"
        >
          {Object.values(PLAN_CATALOG).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </td>
      <td className="p-4">
        <span
          className={`rounded-full px-2 py-1 text-xs font-bold ${active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
        >
          {active ? "نشط" : "متوقف"}
        </span>
      </td>
      <td className="p-4">
        <div className="flex flex-wrap gap-2">
          {stores.map((store) => (
            <div key={store.id} className="flex items-center gap-1">
              <a
                href={`/admin/${store.slug}`}
                className="rounded-lg bg-purple-50 p-2 text-purple-700"
                aria-label={`إدارة ${store.branch_name || store.name}`}
              >
                <ExternalLink size={16} />
              </a>
              <button
                onClick={() => data.toggleStore(store)}
                className="rounded-lg bg-gray-100 px-2 py-1 text-xs"
              >
                {store.is_active ? "إيقاف" : "تفعيل"}
              </button>
            </div>
          ))}
          <button
            onClick={() => data.issueInvoice(organization.id)}
            className="rounded-lg bg-green-50 px-2 py-1 text-xs font-bold text-green-700"
          >
            إصدار فاتورة
          </button>
        </div>
      </td>
    </tr>
  );
}
