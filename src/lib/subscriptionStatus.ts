export function subscriptionStatus(
  subscription:
    | {
        status: string;
        current_period_start?: string;
        current_period_end?: string | null;
      }
    | undefined,
  today = new Date().toISOString().slice(0, 10),
) {
  if (!subscription) return "غير مهيأ";
  if (subscription.status === "paused") return "موقوف";
  if (subscription.status === "cancelled") return "ملغى";
  if (!subscription.current_period_end) return "تحتاج المدة إلى ضبط";
  if (subscription.current_period_end <= today || subscription.status === "past_due")
    return "منتهٍ";
  if (subscription.current_period_start && subscription.current_period_start > today)
    return "لم يبدأ";
  if (subscription.status === "trial") return "تجريبي";
  return subscription.status === "active" ? "نشط" : "غير نشط";
}
