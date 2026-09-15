import { useCallback, useEffect, useState, type FormEvent } from "react";
import { isMockMode, supabase } from "../lib/supabase";
import { readDemoData, writeDemo } from "../lib/storeDefaults";
import { Button } from "./ui/button";
const initial = {
  id: "",
  rule_type: "points_per_currency",
  currency_type: "points",
  reward_value: 1,
  min_amount: 0,
  product_id: "",
  title: "",
  points_cost: 100,
  stamps_cost: 0,
  valid_until: "",
};
type LoyaltyRow = Partial<Omit<typeof initial, "valid_until">> & {
  id: string;
  organization_id?: string;
  is_active: boolean;
  reward_type?: string;
  valid_until?: string | null;
  conditions?: { title?: string; product_id?: string };
};
export default function LoyaltyRulesEditor({
  organizationId,
  products = [],
}: {
  organizationId: string;
  products?: Array<{ id: string; name: string }>;
}) {
  const [kind, setKind] = useState("loyalty_earning_rules");
  const [rules, setRules] = useState<LoyaltyRow[]>([]);
  const [rewards, setRewards] = useState<LoyaltyRow[]>([]);
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (isMockMode) {
      const demo = readDemoData();
      setRules(demo.loyaltyRules);
      setRewards(demo.loyaltyRewards);
      return;
    }
    const [a, b] = await Promise.all([
      supabase.from("loyalty_earning_rules").select("*").eq("organization_id", organizationId),
      supabase.from("loyalty_rewards").select("*").eq("organization_id", organizationId),
    ]);
    if (a.error || b.error) setMessage("تعذر تحميل القواعد والمكافآت");
    else {
      setRules(a.data || []);
      setRewards(b.data || []);
    }
  }, [organizationId]);
  useEffect(() => {
    void load();
  }, [load]);
  const field = <K extends keyof typeof initial>(key: K, value: (typeof initial)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const isRule = kind === "loyalty_earning_rules";
      if (!isRule && form.points_cost <= 0 && form.stamps_cost <= 0)
        throw new Error("حدد تكلفة المكافأة بالنقاط أو الأختام");
      const row = isRule
        ? {
            rule_type: form.rule_type,
            currency_type: form.currency_type,
            reward_value: form.reward_value,
            min_amount: form.min_amount,
            conditions: { product_id: form.product_id, title: form.title },
            valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
          }
        : {
            reward_type: "free_item",
            reward_value: 1,
            points_cost: form.points_cost,
            stamps_cost: form.stamps_cost,
            conditions: { title: form.title, product_id: form.product_id },
            valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
          };
      if (isMockMode) {
        const key = isRule ? "loyaltyRules" : "loyaltyRewards";
        const current = isRule ? rules : rewards;
        const saved = {
          ...row,
          id: form.id || `demo-${isRule ? "rule" : "reward"}-${Date.now()}`,
          organization_id: organizationId,
          is_active: true,
        } as LoyaltyRow;
        const next = current.some((item) => item.id === saved.id)
          ? current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item))
          : [saved, ...current];
        writeDemo(key, next);
        await load();
        setForm(initial);
        setMessage("تم الحفظ");
        return;
      }
      const result = form.id
        ? await supabase
            .from(kind)
            .update(row)
            .eq("id", form.id)
            .eq("organization_id", organizationId)
        : await supabase
            .from(kind)
            .insert({ ...row, organization_id: organizationId, is_active: true });
      if (result.error) throw new Error("تعذر الحفظ. تحقق من الصلاحيات والحقول");
      await load();
      setForm(initial);
      setMessage("تم الحفظ");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (table: string, row: LoyaltyRow) => {
    setBusy(true);
    if (isMockMode) {
      const isRule = table === "loyalty_earning_rules";
      const key = isRule ? "loyaltyRules" : "loyaltyRewards";
      const current = isRule ? rules : rewards;
      writeDemo(
        key,
        current.map((item) =>
          item.id === row.id ? { ...item, is_active: !item.is_active } : item,
        ),
      );
      await load();
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from(table)
      .update({ is_active: !row.is_active })
      .eq("id", row.id)
      .eq("organization_id", organizationId);
    if (error) setMessage("تعذر تحديث الحالة");
    else await load();
    setBusy(false);
  };
  return (
    <section className="rounded-xl border p-5 space-y-4">
      <h3 className="text-xl font-bold">قواعد الكسب والمكافآت</h3>
      <p>
        يُضاف الرصيد عند اكتمال الطلب لعميل مسجل بنفس الجوال. القواعد النشطة تُجمع معًا؛ حد الطلب
        يُحسب على الإجمالي. الختم لكل طلب لا يعني ختمًا لكل زيارة فعلية.
      </p>
      <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
        <label>
          نوع الإعداد
          <select
            className="block border rounded-lg p-3 w-full"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setForm(initial);
            }}
          >
            <option value="loyalty_earning_rules">قاعدة كسب</option>
            <option value="loyalty_rewards">مكافأة صنف مجاني لدى المطعم</option>
          </select>
        </label>
        <label>
          الاسم الظاهر للعميل
          <input
            required
            className="block border rounded-lg p-3 w-full"
            value={form.title}
            onChange={(e) => field("title", e.target.value)}
          />
        </label>
        {kind === "loyalty_earning_rules" ? (
          <>
            <label>
              طريقة الكسب
              <select
                className="block border rounded-lg p-3 w-full"
                value={form.rule_type}
                onChange={(e) => field("rule_type", e.target.value)}
              >
                <option value="points_per_currency">لكل ريال مدفوع</option>
                <option value="fixed_per_order">مقدار ثابت لكل طلب مكتمل</option>
                <option value="stamps_for_items">لكل وحدة من صنف محدد</option>
              </select>
            </label>
            <label>
              نوع الرصيد
              <select
                className="block border rounded-lg p-3 w-full"
                value={form.currency_type}
                onChange={(e) => field("currency_type", e.target.value)}
              >
                <option value="points">نقاط</option>
                <option value="stamps">أختام</option>
              </select>
            </label>
            <label>
              الرصيد المكتسب
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                className="block border rounded-lg p-3 w-full"
                value={form.reward_value}
                onChange={(e) => field("reward_value", Number(e.target.value))}
              />
            </label>
            <label>
              الحد الأدنى لإجمالي الطلب
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="block border rounded-lg p-3 w-full"
                value={form.min_amount}
                onChange={(e) => field("min_amount", Number(e.target.value))}
              />
            </label>
          </>
        ) : (
          <>
            <label>
              تكلفة النقاط
              <input
                type="number"
                min="0"
                required
                className="block border rounded-lg p-3 w-full"
                value={form.points_cost}
                onChange={(e) => field("points_cost", Number(e.target.value))}
              />
            </label>
            <label>
              تكلفة الأختام
              <input
                type="number"
                min="0"
                required
                className="block border rounded-lg p-3 w-full"
                value={form.stamps_cost}
                onChange={(e) => field("stamps_cost", Number(e.target.value))}
              />
            </label>
            <p>
              إذا حددت التكلفتين تُخصمان معًا. تسليم المكافأة من العامل، ولا تُضاف للسلة تلقائيًا.
            </p>
          </>
        )}
        {(kind === "loyalty_rewards" || form.rule_type === "stamps_for_items") && (
          <label>
            الصنف
            <select
              required
              className="block border rounded-lg p-3 w-full"
              value={form.product_id}
              onChange={(e) => field("product_id", e.target.value)}
            >
              <option value="">اختر الصنف</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          نهاية الصلاحية (اختياري)
          <input
            type="datetime-local"
            className="block border rounded-lg p-3 w-full"
            value={form.valid_until}
            onChange={(e) => field("valid_until", e.target.value)}
          />
        </label>
        <Button disabled={busy}>{busy ? "جارٍ الحفظ…" : "حفظ"}</Button>
      </form>
      {(
        [
          ["loyalty_earning_rules", rules],
          ["loyalty_rewards", rewards],
        ] as Array<[string, LoyaltyRow[]]>
      ).map(([table, rows]) => (
        <div key={table as string} className="space-y-2">
          <h4 className="font-bold">
            {table === "loyalty_earning_rules" ? "قواعد الكسب" : "المكافآت"}
          </h4>
          {rows.map((row) => (
            <div key={row.id} className="border rounded-lg p-3 flex flex-wrap gap-3">
              <span>
                {row.conditions?.title || row.rule_type || row.reward_type} —{" "}
                {row.is_active ? "نشط" : "متوقف"}
              </span>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setKind(table as string);
                  setForm({
                    ...initial,
                    ...row,
                    id: row.id,
                    title: row.conditions?.title || "",
                    product_id: row.conditions?.product_id || "",
                    valid_until: row.valid_until
                      ? new Date(
                          new Date(row.valid_until).getTime() -
                            new Date(row.valid_until).getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16)
                      : "",
                  });
                }}
              >
                تعديل
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => toggle(table, row)}>
                {row.is_active ? "إيقاف" : "تفعيل"}
              </Button>
            </div>
          ))}
        </div>
      ))}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
