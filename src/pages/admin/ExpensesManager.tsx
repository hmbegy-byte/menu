import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Download, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { formatCurrency } from "../../lib/currency";
import { expensesToCsv } from "../../lib/restaurantOperations.mjs";
import { isMockMode, supabase } from "../../lib/supabase";
import type { AdminViewData } from "../../lib/adminViewTypes";

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string;
  reporting_scope: "store_only" | "organization_shared";
};
type ExpenseForm = Omit<Expense, "id">;
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const emptyForm: ExpenseForm = {
  expense_date: today(),
  category: "مشتريات",
  amount: 0,
  description: "",
  reporting_scope: "store_only",
};
const localKey = (storeId: string) => `demo_expenses:${storeId}`;

export default function ExpensesManager({ adminData }: { adminData: AdminViewData }) {
  const [selectedStoreId, setSelectedStoreId] = useState(adminData.store.id);
  const [items, setItems] = useState<Expense[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [filters, setFilters] = useState({ from: "", to: "", category: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (isMockMode) {
      setItems(JSON.parse(localStorage.getItem(localKey(selectedStoreId)) || "[]"));
      return;
    }
    const { data, error: loadError } = await supabase
      .from("expenses")
      .select("*")
      .eq("store_id", selectedStoreId)
      .order("expense_date", { ascending: false });
    if (loadError) setError(loadError.message);
    else setItems((data || []) as Expense[]);
  }, [selectedStoreId]);
  useEffect(() => void load(), [load]);
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (!filters.from || item.expense_date >= filters.from) &&
          (!filters.to || item.expense_date <= filters.to) &&
          (!filters.category || item.category === filters.category),
      ),
    [items, filters],
  );
  const branchTotal = filtered
    .filter((item) => item.reporting_scope === "store_only")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const sharedTotal = filtered
    .filter((item) => item.reporting_scope === "organization_shared")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const persistMock = (next: Expense[]) => {
    localStorage.setItem(localKey(selectedStoreId), JSON.stringify(next));
    setItems(next);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!form.category.trim() || Number(form.amount) <= 0)
      return setError("أدخل تصنيفًا ومبلغًا أكبر من صفر");
    const payload = {
      ...form,
      category: form.category.trim(),
      description: form.description.trim(),
      amount: Number(form.amount),
      store_id: selectedStoreId,
    };
    try {
      if (isMockMode) {
        const saved = { ...payload, id: editingId || crypto.randomUUID() } as Expense;
        persistMock(
          editingId
            ? items.map((item) => (item.id === editingId ? saved : item))
            : [saved, ...items],
        );
      } else {
        const request = editingId
          ? supabase
              .from("expenses")
              .update(payload)
              .eq("id", editingId)
              .eq("store_id", selectedStoreId)
          : supabase.from("expenses").insert(payload);
        const { error: saveError } = await request;
        if (saveError) throw saveError;
        await load();
      }
      setForm(emptyForm);
      setEditingId("");
      setMessage("تم حفظ المصروف وتسجيل التغيير.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ المصروف");
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("حذف هذا المصروف؟ سيبقى الحذف موثقًا في سجل التدقيق.")) return;
    if (isMockMode) persistMock(items.filter((item) => item.id !== id));
    else {
      const { error: removeError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("store_id", selectedStoreId);
      if (removeError) return setError(removeError.message);
      await load();
    }
  };
  const download = () => {
    const blob = new Blob([expensesToCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `expenses-${today()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const branchOptions = [adminData.store, ...adminData.branches].filter(
    (branch, index, list) => list.findIndex((candidate) => candidate.id === branch.id) === index,
  );
  if (!adminData.settings.expensesEnabled)
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <ReceiptText className="mx-auto mb-3 text-primary" size={34} />
        <h2 className="text-2xl font-black">إدارة المصروفات غير مفعلة</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          فعّلها لهذا المطعم عندما تريد إدخال المصروفات وربطها بتقرير الربحية.
        </p>
        <button
          onClick={() =>
            void adminData
              .saveStoreSection("settings", { ...adminData.settings, expensesEnabled: true })
              .then(() => adminData.reload())
          }
          className="mt-5 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground"
        >
          تفعيل المصروفات
        </button>
      </div>
    );
  return (
    <div className="space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-2xl font-black">
          <ReceiptText className="text-primary" /> إدارة المصروفات
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          سجّل المصروف مرة واحدة وحدد نطاقه حتى لا يتكرر في تقرير الفرع.
        </p>
      </header>
      {branchOptions.length > 1 && (
        <label className="block max-w-md text-sm font-bold">
          الفرع
          <select
            value={selectedStoreId}
            onChange={(event) => setSelectedStoreId(event.target.value)}
            className="mt-1 w-full rounded-xl border bg-background p-3"
          >
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {("branch_name" in branch && branch.branch_name) || branch.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-2">
        <label className="text-sm font-bold">
          التاريخ
          <input
            type="date"
            required
            value={form.expense_date}
            onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            className="mt-1 w-full rounded-xl border bg-background p-3"
          />
        </label>
        <label className="text-sm font-bold">
          التصنيف
          <input
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="mt-1 w-full rounded-xl border bg-background p-3"
          />
        </label>
        <label className="text-sm font-bold">
          المبلغ
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            className="mt-1 w-full rounded-xl border bg-background p-3"
          />
        </label>
        <label className="text-sm font-bold">
          النطاق
          <select
            value={form.reporting_scope}
            onChange={(e) =>
              setForm({ ...form, reporting_scope: e.target.value as Expense["reporting_scope"] })
            }
            className="mt-1 w-full rounded-xl border bg-background p-3"
          >
            <option value="store_only">خاص بهذا الفرع — يدخل في نتيجته</option>
            <option value="organization_shared">مشترك — لا يوزّع تلقائيًا</option>
          </select>
        </label>
        <label className="text-sm font-bold md:col-span-2">
          الوصف
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 min-h-20 w-full rounded-xl border bg-background p-3"
          />
        </label>
        <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground md:col-span-2">
          <Plus size={18} />
          {editingId ? "حفظ التعديل" : "إضافة المصروف"}
        </button>
      </form>
      {(error || message) && (
        <p
          role={error ? "alert" : "status"}
          className={`rounded-xl p-3 ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {error || message}
        </p>
      )}
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            aria-label="من تاريخ"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="rounded-xl border bg-background p-3"
          />
          <input
            aria-label="إلى تاريخ"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="rounded-xl border bg-background p-3"
          />
          <select
            aria-label="التصنيف"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="rounded-xl border bg-background p-3"
          >
            <option value="">كل التصنيفات</option>
            {[...new Set(items.map((item) => item.category))].map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <button
            onClick={download}
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border p-3 font-bold"
          >
            <Download size={17} /> CSV
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-emerald-50 p-4">
            <p>مصروفات الفرع المحتسبة</p>
            <strong className="text-xl">
              {formatCurrency(branchTotal, adminData.store.currency)}
            </strong>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <p>مشتركة غير موزعة</p>
            <strong className="text-xl">
              {formatCurrency(sharedTotal, adminData.store.currency)}
            </strong>
          </div>
        </div>
        <div className="divide-y rounded-xl border">
          {filtered.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <strong>
                  {item.category} — {formatCurrency(Number(item.amount), adminData.store.currency)}
                </strong>
                <p className="text-sm text-muted-foreground">
                  {item.expense_date} ·{" "}
                  {item.reporting_scope === "store_only" ? "خاص بالفرع" : "مشترك غير موزع"}
                  {item.description ? ` · ${item.description}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  aria-label="تعديل المصروف"
                  onClick={() => {
                    setEditingId(item.id);
                    setForm({
                      expense_date: item.expense_date,
                      category: item.category,
                      amount: Number(item.amount),
                      description: item.description,
                      reporting_scope: item.reporting_scope,
                    });
                  }}
                  className="rounded-lg bg-blue-50 p-2 text-blue-700"
                >
                  <Pencil size={17} />
                </button>
                <button
                  aria-label="حذف المصروف"
                  onClick={() => void remove(item.id)}
                  className="rounded-lg bg-red-50 p-2 text-red-700"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="p-6 text-center text-muted-foreground">
              لا توجد مصروفات ضمن الفلاتر الحالية.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
