import React, { useState } from "react";
import { X, Plus, Trash2, Upload } from "lucide-react";
import { uploadStoreImage } from "../../lib/uploadImage";

export default function ProductFormModal({
  store,
  product,
  setProducts,
  saveEntity,
  categories = [],
  onClose,
}) {
  const isEditing = !!product;

  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || "",
    category_id: product?.category_id || "",
    image_url: product?.image_url || "",
    is_available: product ? product.is_available : true,
    options: product?.options || [],
  });

  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // --- Options Builder Logic ---
  const addOptionGroup = () => {
    setFormData((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        { title: "", required: false, choices: [{ name: "", extra_price: 0 }] },
      ],
    }));
  };

  const removeOptionGroup = (index) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const updateOptionGroup = (index, field, value) => {
    const newOptions = [...formData.options];
    newOptions[index][field] = value;
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const addChoice = (groupIndex) => {
    const newOptions = [...formData.options];
    newOptions[groupIndex].choices.push({ name: "", extra_price: 0 });
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const removeChoice = (groupIndex, choiceIndex) => {
    const newOptions = [...formData.options];
    newOptions[groupIndex].choices = newOptions[groupIndex].choices.filter(
      (_, i) => i !== choiceIndex,
    );
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const updateChoice = (groupIndex, choiceIndex, field, value) => {
    const newOptions = [...formData.options];
    newOptions[groupIndex].choices[choiceIndex][field] = value;
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };
  // -----------------------------

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

      if (imageFile) finalImageUrl = await uploadStoreImage(imageFile, store.id, "products");

      const payload = {
        store_id: store.id,
        name: formData.name,
        category_id: formData.category_id,
        description: formData.description,
        price: parseFloat(formData.price),
        image_url: finalImageUrl,
        is_available: formData.is_available,
        options: formData.options,
      };

      await saveEntity(
        "products",
        isEditing
          ? { ...payload, image_url: finalImageUrl, id: product.id }
          : { ...payload, image_url: finalImageUrl },
      );

      onClose();
      // Simple fallback toast-like alert for success as requested
      setTimeout(() => alert("تم حفظ المنتج بنجاح"), 100);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? "تعديل المنتج" : "إضافة منتج جديد"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 bg-gray-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900 placeholder:text-slate-400 focus:text-slate-900 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  السعر ({store.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900 placeholder:text-slate-400 focus:text-slate-900 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 h-[112px] resize-none bg-white text-slate-900 placeholder:text-slate-400 focus:text-slate-900 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900 placeholder:text-slate-400 focus:text-slate-900 focus:bg-white"
                >
                  <option value="">-- اختر التصنيف --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 p-4 rounded-2xl bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-3">صورة المنتج</label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  placeholder="أو أدخل رابط الصورة هنا (URL)"
                  dir="ltr"
                  className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm mb-2 bg-white text-slate-900 placeholder:text-slate-400 focus:text-slate-900 focus:bg-white"
                />
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full bg-white border border-dashed border-gray-300 rounded-xl p-3 flex items-center justify-center gap-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    <Upload size={16} />
                    <span>{imageFile ? imageFile.name : "اختر ملف من جهازك..."}</span>
                  </div>
                </div>
              </div>
              {(formData.image_url || imageFile) && (
                <div className="w-20 h-20 rounded-xl bg-gray-200 shrink-0 overflow-hidden border border-gray-200">
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : formData.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                name="is_available"
                checked={formData.is_available}
                onChange={handleChange}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <div className="flex flex-col">
                <span className="font-medium text-gray-800">المنتج متاح للطلب</span>
              </div>
            </label>
          </div>

          {/* Options Builder */}
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">خيارات المنتج (إضافات، أحجام...)</h3>
              <button
                type="button"
                onClick={addOptionGroup}
                className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-purple-100 transition-colors"
              >
                <Plus size={16} /> إضافة مجموعة
              </button>
            </div>

            {formData.options.map((group, groupIdx) => (
              <div
                key={groupIdx}
                className="border border-gray-200 rounded-2xl p-4 bg-white relative"
              >
                <button
                  type="button"
                  onClick={() => removeOptionGroup(groupIdx)}
                  className="absolute top-4 left-4 text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={18} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      اسم المجموعة (مثال: طريقة الطهي)
                    </label>
                    <input
                      type="text"
                      value={group.title}
                      onChange={(e) => updateOptionGroup(groupIdx, "title", e.target.value)}
                      required
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:border-purple-500 bg-white text-slate-900 placeholder:text-slate-400 focus:text-slate-900 focus:bg-white"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(e) => updateOptionGroup(groupIdx, "required", e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="text-sm text-gray-700">هذا الخيار إجباري للعميل</span>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl space-y-2 border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-2">الاختيارات المتاحة:</p>
                  {group.choices.map((choice, choiceIdx) => (
                    <div key={choiceIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="الاسم (مثال: مشوي)"
                        value={choice.name}
                        onChange={(e) => updateChoice(groupIdx, choiceIdx, "name", e.target.value)}
                        required
                        className="flex-1 border border-slate-300 rounded-lg p-1.5 text-sm outline-none focus:border-purple-500 bg-white text-slate-900 placeholder:text-slate-400 focus:text-slate-900 focus:bg-white"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder={`السعر الإضافي (${store.currency})`}
                        value={choice.extra_price}
                        onChange={(e) =>
                          updateChoice(
                            groupIdx,
                            choiceIdx,
                            "extra_price",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-28 border border-slate-300 rounded-lg p-1.5 text-sm outline-none focus:border-purple-500 bg-white text-slate-900 placeholder:text-slate-400 focus:text-slate-900 focus:bg-white"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => removeChoice(groupIdx, choiceIdx)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addChoice(groupIdx)}
                    className="text-xs font-bold text-purple-600 mt-2 flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> إضافة خيار آخر
                  </button>
                </div>
              </div>
            ))}
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl shrink-0 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-purple-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-70"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ المنتج"}
          </button>
        </div>
      </div>
    </div>
  );
}
