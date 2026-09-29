import { useEffect, useState, type FormEvent } from "react";
import { Building2, Save } from "lucide-react";
import type { PublicBrand } from "../lib/platformBrand";

const emptyBrand: PublicBrand = {
  brand_name: "Flavor Flow",
  legal_name: "",
  logo_url: "",
  favicon_url: "",
  meta_title: "",
  meta_description: "",
  og_image_url: "",
  theme_color: "#2563eb",
  pwa_short_name: "",
  support_email: "",
  support_phone: "",
};

export default function PlatformBrandSettings({
  value,
  onSave,
}: {
  value?: PublicBrand | null;
  onSave: (brand: PublicBrand) => Promise<unknown>;
}) {
  const [form, setForm] = useState<PublicBrand>({ ...emptyBrand, ...value });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm({ ...emptyBrand, ...value }), [value]);

  const field = (key: keyof PublicBrand, label: string, type = "text") => (
    <label className="text-sm font-bold">
      {label}
      <input
        type={type}
        dir={type === "url" || type === "email" || key === "support_phone" ? "ltr" : undefined}
        value={form[key] || ""}
        onChange={(event) => setForm({ ...form, [key]: event.target.value })}
        className="mt-1 w-full rounded-xl border p-3 font-normal"
      />
    </label>
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      await onSave(form);
      setStatus("تم حفظ هوية المؤسسة وتسجيل التغيير.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر حفظ الهوية");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Building2 /> هوية المؤسسة
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            تظهر في صفحات المنصة فقط؛ ولا تستبدل هوية المطاعم المخصصة.
          </p>
        </div>
        <div className="max-w-48 rounded-xl border p-3 text-center">
          {form.logo_url && (
            <img
              src={form.logo_url}
              alt="معاينة الشعار"
              className="mx-auto mb-2 h-10 max-w-32 object-contain"
            />
          )}
          <strong>{form.brand_name || "اسم المنصة"}</strong>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {field("brand_name", "الاسم التجاري")}
        {field("legal_name", "الاسم القانوني")}
        {field("pwa_short_name", "اسم التطبيق المختصر")}
        {field("logo_url", "رابط الشعار", "url")}
        {field("favicon_url", "رابط أيقونة المتصفح", "url")}
        {field("og_image_url", "صورة مشاركة الرابط", "url")}
        {field("meta_title", "عنوان الصفحة")}
        {field("support_email", "بريد الدعم", "email")}
        {field("support_phone", "رقم التواصل")}
        <label className="text-sm font-bold">
          لون المتصفح
          <input
            type="color"
            value={form.theme_color || "#2563eb"}
            onChange={(event) => setForm({ ...form, theme_color: event.target.value })}
            className="mt-1 h-12 w-full rounded-xl border p-1"
          />
        </label>
        <label className="text-sm font-bold md:col-span-2">
          وصف الصفحة
          <textarea
            value={form.meta_description || ""}
            onChange={(event) => setForm({ ...form, meta_description: event.target.value })}
            className="mt-1 min-h-20 w-full rounded-xl border p-3 font-normal"
          />
        </label>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        تغيير الاسم لا يغيّر نطاق Render أو يشتري نطاقًا جديدًا.
      </p>
      {status && (
        <p role="status" className="mt-3 text-sm font-bold">
          {status}
        </p>
      )}
      <button
        disabled={saving}
        className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-60"
      >
        <Save size={17} />
        {saving ? "جارٍ الحفظ…" : "حفظ هوية المؤسسة"}
      </button>
    </form>
  );
}
