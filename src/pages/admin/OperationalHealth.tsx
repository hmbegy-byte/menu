import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Radio,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

export default function OperationalHealth({ adminData }) {
  const unresolved = (adminData.incidents || []).filter((incident) => !incident.resolved_at);
  const failedPayments = (adminData.paymentTransactions || []).filter(
    (payment) => payment.status === "failed",
  );
  const checks = [
    {
      label: "اشتراك المطعم",
      ok: ["trial", "active"].includes(adminData.subscription?.status),
      detail: adminData.subscription?.status || "غير موجود",
    },
    {
      label: "استقبال الطلبات",
      ok: adminData.settings?.acceptingOrders !== false,
      detail: adminData.settings?.acceptingOrders === false ? "متوقف يدويًا" : "يعمل",
    },
    {
      label: "إيقاف الازدحام",
      ok:
        !adminData.settings?.pausedUntil || new Date(adminData.settings.pausedUntil) <= new Date(),
      detail: adminData.settings?.pausedUntil
        ? `حتى ${new Date(adminData.settings.pausedUntil).toLocaleString("ar-SA")}`
        : "لا يوجد توقف",
    },
    {
      label: "مزود الدفع",
      ok: !adminData.payment?.applePayEnabled || adminData.payment?.providerConnected,
      detail: adminData.payment?.providerConnected ? "متصل" : "غير متصل",
    },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Radio className="text-purple-600" /> حالة التشغيل
          </h2>
          <p className="mt-1 text-gray-500">
            فحص سريع للأجزاء التي قد تمنع وصول الطلبات أو المدفوعات.
          </p>
        </div>
        <button
          onClick={adminData.reload}
          className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-bold"
        >
          <RefreshCw size={17} /> تحديث الفحص
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {checks.map((check) => (
          <section
            key={check.label}
            className={`rounded-2xl border p-5 ${check.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
          >
            <div className="flex items-center gap-3">
              {check.ok ? (
                <CheckCircle2 className="text-green-600" />
              ) : (
                <AlertTriangle className="text-red-600" />
              )}
              <div>
                <h3 className="font-bold">{check.label}</h3>
                <p className="text-sm text-gray-600">{check.detail}</p>
              </div>
            </div>
          </section>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 font-bold">
            <CreditCard size={19} /> المدفوعات
          </h3>
          <p className="flex justify-between border-b py-3">
            <span>إجمالي العمليات</span>
            <strong>{adminData.paymentTransactions?.length || 0}</strong>
          </p>
          <p className="flex justify-between py-3">
            <span>عمليات فاشلة</span>
            <strong className={failedPayments.length ? "text-red-600" : "text-green-600"}>
              {failedPayments.length}
            </strong>
          </p>
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 font-bold">
            <ShieldCheck size={19} /> التنبيهات المفتوحة
          </h3>
          {unresolved.length ? (
            unresolved.map((incident) => (
              <div key={incident.id} className="border-b py-3 last:border-0">
                <div className="flex justify-between gap-3">
                  <div>
                    <strong>{incident.title}</strong>
                    <p className="mt-1 text-xs text-gray-500">{incident.details}</p>
                  </div>
                  <button
                    onClick={() => adminData.resolveIncident(incident.id)}
                    className="h-fit rounded-lg bg-green-50 px-2 py-1 text-xs font-bold text-green-700"
                  >
                    تم الحل
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-green-50 p-4 text-center font-bold text-green-700">
              لا توجد تنبيهات مفتوحة.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
