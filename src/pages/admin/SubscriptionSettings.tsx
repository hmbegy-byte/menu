import { Check, Crown } from "lucide-react";
import { FEATURE_LABELS, resolvePlan } from "../../lib/plans";
import { subscriptionStatus } from "../../lib/subscriptionStatus";

export default function SubscriptionSettings({
  adminData,
}: {
  adminData: {
    plan: ReturnType<typeof resolvePlan>;
    subscription: Parameters<typeof subscriptionStatus>[0];
  };
}) {
  const { plan, subscription } = adminData;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Crown className="text-purple-600" /> الباقة والاشتراك
        </h2>
        <p className="mt-1 text-gray-500">تعرف على حدود وميزات حسابك الحالي.</p>
      </div>
      <section className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-purple-700">الباقة الحالية</p>
            <h3 className="text-3xl font-bold text-gray-900">{plan.name}</h3>
            <p className="mt-1 text-gray-600">{plan.description}</p>
            <p className="mt-3 font-bold text-purple-700">{plan.monthlyPrice} ر.س شهريًا</p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 font-bold text-green-700">
            {subscriptionStatus(subscription)}
          </span>
        </div>
        {subscription?.current_period_end && (
          <p className="mt-4 text-sm text-gray-600">
            نهاية الفترة الحالية (التجديد يدوي): {subscription.current_period_end}
          </p>
        )}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="mb-3 font-bold">الميزات</h3>
          <div className="space-y-2">
            {plan.features
              .filter((feature) => !["online_payment", "integrations"].includes(feature))
              .map((feature) => (
                <p key={feature} className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-green-600" />{" "}
                  {FEATURE_LABELS[feature] || feature}
                </p>
              ))}
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="mb-3 font-bold">الحدود</h3>
          <div className="space-y-3">
            <p>
              الفروع: <strong>{plan.limits.branches}</strong>
            </p>
            <p>
              الموظفون: <strong>{plan.limits.staff}</strong>
            </p>
            <p>
              المنتجات: <strong>{plan.limits.products}</strong>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
