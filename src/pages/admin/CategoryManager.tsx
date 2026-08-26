import React, { useState } from "react";
import { Plus, Edit2, Trash2, GripVertical, Check, X } from "lucide-react";

export default function CategoryManager({ adminData }) {
  const { categories, saveEntity, deleteEntity } = adminData;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    display_order: 1,
    is_active: true,
  });

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ ...category });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        description: "",
        display_order: categories.length + 1,
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveEntity(
        "categories",
        editingCategory ? { ...formData, id: editingCategory.id } : formData,
      );
      setIsModalOpen(false);
    } catch {
      alert("تعذر حفظ التصنيف. تحقق من الاتصال وحاول مرة أخرى.");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("هل أنت متأكد من حذف هذا التصنيف؟")) {
      try {
        await deleteEntity("categories", id);
      } catch {
        alert("تعذر حذف التصنيف.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة التصنيفات</h2>
          <p className="text-gray-500 mt-1">قم بتنظيم قائمة الطعام عبر إضافة وتعديل التصنيفات.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-purple-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-purple-700 transition-colors"
        >
          <Plus size={20} />
          <span>تصنيف جديد</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-gray-500 font-medium text-sm">الترتيب</th>
              <th className="px-6 py-4 text-gray-500 font-medium text-sm">التصنيف</th>
              <th className="px-6 py-4 text-gray-500 font-medium text-sm">الحالة</th>
              <th className="px-6 py-4 text-gray-500 font-medium text-sm w-32">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((category) => (
                <tr key={category.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <GripVertical size={16} className="cursor-grab" />
                      <span className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-sm font-medium text-gray-600">
                        {category.display_order}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{category.name}</p>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    {category.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                        <Check size={14} /> نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                        <X size={14} /> غير نشط
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(category)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {categories.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                  لا توجد تصنيفات مضافة بعد.
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
                {editingCategory ? "تعديل التصنيف" : "تصنيف جديد"}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم التصنيف</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="مثال: وجبات رئيسية"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الوصف (اختياري)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 resize-none h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ترتيب العرض
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                    }
                    className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium text-gray-800">نشط</span>
                  </label>
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
                  className="flex-1 px-4 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors"
                >
                  حفظ التصنيف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
