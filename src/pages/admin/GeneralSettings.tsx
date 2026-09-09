import React, { useState } from "react";
import { useUnsavedForm } from '../../hooks/useUnsavedForm';
import WorkingHoursEditor, { normalizeHours } from './WorkingHoursEditor';
import { Settings, MessageCircle, AlertCircle, TimerReset } from "lucide-react";

export default function GeneralSettings({ adminData }) {
  const { store, updateStore, settings, saveStoreSection } = adminData;

  const [formData, setFormData] = useState({
    acceptingOrders: settings?.acceptingOrders ?? true,
    taxPercent: settings?.taxPercent || 0,
    minOrderValue: settings?.minOrderValue || 0,
    maxOrdersPer15Minutes: settings?.maxOrdersPer15Minutes || 12,
    pausedUntil: settings?.pausedUntil || "",
    pauseReason: settings?.pauseReason || "",
    whatsappMessageTemplate:
      settings?.whatsappMessageTemplate ||
      "مرحباً، أود طلب الآتي:\n\n{orders}\n\nالإجمالي: {total} {currency}\n\nالاسم: {name}\nرقم الهاتف: {phone}\nالعنوان: {address}",
  });

  const [workingHours, setWorkingHours] = useState(
    normalizeHours(store?.working_hours) || [
      { id: 0, dayName: "الأحد", isOpen: true, from: "12:00", to: "23:59" },
      { id: 1, dayName: "الإثنين", isOpen: true, from: "12:00", to: "23:59" },
      { id: 2, dayName: "الثلاثاء", isOpen: true, from: "12:00", to: "23:59" },
      { id: 3, dayName: "الأربعاء", isOpen: true, from: "12:00", to: "23:59" },
      { id: 4, dayName: "الخميس", isOpen: true, from: "12:00", to: "23:59" },
      { id: 5, dayName: "الجمعة", isOpen: true, from: "12:00", to: "23:59" },
      { id: 6, dayName: "السبت", isOpen: true, from: "12:00", to: "23:59" },
    ],
  );

  const [isSaving, setIsSaving] = useState(false);
  const { dirty, markSaved } = useUnsavedForm({formData,workingHours});
  const [saveMessage,setSaveMessage] = useState('');

  const handleWorkingHourChange = (id, field, value) => {
    setWorkingHours((prev) =>
      prev.map((day) => (day.id === id ? { ...day, [field]: value } : day)),
    );
  };

  const saveToLocal = async (e) => {
    e.preventDefault();
    if (workingHours.some(day => day.isOpen && (!day.from || !day.to || day.from===day.to))) { alert('راجع أوقات الفتح والإغلاق: يجب أن تكون مختلفة.'); return; }
    setIsSaving(true);
    try {
      await saveStoreSection("settings", formData);
      await updateStore({ working_hours: workingHours });

      markSaved();
      setSaveMessage('تم حفظ الإعدادات العامة بنجاح');
    } catch (err) {
      setSaveMessage('تعذر الحفظ. التعديلات ما زالت في النموذج؛ أعد المحاولة.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <p role="status" className="text-sm text-muted-foreground">{dirty ? 'لديك تعديلات غير محفوظة' : saveMessage}</p>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">الإعدادات العامة</h2>
        <p className="text-gray-500 mt-1">التحكم في حالة استقبال الطلبات، الضرائب، والرسائل.</p>
      </div>

      <form
        onSubmit={saveToLocal}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
      >
        {/* Receiving Orders */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">استقبال الطلبات</h3>
            <p className="text-sm text-gray-500">
              إيقاف هذا الخيار سيمنع العملاء من إرسال طلبات جديدة.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.acceptingOrders}
              onChange={(e) => setFormData({ ...formData, acceptingOrders: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {/* Tax and Min Order */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الضريبة المضافة (%)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={formData.taxPercent}
              onChange={(e) =>
                setFormData({ ...formData, taxPercent: parseFloat(e.target.value) || 0 })
              }
              className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الحد الأدنى للطلب
            </label>
            <input
              type="number"
              min="0"
              value={formData.minOrderValue}
              onChange={(e) =>
                setFormData({ ...formData, minOrderValue: parseFloat(e.target.value) || 0 })
              }
              className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="space-y-4 border-t border-gray-100 pt-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <TimerReset size={19} /> التحكم في الازدحام
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              يمنع استقبال طلبات أكثر من قدرة المطبخ ويعيد الفتح تلقائيًا بعد التوقف المؤقت.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              أقصى عدد طلبات كل 15 دقيقة
              <input
                type="number"
                min="1"
                max="200"
                value={formData.maxOrdersPer15Minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxOrdersPer15Minutes: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              إيقاف الطلبات حتى
              <input
                type="datetime-local"
                value={formData.pausedUntil ? String(formData.pausedUntil).slice(0, 16) : ""}
                onChange={(e) => setFormData({ ...formData, pausedUntil: e.target.value })}
                className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700">
            سبب التوقف الظاهر للعميل
            <input
              value={formData.pauseReason}
              onChange={(e) => setFormData({ ...formData, pauseReason: e.target.value })}
              placeholder="مثال: ضغط طلبات، نعود لاستقبالكم بعد قليل"
              className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </label>
          {formData.pausedUntil && (
            <button
              type="button"
              onClick={() => setFormData({ ...formData, pausedUntil: "", pauseReason: "" })}
              className="rounded-xl bg-green-50 px-4 py-2 text-sm font-bold text-green-700"
            >
              فتح الطلبات الآن
            </button>
          )}
        </div>

        {/* WhatsApp Template */}
        <div className="pt-4 border-t border-gray-100">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
            <MessageCircle size={18} /> قالب رسالة الواتساب
          </label>
          <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-3 flex gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              يمكنك استخدام المتغيرات التالية:
              <span className="font-mono bg-blue-100 px-1 rounded mx-1">{"{orders}"}</span>،
              <span className="font-mono bg-blue-100 px-1 rounded mx-1">{"{total}"}</span>،
              <span className="font-mono bg-blue-100 px-1 rounded mx-1">{"{currency}"}</span>،
              <span className="font-mono bg-blue-100 px-1 rounded mx-1">{"{name}"}</span>،
              <span className="font-mono bg-blue-100 px-1 rounded mx-1">{"{phone}"}</span>،
              <span className="font-mono bg-blue-100 px-1 rounded mx-1">{"{address}"}</span>
            </div>
          </div>
          <textarea
            value={formData.whatsappMessageTemplate}
            onChange={(e) => setFormData({ ...formData, whatsappMessageTemplate: e.target.value })}
            className="w-full border border-gray-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-purple-500 h-48 resize-none font-mono text-sm leading-relaxed"
            dir="rtl"
          />
        </div>

        {/* Working Hours */}
        <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} timezone={store.timezone} />

        <div className="pt-4 flex justify-end border-t border-gray-100">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-70"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </form>
    </div>
  );
}
