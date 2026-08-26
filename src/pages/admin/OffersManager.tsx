import React, { useState } from "react";
import { Plus, Edit2, Trash2, Image as ImageIcon, Upload, X, Layers } from "lucide-react";
import { uploadStoreImage } from "../../lib/uploadImage";

export default function OffersManager({ adminData }) {
  const { offers, banners, saveEntity, deleteEntity, store } = adminData;

  // ─── Offers State ───
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    discount_percentage: 0,
    active: true,
    image_url: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // ─── Banner State ───
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [bannerForm, setBannerForm] = useState({
    image_url: "",
    title: "",
    subtitle: "",
  });
  const [bannerFile, setBannerFile] = useState(null);
  const [isBannerSaving, setIsBannerSaving] = useState(false);

  // ═══════════════════════════════════
  // OFFER OPERATIONS
  // ═══════════════════════════════════
  const handleOpenModal = (offer = null) => {
    setImageFile(null);
    if (offer) {
      setEditingOffer(offer);
      setFormData({ ...offer });
    } else {
      setEditingOffer(null);
      setFormData({ title: "", discount_percentage: 0, active: true, image_url: "" });
    }
    setIsModalOpen(true);
  };

  const handleImageFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalImageUrl = formData.image_url;
      if (imageFile) {
        finalImageUrl = await uploadStoreImage(imageFile, store.id, "offers");
      }
      await saveEntity(
        "offers",
        editingOffer
          ? { ...formData, image_url: finalImageUrl, id: editingOffer.id }
          : { ...formData, image_url: finalImageUrl },
      );
      setIsModalOpen(false);
    } catch (err) {
      alert("حدث خطأ أثناء حفظ العرض.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("هل أنت متأكد من حذف هذا العرض؟")) {
      try {
        await deleteEntity("offers", id);
      } catch {
        alert("تعذر حذف العرض.");
      }
    }
  };

  // ═══════════════════════════════════
  // BANNER OPERATIONS
  // ═══════════════════════════════════
  const handleOpenBannerModal = (banner = null) => {
    setBannerFile(null);
    if (banner) {
      setEditingBanner(banner);
      setBannerForm({
        image_url: banner.image_url || "",
        title: banner.title || "",
        subtitle: banner.subtitle || "",
      });
    } else {
      setEditingBanner(null);
      setBannerForm({ image_url: "", title: "", subtitle: "" });
    }
    setIsBannerModalOpen(true);
  };

  const handleBannerFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setBannerFile(e.target.files[0]);
    }
  };

  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    setIsBannerSaving(true);
    try {
      let finalImageUrl = bannerForm.image_url;
      if (bannerFile) {
        finalImageUrl = await uploadStoreImage(bannerFile, store.id, "banners");
      }
      await saveEntity(
        "banners",
        editingBanner
          ? { ...bannerForm, image_url: finalImageUrl, id: editingBanner.id, active: true }
          : {
              ...bannerForm,
              image_url: finalImageUrl,
              active: true,
              display_order: banners.length + 1,
            },
      );
      setIsBannerModalOpen(false);
    } catch (err) {
      alert("حدث خطأ أثناء حفظ اللافتة.");
    } finally {
      setIsBannerSaving(false);
    }
  };

  const handleDeleteBanner = async (id) => {
    if (confirm("هل أنت متأكد من حذف هذه اللافتة؟")) {
      try {
        await deleteEntity("banners", id);
      } catch {
        alert("تعذر حذف اللافتة.");
      }
    }
  };

  return (
    <div className="space-y-10">
      {/* ════════════════════════════════════════════ */}
      {/* BANNER MANAGER SECTION                      */}
      {/* ════════════════════════════════════════════ */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Layers size={24} className="text-purple-600" />
              لافتات العرض (Slideshow)
            </h2>
            <p className="text-gray-500 mt-1">تظهر هذه اللافتات في العرض المتحرك أعلى المتجر.</p>
          </div>
          <button
            onClick={() => handleOpenBannerModal()}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            <span>لافتة جديدة</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white border border-gray-100 rounded-2xl text-gray-500">
              لا توجد لافتات حالياً. أضف لافتة جديدة!
            </div>
          )}
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="h-36 bg-gray-100 relative">
                {banner.image_url ? (
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon size={32} />
                    <span className="text-sm mt-2">لا توجد صورة</span>
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 text-lg mb-1">
                  {banner.title || "بدون عنوان"}
                </h3>
                <p className="text-gray-500 text-sm mb-4">{banner.subtitle || "بدون نص"}</p>
                <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenBannerModal(banner)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm px-3 py-1.5 bg-blue-50 rounded-lg"
                  >
                    <Edit2 size={16} /> تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-sm px-3 py-1.5 bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} /> حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* ════════════════════════════════════════════ */}
      {/* OFFERS (DISCOUNTS) SECTION                  */}
      {/* ════════════════════════════════════════════ */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">إدارة العروض والخصومات</h2>
            <p className="text-gray-500 mt-1">قم بإضافة عروض الخصومات الخاصة بالمتجر.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            <span>عرض جديد</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white border border-gray-100 rounded-2xl text-gray-500">
              لا توجد عروض حالياً. أضف عرضاً جديداً!
            </div>
          )}
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="h-40 bg-gray-100 relative">
                {offer.image_url ? (
                  <img
                    src={offer.image_url}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon size={32} />
                    <span className="text-sm mt-2">لا توجد صورة</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  {offer.active ? (
                    <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded shadow-sm">
                      نشط
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded shadow-sm">
                      متوقف
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 text-lg mb-1">{offer.title}</h3>
                <p className="text-purple-600 font-bold mb-4">خصم {offer.discount_percentage}%</p>

                <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenModal(offer)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm px-3 py-1.5 bg-blue-50 rounded-lg"
                  >
                    <Edit2 size={16} /> تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(offer.id)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-sm px-3 py-1.5 bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} /> حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* OFFER MODAL                                 */}
      {/* ════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">
                {editingOffer ? "تعديل العرض" : "عرض جديد"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان العرض</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="مثال: عرض الغداء"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نسبة الخصم (%)
                </label>
                <input
                  type="number"
                  value={formData.discount_percentage}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_percentage: parseInt(e.target.value) || 0 })
                  }
                  required
                  className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="border border-gray-200 p-4 rounded-xl bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  صورة لافتة العرض (Banner)
                </label>
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full bg-white border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                      <Upload size={20} className="text-purple-500" />
                      <span>{imageFile ? imageFile.name : "انقر لاختيار صورة..."}</span>
                    </div>
                  </div>
                  {(formData.image_url || imageFile) && (
                    <div className="w-full h-32 rounded-xl bg-gray-200 overflow-hidden border border-gray-200">
                      <img
                        src={imageFile ? URL.createObjectURL(imageFile) : formData.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="font-medium text-gray-800">العرض نشط ويظهر للعملاء</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-70"
                >
                  {isSaving ? "جاري الحفظ..." : "حفظ العرض"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* BANNER MODAL                                */}
      {/* ════════════════════════════════════════════ */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">
                {editingBanner ? "تعديل اللافتة" : "لافتة جديدة"}
              </h3>
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleBannerSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  عنوان اللافتة
                </label>
                <input
                  type="text"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="مثال: عرض الجمعة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نص العرض (يظهر أسفل العنوان)
                </label>
                <input
                  type="text"
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="مثال: خصم ٢٥٪ على كل المشويات"
                />
              </div>

              <div className="border border-gray-200 p-4 rounded-xl bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-3">صورة اللافتة</label>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">رابط الصورة (URL)</label>
                    <input
                      type="url"
                      value={bannerForm.image_url}
                      onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
                      dir="ltr"
                      className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="text-center text-xs text-gray-400">— أو —</div>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full bg-white border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                      <Upload size={20} className="text-purple-500" />
                      <span>{bannerFile ? bannerFile.name : "انقر لاختيار صورة..."}</span>
                    </div>
                  </div>
                  {(bannerForm.image_url || bannerFile) && (
                    <div className="w-full h-32 rounded-xl bg-gray-200 overflow-hidden border border-gray-200">
                      <img
                        src={bannerFile ? URL.createObjectURL(bannerFile) : bannerForm.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isBannerSaving}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-70"
                >
                  {isBannerSaving ? "جاري الحفظ..." : "حفظ اللافتة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
