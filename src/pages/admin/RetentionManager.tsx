import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { formatCurrency } from "../../lib/currency";
import { isMockMode, supabase } from "../../lib/supabase";

type Row = Record<string, any>;
const key = (orgId: string) => `demo_retention:${orgId}`;
const readLocal = (orgId: string) => {
  try {
    return JSON.parse(localStorage.getItem(key(orgId)) || "{}") as Record<string, Row[]>;
  } catch {
    return {};
  }
};

const labels: Record<string, string> = {
  new: "عملاء جدد",
  repeat: "عملاء متكررون",
  high_value: "عالي القيمة",
  inactive: "غير نشطين",
  custom: "شريحة مخصصة",
};

export default function RetentionManager({ adminData }: any) {
  const { organization, store, orders = [] } = adminData;
  const [profiles, setProfiles] = useState<Row[]>([]);
  const [consents, setConsents] = useState<Row[]>([]);
  const [rules, setRules] = useState<Row[]>([]);
  const [campaigns, setCampaigns] = useState<Row[]>([]);
  const [deliveries, setDeliveries] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [ruleForm, setRuleForm] = useState({ name: "", kind: "repeat", threshold: 2 });
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    segment_rule_id: "",
    template: "مرحبًا {{name}}، لدينا عرض خاص لك في مطعمنا.",
    scheduled_at: "",
  });

  const demoProfiles = useMemo(() => {
    const map = new Map<string, Row>();
    orders
      .filter((order: Row) => order.status !== "cancelled")
      .forEach((order: Row) => {
        const phone = String(order.customer_phone || "").replace(/\s/g, "");
        if (!phone) return;
        const current = map.get(phone) || {
          id: `demo-customer-${phone}`,
          name: order.customer_name,
          phone,
          orders_count: 0,
          total_spent: 0,
          last_order_at: order.created_at,
        };
        current.orders_count += 1;
        current.total_spent += Number(order.total_amount || 0);
        if (new Date(order.created_at) > new Date(current.last_order_at))
          current.last_order_at = order.created_at;
        map.set(phone, current);
      });
    return [...map.values()];
  }, [orders]);

  const load = useCallback(async () => {
    setError("");
    if (isMockMode) {
      const local = readLocal(organization.id);
      setProfiles(demoProfiles);
      setConsents(local.consents || []);
      setRules(local.rules || []);
      setCampaigns(local.campaigns || []);
      setDeliveries(local.deliveries || []);
      return;
    }
    const [customerRows, consentRows, ruleRows, campaignRows] = await Promise.all([
      supabase
        .from("customer_profiles")
        .select("*")
        .eq("organization_id", organization.id)
        .order("total_spent", { ascending: false }),
      supabase.from("customer_consents").select("*").eq("organization_id", organization.id),
      supabase
        .from("customer_segment_rules")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("retention_campaigns")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
    ]);
    const failed = [customerRows, consentRows, ruleRows, campaignRows].find(
      (result) => result.error,
    );
    if (failed?.error) {
      setError("تعذر تحميل مركز الاحتفاظ. يجب تطبيق ترحيلات قاعدة البيانات الجديدة أولًا.");
      return;
    }
    setProfiles(customerRows.data || []);
    setConsents(consentRows.data || []);
    setRules(ruleRows.data || []);
    setCampaigns(campaignRows.data || []);
    const campaignIds = (campaignRows.data || []).map((campaign) => campaign.id);
    if (campaignIds.length) {
      const deliveryRows = await supabase
        .from("message_deliveries")
        .select("*")
        .in("campaign_id", campaignIds);
      setDeliveries(deliveryRows.data || []);
    } else setDeliveries([]);
  }, [demoProfiles, organization.id]);
  useEffect(() => void load(), [load]);

  const saveLocal = (next: Record<string, Row[]>) =>
    localStorage.setItem(key(organization.id), JSON.stringify(next));
  const run = async (work: () => Promise<string | void>, fallback: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await work();
      setNotice(result || fallback);
      setTimeout(() => setNotice(""), 4000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ التغيير");
    } finally {
      setBusy(false);
    }
  };
  const criteriaFor = () =>
    ruleForm.kind === "new"
      ? { max_orders: Number(ruleForm.threshold) }
      : ruleForm.kind === "repeat"
        ? { min_orders: Number(ruleForm.threshold) }
        : ruleForm.kind === "high_value"
          ? { min_spent: Number(ruleForm.threshold) }
          : ruleForm.kind === "inactive"
            ? { days: Number(ruleForm.threshold) }
            : { min_orders: Number(ruleForm.threshold) };

  const addRule = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const payload = {
        organization_id: organization.id,
        name: ruleForm.name.trim(),
        kind: ruleForm.kind,
        criteria: criteriaFor(),
        is_active: true,
      };
      if (isMockMode) {
        const next = [
          { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() },
          ...rules,
        ];
        setRules(next);
        saveLocal({ consents, rules: next, campaigns, deliveries });
      } else {
        const { error: saveError } = await supabase.from("customer_segment_rules").insert(payload);
        if (saveError) throw saveError;
        await load();
      }
      setRuleForm({ name: "", kind: "repeat", threshold: 2 });
    }, "تمت إضافة شريحة العملاء");
  };

  const removeRule = (id: string) =>
    void run(async () => {
      if (isMockMode) {
        const next = rules.filter((rule) => rule.id !== id);
        setRules(next);
        saveLocal({ consents, rules: next, campaigns, deliveries });
      } else {
        const { error: removeError } = await supabase
          .from("customer_segment_rules")
          .delete()
          .eq("id", id)
          .eq("organization_id", organization.id);
        if (removeError) throw removeError;
        await load();
      }
    }, "تم حذف الشريحة");

  const setConsent = (customer: Row, status: "opted_in" | "opted_out") =>
    void run(
      async () => {
        const payload = {
          organization_id: organization.id,
          customer_id: customer.id,
          channel: "whatsapp",
          status,
          source: "admin_confirmed",
          evidence: {
            confirmed_at: new Date().toISOString(),
            note: "أكد مدير المطعم وجود موافقة موثقة",
          },
          recorded_at: new Date().toISOString(),
        };
        if (isMockMode) {
          const next = [
            ...consents.filter((item) => item.customer_id !== customer.id),
            { ...payload, id: crypto.randomUUID() },
          ];
          setConsents(next);
          saveLocal({ consents: next, rules, campaigns, deliveries });
        } else {
          const { error: saveError } = await supabase
            .from("customer_consents")
            .upsert(payload, { onConflict: "customer_id,channel" });
          if (saveError) throw saveError;
          await load();
        }
      },
      status === "opted_in" ? "تم تسجيل الموافقة" : "تم تسجيل إلغاء الاشتراك",
    );

  const addCampaign = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const payload = {
        organization_id: organization.id,
        name: campaignForm.name.trim(),
        segment_rule_id: campaignForm.segment_rule_id || null,
        template: campaignForm.template.trim(),
        scheduled_at: campaignForm.scheduled_at
          ? new Date(campaignForm.scheduled_at).toISOString()
          : null,
        status: campaignForm.scheduled_at ? "scheduled" : "draft",
      };
      if (isMockMode) {
        const next = [
          { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() },
          ...campaigns,
        ];
        setCampaigns(next);
        saveLocal({ consents, rules, campaigns: next, deliveries });
      } else {
        const { error: saveError } = await supabase.from("retention_campaigns").insert(payload);
        if (saveError) throw saveError;
        await load();
      }
      setCampaignForm({
        name: "",
        segment_rule_id: "",
        template: "مرحبًا {{name}}، لدينا عرض خاص لك في مطعمنا.",
        scheduled_at: "",
      });
    }, "تم حفظ الحملة كمسودة آمنة");
  };

  const matches = (customer: Row, rule?: Row) => {
    if (!rule) return true;
    const c = rule.criteria || {};
    if (rule.kind === "new") return customer.orders_count <= (c.max_orders ?? 1);
    if (rule.kind === "repeat") return customer.orders_count >= (c.min_orders ?? 2);
    if (rule.kind === "high_value") return customer.total_spent >= (c.min_spent ?? 500);
    if (rule.kind === "inactive")
      return new Date(customer.last_order_at) < new Date(Date.now() - (c.days ?? 30) * 86400000);
    return (
      customer.orders_count >= (c.min_orders ?? 0) && customer.total_spent >= (c.min_spent ?? 0)
    );
  };
  const queueCampaign = (campaign: Row) =>
    void run(async () => {
      if (isMockMode) {
        const rule = rules.find((item) => item.id === campaign.segment_rule_id);
        const eligible = profiles.filter(
          (customer) =>
            matches(customer, rule) &&
            consents.some(
              (consent) => consent.customer_id === customer.id && consent.status === "opted_in",
            ),
        );
        const additions = eligible
          .filter(
            (customer) =>
              !deliveries.some(
                (delivery) =>
                  delivery.campaign_id === campaign.id && delivery.customer_id === customer.id,
              ),
          )
          .map((customer) => ({
            id: crypto.randomUUID(),
            campaign_id: campaign.id,
            customer_id: customer.id,
            status: "queued",
            created_at: new Date().toISOString(),
          }));
        const nextDeliveries = [...deliveries, ...additions];
        setDeliveries(nextDeliveries);
        saveLocal({ consents, rules, campaigns, deliveries: nextDeliveries });
        return `تم تجهيز ${additions.length} رسالة دون إرسالها`;
      }
      const { data: count, error: queueError } = await supabase.rpc("queue_retention_campaign", {
        p_campaign_id: campaign.id,
      });
      if (queueError) throw queueError;
      await load();
      return `تم تجهيز ${count || 0} رسالة دون إرسالها`;
    }, "تم تجهيز الحملة");

  const optedIn = new Set(
    consents.filter((item) => item.status === "opted_in").map((item) => item.customer_id),
  );
  const queuedCount = (campaignId: string) =>
    deliveries.filter(
      (delivery) => delivery.campaign_id === campaignId && delivery.status === "queued",
    ).length;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <UsersRound className="text-purple-600" /> الاحتفاظ والعملاء
        </h2>
        <p className="mt-1 text-gray-600">
          شرائح تلقائية وحملات لا تُرسل إلا لمن وافق على التواصل.
        </p>
      </div>
      {(notice || error) && (
        <div
          role="status"
          className={`rounded-xl border p-3 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
        >
          {error || notice}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="عملاء معروفون" value={profiles.length} />
        <Metric label="موافقون على واتساب" value={optedIn.size} />
        <Metric
          label="رسائل مجهزة"
          value={deliveries.filter((item) => item.status === "queued").length}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>شرائح العملاء</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={addRule} className="grid gap-3 sm:grid-cols-2">
              <Field label="اسم الشريحة">
                <Input
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="عملاء لم يعودوا منذ شهر"
                  required
                />
              </Field>
              <Field label="نوع الشريحة">
                <select
                  className="w-full rounded-lg border bg-white p-2.5 text-sm"
                  value={ruleForm.kind}
                  onChange={(e) => setRuleForm({ ...ruleForm, kind: e.target.value })}
                >
                  {Object.entries(labels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={
                  ruleForm.kind === "high_value"
                    ? `الحد الأدنى للإنفاق (${store.currency})`
                    : ruleForm.kind === "inactive"
                      ? "عدد أيام عدم النشاط"
                      : "عدد الطلبات"
                }
              >
                <Input
                  type="number"
                  min="0"
                  value={ruleForm.threshold}
                  onChange={(e) => setRuleForm({ ...ruleForm, threshold: Number(e.target.value) })}
                />
              </Field>
              <Button className="self-end" disabled={busy}>
                إضافة الشريحة
              </Button>
            </form>
            <div className="divide-y rounded-xl border">
              {rules.length === 0 && (
                <p className="p-4 text-sm text-gray-500">أنشئ شريحة لاستخدامها في الحملات.</p>
              )}
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3">
                  <div>
                    <strong>{rule.name}</strong>
                    <p className="text-xs text-gray-500">
                      {labels[rule.kind]} ·{" "}
                      {profiles.filter((customer) => matches(customer, rule)).length} عميل حاليًا
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeRule(rule.id)}>
                    <Trash2 size={17} className="text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="text-purple-600" /> الحملات الآمنة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={addCampaign} className="space-y-3">
              <Field label="اسم الحملة">
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="الشريحة">
                <select
                  className="w-full rounded-lg border bg-white p-2.5 text-sm"
                  value={campaignForm.segment_rule_id}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, segment_rule_id: e.target.value })
                  }
                >
                  <option value="">كل الموافقين</option>
                  {rules.map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="نص الرسالة">
                <Textarea
                  value={campaignForm.template}
                  onChange={(e) => setCampaignForm({ ...campaignForm, template: e.target.value })}
                  rows={3}
                  required
                />
              </Field>
              <Field label="موعد التجهيز (اختياري)">
                <Input
                  type="datetime-local"
                  value={campaignForm.scheduled_at}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, scheduled_at: e.target.value })
                  }
                />
              </Field>
              <Button disabled={busy}>حفظ الحملة</Button>
            </form>
            <div className="divide-y rounded-xl border">
              {campaigns.length === 0 && (
                <p className="p-4 text-sm text-gray-500">لا توجد حملات بعد.</p>
              )}
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="space-y-2 p-3">
                  <div className="flex items-center justify-between">
                    <strong>{campaign.name}</strong>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                      {queuedCount(campaign.id)} مجهزة
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-gray-500">{campaign.template}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => queueCampaign(campaign)}
                  >
                    <CalendarClock size={15} /> تجهيز قائمة الإرسال
                  </Button>
                </div>
              ))}
            </div>
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              <ShieldCheck size={17} className="shrink-0" /> التجهيز لا يرسل رسائل ولا يستهلك
              رصيدًا. الربط مع مزود واتساب الرسمي يُفعّل لاحقًا.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="text-purple-600" /> موافقات التواصل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-right text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3">العميل</th>
                  <th className="p-3">الطلبات</th>
                  <th className="p-3">الإنفاق</th>
                  <th className="p-3">آخر طلب</th>
                  <th className="p-3">واتساب</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((customer) => (
                  <tr key={customer.id} className="border-t">
                    <td className="p-3">
                      <strong>{customer.name}</strong>
                      <p dir="ltr" className="w-fit text-gray-500">
                        {customer.phone}
                      </p>
                    </td>
                    <td className="p-3">{customer.orders_count}</td>
                    <td className="p-3 font-bold">
                      {formatCurrency(customer.total_spent, store.currency)}
                    </td>
                    <td className="p-3">
                      {customer.last_order_at
                        ? new Date(customer.last_order_at).toLocaleDateString("ar-SA")
                        : "—"}
                    </td>
                    <td className="p-3">
                      {optedIn.has(customer.id) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConsent(customer, "opted_out")}
                        >
                          <Check size={15} /> موافق — إلغاء
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConsent(customer, "opted_in")}
                        >
                          تسجيل موافقة موثقة
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {profiles.length === 0 && (
              <p className="p-8 text-center text-gray-500">ستظهر قائمة العملاء بعد وصول الطلبات.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
