import { useEffect, useState } from "react";
import { useUnsavedForm } from "../../hooks/useUnsavedForm";
import { Clock3, MapPin, Plus, Trash2, Truck } from "lucide-react";
import { isMockMode, supabase } from "../../lib/supabase";
import { isValidGoogleReviewUrl } from "../../lib/restaurantOperations.mjs";

type DeliveryZone = {
  id: string;
  name: string;
  fee: number;
  minOrder: number;
  etaMinutes: number;
  active: boolean;
};
type DeliveryConfiguration = {
  deliveryZones?: DeliveryZone[];
  deliveryEnabled?: boolean;
  dineInEnabled?: boolean;
  pickupEtaMinutes?: number;
  curbsideEnabled?: boolean;
  googleReviewEnabled?: boolean;
  googleReviewUrl?: string;
  orderBoardEnabled?: boolean;
};
export default function DeliverySettings({
  adminData,
}: {
  adminData: {
    store: { id: string };
    settings?: DeliveryConfiguration;
    saveStoreSection: (section: string, value: DeliveryConfiguration) => Promise<unknown>;
  };
}) {
  const [settings, setSettings] = useState<DeliveryConfiguration>(adminData.settings || {});
  const { markSaved } = useUnsavedForm(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [boardToken, setBoardToken] = useState("");
  useEffect(() => {
    if (isMockMode) {
      const key = `demo_order_board:${adminData.store.id}`;
      const existing = localStorage.getItem(key) || crypto.randomUUID();
      localStorage.setItem(key, existing);
      setBoardToken(existing);
      return;
    }
    void supabase
      .from("order_display_boards")
      .select("access_token")
      .eq("store_id", adminData.store.id)
      .maybeSingle()
      .then(({ data }) => setBoardToken(data?.access_token || ""));
  }, [adminData.store.id]);
  const zones = settings.deliveryZones || [];
  const updateZone = <K extends keyof DeliveryZone>(id: string, field: K, value: DeliveryZone[K]) =>
    setSettings((current) => ({
      ...current,
      deliveryZones: (current.deliveryZones || []).map((zone) =>
        zone.id === id ? { ...zone, [field]: value } : zone,
      ),
    }));
  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      if (settings.googleReviewEnabled && !isValidGoogleReviewUrl(settings.googleReviewUrl || ""))
        throw new Error("أدخل رابط تقييم Google صالحًا يبدأ بـ https://");
      await adminData.saveStoreSection("settings", settings);
      if (!isMockMode) {
        const { data, error } = await supabase
          .from("order_display_boards")
          .upsert(
            { store_id: adminData.store.id, is_active: settings.orderBoardEnabled === true },
            { onConflict: "store_id" },
          )
          .select("access_token")
          .single();
        if (error) throw error;
        setBoardToken(data.access_token);
      }
      markSaved();
      setMessage("تم حفظ إعدادات التوصيل.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Truck className="text-purple-600" /> التوصيل والاستلام
        </h2>
        <p className="mt-1 text-gray-500">حدد مناطق الخدمة ورسومها والوقت المتوقع لكل منطقة.</p>
      </div>
      <section className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-3">
        <label className="flex items-center justify-between rounded-xl bg-gray-50 p-4 font-bold">
          تفعيل التوصيل
          <input
            type="checkbox"
            checked={settings.deliveryEnabled !== false}
            onChange={(e) => setSettings({ ...settings, deliveryEnabled: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between rounded-xl bg-gray-50 p-4 font-bold">
          الطلب داخل المطعم
          <input
            type="checkbox"
            checked={settings.dineInEnabled !== false}
            onChange={(e) => setSettings({ ...settings, dineInEnabled: e.target.checked })}
          />
        </label>
        <label className="text-sm font-bold">
          وقت الاستلام المتوقع
          <input
            type="number"
            min="5"
            value={settings.pickupEtaMinutes || 20}
            onChange={(e) => setSettings({ ...settings, pickupEtaMinutes: Number(e.target.value) })}
            className="mt-1 w-full rounded-xl border p-3"
          />
        </label>
      </section>
      <section className="space-y-4 rounded-2xl border bg-white p-5">
        <div>
          <h3 className="font-bold">خيارات الاستلام وما بعد الطلب</h3>
          <p className="mt-1 text-sm text-gray-500">
            كل ميزة اختيارية لهذا المطعم ولا تحتاج رسائل أو خدمات مدفوعة.
          </p>
        </div>
        <label className="flex items-center justify-between rounded-xl bg-gray-50 p-4 font-bold">
          الاستلام من السيارة
          <input
            type="checkbox"
            checked={settings.curbsideEnabled === true}
            onChange={(event) =>
              setSettings({ ...settings, curbsideEnabled: event.target.checked })
            }
          />
        </label>
        <label className="flex items-center justify-between rounded-xl bg-gray-50 p-4 font-bold">
          شاشة أرقام الطلبات العامة
          <input
            type="checkbox"
            checked={settings.orderBoardEnabled === true}
            onChange={(event) =>
              setSettings({ ...settings, orderBoardEnabled: event.target.checked })
            }
          />
        </label>
        {settings.orderBoardEnabled && boardToken && (
          <a
            className="block break-all rounded-xl border p-3 text-sm font-bold text-blue-700"
            href={`/display/${boardToken}`}
            target="_blank"
            rel="noreferrer"
          >
            فتح شاشة أرقام الطلبات
          </a>
        )}
        <label className="flex items-center justify-between rounded-xl bg-gray-50 p-4 font-bold">
          إظهار رابط تقييم Google بعد التسليم
          <input
            type="checkbox"
            checked={settings.googleReviewEnabled === true}
            onChange={(event) =>
              setSettings({ ...settings, googleReviewEnabled: event.target.checked })
            }
          />
        </label>
        {settings.googleReviewEnabled && (
          <label className="block text-sm font-bold">
            رابط صفحة التقييم للفرع
            <input
              dir="ltr"
              type="url"
              placeholder="https://g.page/.../review"
              value={settings.googleReviewUrl || ""}
              onChange={(event) =>
                setSettings({ ...settings, googleReviewUrl: event.target.value.trim() })
              }
              className="mt-1 w-full rounded-xl border p-3 text-left"
            />
            <span className="mt-1 block font-normal text-gray-500">
              الزر يفتح Google فقط؛ الضغط لا يعني أن العميل كتب تقييمًا.
            </span>
          </label>
        )}
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">مناطق التوصيل</h3>
          <button
            onClick={() =>
              setSettings({
                ...settings,
                deliveryZones: [
                  ...zones,
                  {
                    id: crypto.randomUUID(),
                    name: "منطقة جديدة",
                    fee: 0,
                    minOrder: 0,
                    etaMinutes: 40,
                    active: true,
                  },
                ],
              })
            }
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-bold text-white"
          >
            <Plus size={17} /> إضافة منطقة
          </button>
        </div>
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1.5fr_repeat(3,1fr)_auto]"
          >
            <label className="text-xs font-bold text-gray-500">
              <MapPin size={15} className="inline" /> الاسم
              <input
                value={zone.name}
                onChange={(e) => updateZone(zone.id, "name", e.target.value)}
                className="mt-1 w-full rounded-lg border p-2 text-gray-900"
              />
            </label>
            <label className="text-xs font-bold text-gray-500">
              الرسوم
              <input
                type="number"
                min="0"
                value={zone.fee}
                onChange={(e) => updateZone(zone.id, "fee", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border p-2 text-gray-900"
              />
            </label>
            <label className="text-xs font-bold text-gray-500">
              الحد الأدنى
              <input
                type="number"
                min="0"
                value={zone.minOrder}
                onChange={(e) => updateZone(zone.id, "minOrder", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border p-2 text-gray-900"
              />
            </label>
            <label className="text-xs font-bold text-gray-500">
              <Clock3 size={15} className="inline" /> بالدقائق
              <input
                type="number"
                min="5"
                value={zone.etaMinutes}
                onChange={(e) => updateZone(zone.id, "etaMinutes", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border p-2 text-gray-900"
              />
            </label>
            <button
              aria-label="حذف المنطقة"
              onClick={() =>
                setSettings({
                  ...settings,
                  deliveryZones: zones.filter((item) => item.id !== zone.id),
                })
              }
              className="self-end rounded-lg bg-red-50 p-2 text-red-600"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </section>
      {message && (
        <p className="rounded-xl bg-purple-50 p-3 text-sm font-bold text-purple-700">{message}</p>
      )}
      <button
        onClick={save}
        disabled={saving}
        className="rounded-xl bg-purple-600 px-6 py-3 font-bold text-white disabled:opacity-50"
      >
        {saving ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
      </button>
    </div>
  );
}
