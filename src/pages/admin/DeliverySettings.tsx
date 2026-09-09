import { useState } from "react";
import { useUnsavedForm } from '../../hooks/useUnsavedForm';
import { Clock3, MapPin, Plus, Trash2, Truck } from "lucide-react";

export default function DeliverySettings({ adminData }) {
  const [settings, setSettings] = useState(adminData.settings || {});
  const {markSaved}=useUnsavedForm(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const zones = settings.deliveryZones || [];
  const updateZone = (id, field, value) =>
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
      await adminData.saveStoreSection("settings", settings);
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
