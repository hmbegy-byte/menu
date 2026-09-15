/** Validate the server's receipt before displaying success; never invent a successful order.
 * @param {unknown} payload
 */
export function parseOrderReceipt(payload) {
  const value = Array.isArray(payload) ? payload[0] : payload;
  if (!value || typeof value !== "object")
    throw new Error("لم يصل تأكيد صالح للطلب. أعد المحاولة بنفس الطلب.");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    typeof value.id !== "string" ||
    !uuid.test(value.id) ||
    typeof value.tracking_token !== "string" ||
    !uuid.test(value.tracking_token)
  )
    throw new Error("تأكيد الطلب غير مكتمل. لم يتم عرض نجاح غير موثق.");
  if (
    !["number", "string"].includes(typeof value.total_amount) ||
    !["number", "string"].includes(typeof value.order_number) ||
    (typeof value.total_amount === "string" && !value.total_amount.trim()) ||
    (typeof value.order_number === "string" && !value.order_number.trim()) ||
    value.total_amount === null ||
    value.total_amount === undefined ||
    value.total_amount === "" ||
    !Number.isFinite(Number(value.total_amount)) ||
    Number(value.total_amount) < 0 ||
    !Number.isSafeInteger(Number(value.order_number)) ||
    Number(value.order_number) <= 0
  )
    throw new Error("مبلغ الطلب أو رقمه غير صالح في التأكيد.");
  return {
    ...value,
    id: value.id,
    tracking_token: value.tracking_token,
    total_amount: Number(value.total_amount),
    order_number: Number(value.order_number),
  };
}
