import React, { useState } from "react";
import { useUnsavedForm } from '../../hooks/useUnsavedForm';
import { CreditCard, Banknote, Landmark, ShieldCheck, WalletCards } from "lucide-react";

export default function PaymentSettings({ adminData }) {
  const { payment, saveStoreSection } = adminData;

  const [formData, setFormData] = useState({
    currency: payment?.currency || "EGP",
    cashOnDelivery: payment?.cashOnDelivery ?? true,
    bankTransfer: payment?.bankTransfer ?? false,
    bankAccountDetails: payment?.bankAccountDetails || "",
    paymentProvider: payment?.paymentProvider || "moyasar",
    providerConnected: payment?.providerConnected ?? false,
    applePayEnabled: payment?.applePayEnabled ?? false,
    merchantProfileId: payment?.merchantProfileId || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const {markSaved}=useUnsavedForm(formData);

  const saveToLocal = async (e) => {
    e.preventDefault();
    if (!formData.cashOnDelivery && !formData.bankTransfer) {
      alert("فعّل طريقة دفع واحدة على الأقل.");
      return;
    }
    if (formData.bankTransfer && !formData.bankAccountDetails.trim()) {
      alert("أدخل تفاصيل التحويل البنكي.");
      return;
    }
    setIsSaving(true);
    try {
      await saveStoreSection("payment", formData);
      markSaved();

      alert("تم حفظ إعدادات الدفع بنجاح");
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">طرق الدفع والعملة</h2>
        <p className="text-gray-500 mt-1">
          قم بضبط العملة المستخدمة وتفعيل خيارات الدفع المتاحة للعملاء.
        </p>
      </div>

      <form
        onSubmit={saveToLocal}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
      >
        {/* Currency */}
        <div className="pb-6 border-b border-gray-100">
          <label className="block text-sm font-bold text-gray-900 mb-2">العملة الأساسية</label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="w-full md:w-1/2 border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 font-bold"
          >
            <option value="EGP">جنيه مصري (EGP)</option>
            <option value="SAR">ريال سعودي (SAR)</option>
            <option value="AED">درهم إماراتي (AED)</option>
            <option value="USD">دولار أمريكي (USD)</option>
          </select>
        </div>

        {/* Payment Methods */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-purple-600" /> طرق الدفع المفعلة
          </h3>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <Banknote size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">الدفع عند الاستلام</h4>
                <p className="text-sm text-gray-500">يدفع العميل نقداً عند استلام الطلب.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.cashOnDelivery}
                onChange={(e) => setFormData({ ...formData, cashOnDelivery: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <Landmark size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">تحويل بنكي / محفظة إلكترونية</h4>
                  <p className="text-sm text-gray-500">يقوم العميل بالتحويل قبل تأكيد الطلب.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.bankTransfer}
                  onChange={(e) => setFormData({ ...formData, bankTransfer: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {formData.bankTransfer && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تفاصيل الحسابات البنكية أو المحافظ الإلكترونية (تظهر للعميل عند الدفع)
                </label>
                <textarea
                  value={formData.bankAccountDetails}
                  onChange={(e) => setFormData({ ...formData, bankAccountDetails: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-purple-500 h-32 resize-none"
                  placeholder="مثال:&#10;بنك الراجحي: SA000000000000000000&#10;رقم فودافون كاش: 01000000000"
                />
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                  <WalletCards size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Apple Pay والدفع الإلكتروني</h4>
                  <p className="text-sm text-gray-500">
                    لا تظهر للعميل حتى يكتمل الربط الآمن مع مزود الدفع.
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${formData.providerConnected ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
              >
                {formData.providerConnected ? "المزود متصل" : "بانتظار الربط"}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                مزود الدفع
                <select
                  value={formData.paymentProvider}
                  onChange={(e) => setFormData({ ...formData, paymentProvider: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-300 p-3"
                >
                  <option value="moyasar">Moyasar</option>
                  <option value="stripe">Stripe</option>
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                معرف ملف التاجر
                <input
                  value={formData.merchantProfileId}
                  onChange={(e) => setFormData({ ...formData, merchantProfileId: e.target.value })}
                  placeholder="يُستخرج من حساب مزود الدفع"
                  className="mt-1 w-full rounded-xl border border-gray-300 p-3"
                  dir="ltr"
                />
              </label>
            </div>
            <label className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
              <span>
                <strong className="block">إظهار Apple Pay للعميل</strong>
                <span className="text-xs text-gray-500">يتطلب اتصال المزود والتحقق من النطاق.</span>
              </span>
              <input
                type="checkbox"
                disabled={!formData.providerConnected}
                checked={formData.applePayEnabled && formData.providerConnected}
                onChange={(e) => setFormData({ ...formData, applePayEnabled: e.target.checked })}
              />
            </label>
            <p className="flex gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
              <ShieldCheck size={18} className="shrink-0" /> المفتاح السري لا يُحفظ هنا أبدًا؛ يوضع
              في بيئة الخادم، بينما تتحقق إشعارات الدفع قبل اعتبار الطلب مدفوعًا.
            </p>
          </div>
        </div>

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
