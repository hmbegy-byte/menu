import React, { useState } from "react";
import { useUnsavedForm } from '../../hooks/useUnsavedForm';
import { Store, Phone, Upload, Image as ImageIcon, Landmark, ShieldCheck } from "lucide-react";
import { uploadStoreImage } from "../../lib/uploadImage";

export default function RestaurantProfile({ adminData }) {
  const { store, updateStore } = adminData;

  const [formData, setFormData] = useState({
    name: store.name || "",
    phone_whatsapp: store.phone_whatsapp || "",
    timezone: store.timezone || "Asia/Riyadh",
    bio: store.bio || "",
    logo_url: store.logo_url || "",
    cover_url: store.cover_url || "",
    social_links: store.social_links || { instagram: "", facebook: "", tiktok: "", map: "" },
    legal: store.legal || {
      country: "SA",
      legalName: "",
      commercialRegistration: "",
      vatNumber: "",
      nationalAddress: "",
      supportEmail: "",
      complaintPhone: "",
      privacyEmail: "",
    },
  });

  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const {markSaved}=useUnsavedForm({formData,logo:logoFile?.name,cover:coverFile?.name});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [name]: value },
    }));
  };

  const handleLegalChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, legal: { ...prev.legal, [name]: value } }));
  };

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleCoverChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates = { ...formData };

      if (logoFile) {
        updates.logo_url = await uploadStoreImage(logoFile, store.id, "branding");
      }
      if (coverFile) {
        updates.cover_url = await uploadStoreImage(coverFile, store.id, "branding");
      }

      await updateStore(updates);
      markSaved();
      alert("تم حفظ معلومات المطعم بنجاح");
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">معلومات المطعم</h2>
        <p className="text-gray-500 mt-1">
          قم بإعداد الهوية البصرية ومعلومات التواصل الخاصة بمتجرك.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
      >
        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            صورة الغلاف (Cover)
          </label>
          <div className="relative h-48 bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 group hover:bg-gray-50 transition-colors">
            {formData.cover_url || coverFile ? (
              <img
                src={coverFile ? URL.createObjectURL(coverFile) : formData.cover_url}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <ImageIcon size={32} className="mb-2" />
                <span className="text-sm">انقر لاختيار صورة الغلاف</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white font-medium flex items-center gap-2 bg-black/50 px-4 py-2 rounded-lg">
                <Upload size={18} /> تغيير الغلاف
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="mt-2">
            <label className="block text-xs text-gray-500 mb-1">أو الصق رابط الصورة (URL)</label>
            <input
              type="url"
              value={formData.cover_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, cover_url: e.target.value }))}
              dir="ltr"
              placeholder="https://example.com/cover.jpg"
              className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
        </div>

        {/* Logo Image */}
        <div className="flex gap-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              شعار المطعم (Logo)
            </label>
            <div className="relative w-32 h-32 bg-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 group hover:bg-gray-50 transition-colors">
              {formData.logo_url || logoFile ? (
                <img
                  src={logoFile ? URL.createObjectURL(logoFile) : formData.logo_url}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <Store size={24} className="mb-1" />
                  <span className="text-xs">اللوجو</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload size={20} className="text-white" />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
          <div className="flex-1 pb-2 space-y-2">
            <p className="text-sm text-gray-500">
              استخدم صورة واضحة بدقة 500x500 بيكسل على الأقل لضمان وضوح الشعار في كافة الأجهزة.
            </p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">أو الصق رابط الشعار (URL)</label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
                dir="ltr"
                placeholder="https://example.com/logo.png"
                className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Store size={16} /> اسم المطعم
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Phone size={16} /> رقم واتساب (لاستقبال الطلبات)
            </label>
            <input
              type="text"
              name="phone_whatsapp"
              value={formData.phone_whatsapp}
              onChange={handleChange}
              required
              dir="ltr"
              placeholder="+201234567890"
              className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المنطقة الزمنية</label>
          <select
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="Asia/Riyadh">السعودية — الرياض</option>
            <option value="Asia/Dubai">الإمارات — دبي</option>
            <option value="Africa/Cairo">مصر — القاهرة</option>
            <option value="Asia/Kuwait">الكويت</option>
            <option value="Asia/Qatar">قطر</option>
            <option value="Asia/Bahrain">البحرين</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">وصف مختصر (Bio)</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
            placeholder="مثال: أفضل مأكولات بحرية طازجة في المدينة..."
          />
        </div>

        <section className="space-y-4 border-t border-gray-100 pt-5">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-gray-900">
              <ShieldCheck size={19} className="text-purple-600" /> بيانات الامتثال السعودي
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              تظهر هذه البيانات للعميل في المستندات والفواتير عند اكتمال ربطها.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LegalInput
              label="الاسم القانوني للمنشأة"
              name="legalName"
              value={formData.legal.legalName}
              onChange={handleLegalChange}
              required
            />
            <LegalInput
              label="رقم السجل التجاري"
              name="commercialRegistration"
              value={formData.legal.commercialRegistration}
              onChange={handleLegalChange}
            />
            <LegalInput
              label="الرقم الضريبي"
              name="vatNumber"
              value={formData.legal.vatNumber}
              onChange={handleLegalChange}
              placeholder="15 رقمًا عند التسجيل في الضريبة"
            />
            <LegalInput
              label="البريد المخصص للدعم"
              name="supportEmail"
              value={formData.legal.supportEmail}
              onChange={handleLegalChange}
              type="email"
            />
            <LegalInput
              label="رقم الشكاوى"
              name="complaintPhone"
              value={formData.legal.complaintPhone}
              onChange={handleLegalChange}
              placeholder="+966..."
            />
            <LegalInput
              label="بريد طلبات الخصوصية"
              name="privacyEmail"
              value={formData.legal.privacyEmail}
              onChange={handleLegalChange}
              type="email"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
              <Landmark size={16} /> العنوان الوطني
            </label>
            <textarea
              name="nationalAddress"
              value={formData.legal.nationalAddress}
              onChange={handleLegalChange}
              className="h-20 w-full resize-none rounded-xl border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="العنوان المختصر أو العنوان الوطني للمنشأة"
            />
          </div>
          <p className="text-xs leading-5 text-amber-700">
            اترك الرقم الضريبي فارغًا إذا لم تكن المنشأة مسجلة في ضريبة القيمة المضافة، ولا تعرض
            رقمًا تجريبيًا للعملاء.
          </p>
        </section>

        {/* Social Links */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">روابط التواصل الاجتماعي</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رابط انستقرام</label>
              <input
                type="url"
                name="instagram"
                value={formData.social_links.instagram}
                onChange={handleSocialChange}
                dir="ltr"
                placeholder="https://instagram.com/..."
                className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رابط فيسبوك</label>
              <input
                type="url"
                name="facebook"
                value={formData.social_links.facebook}
                onChange={handleSocialChange}
                dir="ltr"
                placeholder="https://facebook.com/..."
                className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رابط تيك توك</label>
              <input
                type="url"
                name="tiktok"
                value={formData.social_links.tiktok}
                onChange={handleSocialChange}
                dir="ltr"
                placeholder="https://tiktok.com/..."
                className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رابط خرائط جوجل
              </label>
              <input
                type="url"
                name="map"
                value={formData.social_links.map}
                onChange={handleSocialChange}
                dir="ltr"
                placeholder="https://maps.google.com/..."
                className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-70"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </form>
    </div>
  );
}

function LegalInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        dir={type === "email" || name !== "legalName" ? "ltr" : "rtl"}
        className="w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
      />
    </div>
  );
}
