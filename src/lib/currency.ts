export function formatCurrency(value: number, currency = "SAR") {
  try {
    return new Intl.NumberFormat("ar", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value || 0);
  } catch {
    return `${Number(value || 0).toFixed(2)} ${currency}`;
  }
}
