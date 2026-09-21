export function getMenuOrderStatus({
  acceptingOrders,
  isWithinWorkingHours,
  isTemporarilyPaused,
  pauseReason,
}) {
  if (acceptingOrders === false) {
    return { label: "الطلبات متوقفة مؤقتًا", tone: "paused" };
  }
  if (isTemporarilyPaused) {
    return { label: pauseReason?.trim() || "الطلبات متوقفة مؤقتًا", tone: "paused" };
  }
  if (!isWithinWorkingHours) {
    return { label: "مغلق حسب ساعات العمل", tone: "closed" };
  }
  return { label: "يستقبل الطلبات الآن", tone: "open" };
}

export function getMenuOrderMethods(settings = {}) {
  return [
    "استلام من الفرع",
    settings.curbsideEnabled ? "استلام من السيارة" : "",
    settings.deliveryEnabled !== false ? "توصيل" : "",
    settings.dineInEnabled !== false ? "داخل المطعم" : "",
  ].filter(Boolean);
}
