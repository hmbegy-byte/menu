import React, { useState } from "react";
import { Plus, Edit2, Trash2, Image as ImageIcon, Upload, Download } from "lucide-react";
import ProductFormModal from "./ProductFormModal";
export default function ProductManager({
  store,
  products,
  setProducts,
  categories = [],
  adminData,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  const parseCsvLine = (line) => {
    const values = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) {
        values.push(value.trim());
        value = "";
      } else value += char;
    }
    values.push(value.trim());
    return values;
  };

  const importMenu = async (file) => {
    setImporting(true);
    setImportMessage("");
    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) throw new Error("الملف لا يحتوي على منتجات.");
      if (lines.length > 501) throw new Error("الحد الأقصى 500 منتج في كل عملية استيراد.");
      const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
      const rows = lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
      });
      const categoryMap = new Map(
        categories.map((category) => [String(category.name).trim().toLowerCase(), category]),
      );
      let imported = 0;
      for (const row of rows) {
        const name = row.name || row["الاسم"];
        const price = Number(row.price || row["السعر"]);
        const categoryName = row.category || row["التصنيف"] || "بدون تصنيف";
        if (!name || !Number.isFinite(price) || price < 0) continue;
        const categoryKey = categoryName.trim().toLowerCase();
        let category = categoryMap.get(categoryKey);
        if (!category) {
          category = await adminData.saveEntity("categories", {
            name: categoryName.trim(),
            description: "تم إنشاؤه من استيراد المنيو",
            display_order: categoryMap.size + 1,
            is_active: true,
          });
          categoryMap.set(categoryKey, category);
        }
        await adminData.saveEntity("products", {
          name: name.trim(),
          description: row.description || row["الوصف"] || "",
          price,
          category_id: category.id,
          image_url: row.image_url || row["رابط الصورة"] || null,
          is_available: !["false", "0", "لا"].includes(
            String(row.available || row["متاح"] || "true").toLowerCase(),
          ),
          options: [],
        });
        imported += 1;
      }
      await adminData.reload();
      setImportMessage(`تم استيراد ${imported} منتج بنجاح.`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "تعذر استيراد الملف.");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const content =
      "name,price,category,description,available,image_url\nبرجر لحم,28,البرجر,برجر لحم طازج,true,";
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "menu-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

    try {
      await adminData.deleteEntity("products", id);
    } catch {
      alert("تعذر حذف المنتج.");
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">إدارة المنتجات</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 font-bold text-gray-700"
          >
            <Download size={18} /> نموذج CSV
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white">
            <Upload size={18} /> {importing ? "جارٍ الاستيراد…" : "استيراد المنيو"}
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={importing}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importMenu(file);
                event.target.value = "";
              }}
            />
          </label>
          <button
            onClick={openAddModal}
            className="bg-purple-600 text-white font-bold py-2.5 px-5 rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة منتج جديد
          </button>
        </div>
      </div>

      {importMessage && (
        <p role="status" className="rounded-xl bg-purple-50 p-3 text-sm font-bold text-purple-700">
          {importMessage}
        </p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
              <tr>
                <th className="p-4 font-medium">المنتج</th>
                <th className="p-4 font-medium">التصنيف</th>
                <th className="p-4 font-medium">السعر</th>
                <th className="p-4 font-medium">الحالة</th>
                <th className="p-4 font-medium w-32">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">
                    لا توجد منتجات حالياً. أضف منتجك الأول!
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">
                      {categories.find((c) => c.id === product.category_id)?.name || "غير محدد"}
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      {product.price}{" "}
                      <span className="text-sm font-normal text-gray-500">{store.currency}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${product.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                      >
                        {product.is_available ? "متاح" : "غير متاح"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <ProductFormModal
          store={store}
          categories={categories}
          product={editingProduct}
          setProducts={setProducts}
          saveEntity={adminData.saveEntity}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
