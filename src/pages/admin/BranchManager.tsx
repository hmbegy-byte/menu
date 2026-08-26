import { useState } from "react";
import { Building2, ExternalLink, Plus, Trash2 } from "lucide-react";

const emptyBranch = { branch_name: "", slug: "", phone_whatsapp: "", is_active: true };

export default function BranchManager({ adminData }) {
  const { branches, saveBranch, deleteBranch, plan } = adminData;
  const [form, setForm] = useState(emptyBranch);
  const [message, setMessage] = useState("");
  const limit = plan.limits.branches;
  const canAdd = branches.length < limit;

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await saveBranch({ ...form, name: adminData.store.name });
      setForm(emptyBranch);
      setMessage("تم إنشاء الفرع وربطه بالمؤسسة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الفرع");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">الفروع</h2>
        <p className="mt-1 text-gray-500">كل فرع يملك رابط طلبات وكيتشن وإعدادات تشغيل مستقلة.</p>
      </div>
      <div className="rounded-2xl border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold">فروع المؤسسة</h3>
          <span className="text-sm text-gray-500">
            {branches.length} من {limit}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {branches.map((branch) => (
            <div key={branch.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-3">
                  <Building2 className="text-purple-600" />
                  <div>
                    <p className="font-bold">{branch.branch_name || branch.name}</p>
                    <p className="text-sm text-gray-500">/s/{branch.slug}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${branch.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                >
                  {branch.is_active ? "نشط" : "متوقف"}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <a
                  href={`/s/${branch.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm"
                >
                  <ExternalLink size={15} /> فتح
                </a>
                {branch.id !== adminData.store.id && (
                  <button
                    onClick={() => deleteBranch(branch.id)}
                    className="rounded-lg bg-red-50 p-2 text-red-600"
                    aria-label={`حذف ${branch.branch_name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={submit} className="rounded-2xl border bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 font-bold">
          <Plus size={18} /> إضافة فرع
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-bold">
            اسم الفرع
            <input
              required
              disabled={!canAdd}
              value={form.branch_name}
              onChange={(e) => setForm({ ...form, branch_name: e.target.value })}
              className="mt-1 w-full rounded-xl border p-3 font-normal"
            />
          </label>
          <label className="text-sm font-bold">
            الرابط المختصر
            <input
              required
              disabled={!canAdd}
              dir="ltr"
              value={form.slug}
              onChange={(e) =>
                setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
              }
              className="mt-1 w-full rounded-xl border p-3 font-normal"
            />
          </label>
          <label className="text-sm font-bold">
            واتساب
            <input
              required
              disabled={!canAdd}
              dir="ltr"
              value={form.phone_whatsapp}
              onChange={(e) => setForm({ ...form, phone_whatsapp: e.target.value })}
              className="mt-1 w-full rounded-xl border p-3 font-normal"
            />
          </label>
        </div>
        {!canAdd && (
          <p className="mt-3 text-sm text-amber-700">وصلت إلى حد الفروع في باقتك الحالية.</p>
        )}
        {message && (
          <p role="status" className="mt-3 text-sm font-bold text-purple-700">
            {message}
          </p>
        )}
        <button
          disabled={!canAdd}
          className="mt-4 rounded-xl bg-purple-600 px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          إنشاء الفرع
        </button>
      </form>
    </div>
  );
}
