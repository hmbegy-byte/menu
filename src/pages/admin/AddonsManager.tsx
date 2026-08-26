import React, { useState } from "react";
import { Plus, Edit2, Trash2, Image as ImageIcon, Upload, X } from "lucide-react";
import { uploadStoreImage } from "../../lib/uploadImage";

export default function AddonsManager({ adminData }) {
  const { addons, saveEntity, deleteEntity, store } = adminData;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    price: "",
    image_url: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenModal = (addon = null) => {
    setImageFile(null);
    if (addon) {
      setEditingAddon(addon);
      setFormData({ ...addon });
    } else {
      setEditingAddon(null);
      setFormData({
        title: "",
        price: "",
        image_url: "",
      });
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
        finalImageUrl = await uploadStoreImage(imageFile, store.id, "addons");
      }

      const payload = {
        title: formData.title,
        price: parseFloat(formData.price) || 0,
        image_url: finalImageUrl,
      };

      await saveEntity("addons", editingAddon ? { ...payload, id: editingAddon.id } : payload);
      setIsModalOpen(false);
    } catch (err) {
      alert("حدث خطأ أثناء حفظ الإضافة.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("هل أنت متأكد من حذف هذه الإضافة؟")) {
      try {
        await deleteEntity("addons", id);
      } catch {
        alert("تعذر حذف الإضافة.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة الإضافات السريعة (Upsells)</h2>
          <p className="text-gray-500 mt-1">
            تظهر هذه الإضافات للعميل قبل إتمام الطلب لزيادة المبيعات (مثل: صوص، مشروب، مقبلات).
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-purple-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-purple-700 transition-colors"
        >
          <Plus size={20} />
          <span>إضافة جديدة</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-gray-500 font-medium text-sm">صورة</th>
              <th className="px-6 py-4 text-gray-500 font-medium text-sm">اسم الإضافة</th>
              <th className="px-6 py-4 text-gray-500 font-medium text-sm">السعر</th>
              <th className="px-6 py-4 text-gray-500 font-medium text-sm w-32">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {addons.map((addon) => (
              <tr key={addon.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                    {addon.image_url ? (
                      <img
                        src={addon.image_url}
                        alt={addon.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="text-gray-400" size={20} />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-900">{addon.title}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-purple-600">{addon.price} EGP</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(addon)}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(addon.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {addons.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                  لا توجد إضافات سريعة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">
                {editingAddon ? "تعديل الإضافة" : "إضافة جديدة"}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="مثال: مشروب غازي"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السعر (EGP)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  صورة مصغرة (اختياري)
                </label>
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full h-[60px] bg-white border border-dashed border-gray-300 rounded-xl p-2 flex items-center justify-center gap-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                      <Upload size={16} className="text-purple-500" />
                      <span className="truncate">{imageFile ? imageFile.name : "اختر صورة"}</span>
                    </div>
                  </div>
                  {(formData.image_url || imageFile) && (
                    <div className="w-[60px] h-[60px] rounded-xl bg-gray-200 overflow-hidden border border-gray-200 shrink-0">
                      <img
                        src={imageFile ? URL.createObjectURL(imageFile) : formData.image_url}
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
                  {isSaving ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
