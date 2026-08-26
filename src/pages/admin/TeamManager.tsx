import { useState } from "react";
import { MailPlus, Trash2, Users } from "lucide-react";

const roleNames = {
  admin: "مدير",
  manager: "مشرف",
  cashier: "كاشير",
  kitchen: "مطبخ",
  accountant: "محاسب",
};

export default function TeamManager({ adminData }) {
  const [form, setForm] = useState({ email: "", role: "kitchen", store_id: adminData.store.id });
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    try {
      await adminData.inviteTeamMember(form);
      setForm({ ...form, email: "" });
      setMessage("تم إنشاء الدعوة. اربط إرسال البريد بمزود الرسائل عند الإطلاق.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إنشاء الدعوة");
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Users /> الموظفون والصلاحيات
        </h2>
        <p className="mt-1 text-gray-500">امنح كل موظف أقل صلاحية يحتاجها وحدد فرعه.</p>
      </div>
      <form onSubmit={submit} className="rounded-2xl border bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 font-bold">
          <MailPlus size={18} /> دعوة موظف
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-bold">
            البريد
            <input
              required
              type="email"
              dir="ltr"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-xl border p-3 font-normal"
            />
          </label>
          <label className="text-sm font-bold">
            الدور
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="mt-1 w-full rounded-xl border p-3 font-normal"
            >
              {Object.entries(roleNames).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            الفرع
            <select
              value={form.store_id}
              onChange={(e) => setForm({ ...form, store_id: e.target.value })}
              className="mt-1 w-full rounded-xl border p-3 font-normal"
            >
              {adminData.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name || branch.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {message && (
          <p role="status" className="mt-3 text-sm text-purple-700">
            {message}
          </p>
        )}
        <button className="mt-4 rounded-xl bg-purple-600 px-5 py-3 font-bold text-white">
          إرسال الدعوة
        </button>
      </form>
      <div className="overflow-hidden rounded-2xl border bg-white">
        {adminData.team.length === 0 ? (
          <p className="p-8 text-center text-gray-500">لا توجد دعوات أو أعضاء بعد.</p>
        ) : (
          adminData.team.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b p-4 last:border-0"
            >
              <div>
                <p className="font-bold" dir="ltr">
                  {member.email || member.user_id}
                </p>
                <p className="text-sm text-gray-500">
                  {roleNames[member.role] || member.role} ·{" "}
                  {member.status === "pending" ? "بانتظار القبول" : "نشط"}
                </p>
              </div>
              {member.status === "pending" && (
                <button
                  onClick={() => adminData.removeTeamInvitation(member.id)}
                  className="rounded-lg bg-red-50 p-2 text-red-600"
                  aria-label="حذف الدعوة"
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
