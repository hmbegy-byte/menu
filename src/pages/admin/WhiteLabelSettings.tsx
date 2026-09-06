import { useEffect, useState } from "react";
import { Globe2, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function WhiteLabelSettings({ adminData }) {
  const [form, setForm] = useState({
    custom_domain: adminData.store.custom_domain || "",
    hidePlatformBrand: adminData.store.white_label?.hidePlatformBrand || false,
    supportEmail: adminData.store.white_label?.supportEmail || "",
    supportPhone: adminData.store.white_label?.supportPhone || "",
  });
  const [message, setMessage] = useState("");
  const [brand, setBrand] = useState({ brand_name: adminData.store.name || "", favicon_url: "", meta_title: "", meta_description: "", og_image_url: "", theme_color: "#7e22ce", pwa_short_name: "" });
  useEffect(() => {
    supabase.from("brand_assets").select("*").eq("store_id", adminData.store.id).maybeSingle().then(({ data }) => {
      if (data) setBrand((current) => ({ ...current, ...data }));
    });
  }, [adminData.store.id]);
  const canUseDomain = adminData.features.includes("custom_domain");
  const canWhiteLabel = adminData.features.includes("white_label");
  const save = async (event) => {
    event.preventDefault();
    await adminData.updateStore({
      custom_domain: form.custom_domain.trim().toLowerCase(),
      white_label: {
        hidePlatformBrand: form.hidePlatformBrand,
        supportEmail: form.supportEmail,
        supportPhone: form.supportPhone,
      },
    });
    const { error: brandError } = await supabase.from("brand_assets").upsert({
      store_id: adminData.store.id,
      organization_id: adminData.organization.id,
      ...brand,
      is_platform_default: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "store_id" });
    if (brandError) {
      setMessage("تعذر حفظ صور الهوية: " + brandError.message);
      return;
    }
    setMessage("تم حفظ إعدادات الهوية والنطاق.");
  };
  return (
    <form onSubmit={save} className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Globe2 /> الهوية والنطاق
        </h2>
        <p className="mt-1 text-gray-500">اجعل تجربة العميل تحمل اسم المطعم فقط.</p>
      </div>
      <section className="rounded-2xl border bg-white p-5">
        <h3 className="mb-4 font-bold">النطاق الخاص</h3>
        <label className="text-sm font-bold">
          اسم النطاق
          <input
            disabled={!canUseDomain}
            dir="ltr"
            placeholder="order.restaurant.com"
            value={form.custom_domain}
            onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
            className="mt-1 w-full rounded-xl border p-3 font-normal disabled:bg-gray-100"
          />
        </label>
        {!canUseDomain && (
          <p className="mt-2 text-sm text-amber-700">النطاق الخاص متاح في الباقة الاحترافية.</p>
        )}
        {form.custom_domain && canUseDomain && (
          <p className="mt-3 flex items-center gap-2 text-sm text-green-700">
            <ShieldCheck size={17} /> بعد ربط DNS ستتم المراجعة وإصدار SSL تلقائيًا.
          </p>
        )}
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <h3 className="mb-1 font-bold">هوية المتصفح والمشاركة</h3>
        <p className="mb-4 text-sm text-gray-500">غيّر الاسم والأيقونة وصورة الرابط التي يراها العميل بدل هوية المنصة.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">اسم العلامة<input value={brand.brand_name} onChange={(e) => setBrand({...brand, brand_name:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
          <label className="text-sm font-bold">عنوان صفحة المتصفح<input value={brand.meta_title} onChange={(e) => setBrand({...brand, meta_title:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
          <label className="text-sm font-bold">رابط أيقونة المتصفح<input dir="ltr" type="url" placeholder="https://.../favicon.png" value={brand.favicon_url} onChange={(e) => setBrand({...brand, favicon_url:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
          <label className="text-sm font-bold">رابط صورة المشاركة<input dir="ltr" type="url" placeholder="https://.../share.jpg" value={brand.og_image_url} onChange={(e) => setBrand({...brand, og_image_url:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
          <label className="text-sm font-bold">لون المتصفح<input type="color" value={brand.theme_color} onChange={(e) => setBrand({...brand, theme_color:e.target.value})} className="mt-1 h-12 w-full rounded-xl border p-1" /></label>
          <label className="text-sm font-bold">الاسم المختصر للتطبيق<input value={brand.pwa_short_name} onChange={(e) => setBrand({...brand, pwa_short_name:e.target.value})} maxLength={12} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
          <label className="text-sm font-bold md:col-span-2">وصف الصفحة<textarea value={brand.meta_description} onChange={(e) => setBrand({...brand, meta_description:e.target.value})} className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal" /></label>
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <h3 className="mb-4 font-bold">الدعم باسم المطعم</h3>
        <label className="mb-4 flex items-center gap-3 rounded-xl border p-3">
          <input
            disabled={!canWhiteLabel}
            type="checkbox"
            checked={form.hidePlatformBrand}
            onChange={(e) => setForm({ ...form, hidePlatformBrand: e.target.checked })}
          />{" "}
          إخفاء اسم المنصة من متجر العميل
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-bold">
            بريد الدعم
            <input
              disabled={!canWhiteLabel}
              type="email"
              dir="ltr"
              value={form.supportEmail}
              onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
              className="mt-1 w-full rounded-xl border p-3 font-normal disabled:bg-gray-100"
            />
          </label>
          <label className="text-sm font-bold">
            هاتف الدعم
            <input
              disabled={!canWhiteLabel}
              dir="ltr"
              value={form.supportPhone}
              onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
              className="mt-1 w-full rounded-xl border p-3 font-normal disabled:bg-gray-100"
            />
          </label>
        </div>
        {!canWhiteLabel && (
          <p className="mt-3 text-sm text-amber-700">
            إخفاء هوية المنصة متاح في الباقة الاحترافية.
          </p>
        )}
      </section>
      {message && (
        <p role="status" className="font-bold text-green-700">
          {message}
        </p>
      )}
      <button className="rounded-xl bg-purple-600 px-5 py-3 font-bold text-white">
        حفظ الإعدادات
      </button>
    </form>
  );
}
