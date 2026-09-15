const validDay = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

// Display gating only. Database authorization remains authoritative.
export function subscriptionEligible(subscription, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(
    subscription &&
    ["active", "trial"].includes(subscription.status) &&
    validDay(today) &&
    validDay(subscription.current_period_start) &&
    validDay(subscription.current_period_end) &&
    subscription.current_period_start <= today &&
    subscription.current_period_end > today,
  );
}
