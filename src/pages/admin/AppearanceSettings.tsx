import React, { useState } from "react";
import { Palette, Check, Store, Image as ImageIcon } from "lucide-react";

const colorOptions = [
  { id: "purple", name: "بنفسجي (افتراضي)", value: "#9333ea" },
  { id: "blue", name: "أزرق", value: "#2563eb" },
  { id: "green", name: "أخضر", value: "#16a34a" },
  { id: "orange", name: "برتقالي", value: "#ea580c" },
  { id: "red", name: "أحمر", value: "#dc2626" },
  { id: "teal", name: "تيل", value: "#0d9488" },
  { id: "pink", name: "وردي", value: "#db2777" },
  { id: "yellow", name: "أصفر", value: "#ca8a04" },
];

export default function AppearanceSettings({ adminData }) {
  const { appearance, store, updateStore, saveStoreSection } = adminData;
  const [formData, setFormData] = useState({
    primaryColor: appearance.primaryColor || "#9333ea",
    theme: appearance.theme || "light",
    logo_url: store?.logo_url || "",
    cover_url: store?.cover_url || "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const saveToLocal = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { logo_url, cover_url, ...appearanceData } = formData;
      await saveStoreSection("appearance", appearanceData);

      // Also persist logo/cover to the store
      if (updateStore) {
        await updateStore({ logo_url, cover_url });
      }

      // Update CSS variables on the document root so the admin panel also reflects it
      document.documentElement.style.setProperty("--color-primary", formData.primaryColor);

      alert("تم حفظ المظهر بنجاح");
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">المظهر والألوان</h2>
        <p className="text-gray-500 mt-1">تخصيص ألوان المتجر ليتناسب مع هويتك التجارية.</p>
      </div>

      <form
        onSubmit={saveToLocal}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8"
      >
        {/* Colors */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
            <Palette size={18} /> اللون الأساسي (Primary Color)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {colorOptions.map((color) => (
              <div
                key={color.id}
                onClick={() => setFormData({ ...formData, primaryColor: color.value })}
                className={`relative flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.primaryColor === color.value
                    ? "border-gray-900 shadow-md"
                    : "border-transparent hover:border-gray-300 bg-gray-50"
                }`}
                style={{
                  backgroundColor:
                    formData.primaryColor === color.value ? color.value + "10" : undefined,
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full shadow-inner flex items-center justify-center"
                    style={{ backgroundColor: color.value }}
                  >
                    {formData.primaryColor === color.value && (
                      <Check size={16} className="text-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{color.name}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              أو أدخل كود لون مخصص (HEX)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="w-10 h-10 rounded border-0 cursor-pointer p-0 bg-transparent"
              />
              <input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                dir="ltr"
                className="flex-1 max-w-[150px] border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Theme Settings (Light/Dark - Mocked for future) */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-4">
            الوضع الليلي (قريباً)
          </label>
          <div className="flex gap-4">
            <label
              className={`flex-1 border rounded-xl p-4 flex flex-col items-center cursor-pointer transition-all ${formData.theme === "light" ? "border-purple-600 bg-purple-50" : "border-gray-200 hover:bg-gray-50"}`}
            >
              <input
                type="radio"
                name="theme"
                value="light"
                checked={formData.theme === "light"}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                className="sr-only"
              />
              <span className="font-bold text-gray-900">فاتح</span>
            </label>

            <label
              className={`flex-1 border rounded-xl p-4 flex flex-col items-center cursor-pointer transition-all ${formData.theme === "dark" ? "border-purple-600 bg-purple-50" : "border-gray-200 hover:bg-gray-50"}`}
            >
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={formData.theme === "dark"}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                className="sr-only"
              />
              <span className="font-bold text-gray-900">داكن</span>
            </label>
          </div>
        </div>

        {/* Branding — Logo & Cover URLs */}
        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Store size={18} /> الهوية البصرية (Logo & Cover)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رابط الشعار (Logo URL)
              </label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                dir="ltr"
                placeholder="https://example.com/logo.png"
                className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              {formData.logo_url && (
                <div className="mt-2 w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50">
                  <img
                    src={formData.logo_url}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رابط صورة الغلاف (Cover URL)
              </label>
              <input
                type="url"
                value={formData.cover_url}
                onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                dir="ltr"
                placeholder="https://example.com/cover.jpg"
                className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              {formData.cover_url && (
                <div className="mt-2 h-28 w-full rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
                  <img
                    src={formData.cover_url}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end border-t border-gray-100">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-70"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </form>
    </div>
  );
}
