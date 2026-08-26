import { CheckCircle2, Circle, Rocket } from "lucide-react";

export default function OnboardingChecklist({ adminData, setActiveTab }) {
  const { store, products, payment } = adminData;
  const steps = [
    {
      id: "profile",
      label: "أكمل بيانات وهوية المطعم",
      done: Boolean(store.logo_url && store.phone_whatsapp),
      tab: "profile",
    },
    {
      id: "legal",
      label: "أكمل الاسم القانوني وبيانات الشكاوى",
      done: Boolean(
        store.legal?.legalName && (store.legal?.supportEmail || store.legal?.complaintPhone),
      ),
      tab: "profile",
    },
    { id: "menu", label: "أضف أول منتج للقائمة", done: products.length > 0, tab: "products" },
    {
      id: "hours",
      label: "حدد ساعات العمل",
      done: (store.working_hours || []).length > 0,
      tab: "settings",
    },
    {
      id: "payment",
      label: "اختر طرق الدفع",
      done: Boolean(payment.cashOnDelivery || payment.bankTransfer),
      tab: "payment",
    },
    {
      id: "publish",
      label: "عاين المتجر وانشر رمز QR",
      done: Boolean(store.is_active),
      tab: "qrcode",
    },
  ];
  const completed = steps.filter((step) => step.done).length;
  if (completed === steps.length) return null;

  return (
    <section className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-gray-900">
            <Rocket size={20} className="text-purple-600" /> شغّل مطعمك خلال دقائق
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            اكتمل {completed} من {steps.length}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-purple-700">
          {Math.round((completed / steps.length) * 100)}%
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => setActiveTab(step.tab)}
            className="flex items-center gap-2 rounded-xl bg-white p-3 text-right text-sm hover:bg-purple-100"
          >
            {step.done ? (
              <CheckCircle2 size={18} className="text-green-600" />
            ) : (
              <Circle size={18} className="text-gray-400" />
            )}
            <span className={step.done ? "text-gray-500 line-through" : "font-bold text-gray-800"}>
              {step.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
