/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase-generated database types will replace these boundary values. */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  LocateFixed,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { formatCurrency } from "../../lib/currency";
import { isMockMode, supabase } from "../../lib/supabase";
import { readDemoData, writeDemo } from "../../lib/storeDefaults";

export type CartLine = {
  key: string;
  productId: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  selectionLabels: string[];
  selectedOptions?: Array<{ group_id: string; choice_id: string; name: string }>;
};

type CartSheetProps = {
  lines: CartLine[];
  onClose: () => void;
  onRemove: (key: string) => void;
  onChangeQuantity?: (key: string, quantity: number) => void;
  onSubmitted?: (order: any) => void;
  store?: any;
  settings?: Record<string, any>;
  payment?: Record<string, any>;
};

export function CartSheet({
  lines,
  onClose,
  onRemove,
  onChangeQuantity,
  onSubmitted,
  store,
  settings = {},
  payment = {},
}: CartSheetProps) {
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    orderType: "pickup",
    deliveryAddress: "",
    deliveryZoneId: "",
    tableNumber: "",
    latitude: null as number | null,
    longitude: null as number | null,
    notes: "",
    paymentMethod:
      payment.cashOnDelivery === false && payment.bankTransfer ? "bank_transfer" : "cash",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<any>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [checkoutAttemptId] = useState(() => crypto.randomUUID());
  const currency = payment.currency || store?.currency || "SAR";
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const tax = subtotal * (Number(settings.taxPercent || 0) / 100);
  const deliveryZones = (settings.deliveryZones || []).filter((zone) => zone.active !== false);
  const selectedZone = deliveryZones.find((zone) => zone.id === form.deliveryZoneId);
  const deliveryFee = form.orderType === "delivery" ? Number(selectedZone?.fee || 0) : 0;
  const estimatedMinutes =
    form.orderType === "delivery"
      ? Number(selectedZone?.etaMinutes || 40)
      : Number(settings.pickupEtaMinutes || 20);
  const total = subtotal + tax + deliveryFee;
  const minimum = Math.max(Number(settings.minOrderValue || 0), form.orderType === 'delivery' ? Number(selectedZone?.minOrder || 0) : 0);
  const canCash = payment.cashOnDelivery !== false;
  const canBank = Boolean(payment.bankTransfer);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  const message = useMemo(
    () =>
      confirmed
        ? `طلب جديد رقم ${confirmed.order_number}\n${(confirmed.order_items || []).map((item) => `• ${item.quantity}× ${item.product_name}`).join("\n")}\nالإجمالي: ${formatCurrency(confirmed.total_amount, currency)}\nالعميل: ${confirmed.customer_name}\nالهاتف: ${confirmed.customer_phone}`
        : "",
    [confirmed, currency],
  );
  const whatsappUrl = confirmed
    ? `https://wa.me/${String(store?.phone_whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    : "#";

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("المتصفح لا يدعم تحديد الموقع.");
      return;
    }
    setLocationStatus("جارٍ تحديد موقعك…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({
          ...current,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }));
        setLocationStatus("تم حفظ الموقع مع الطلب.");
      },
      () => setLocationStatus("تعذر تحديد الموقع. يمكنك كتابة العنوان يدويًا."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.customerName.trim() || !form.customerPhone.trim())
      return setError("أدخل الاسم ورقم الهاتف.");
    if (!/^\+?[0-9\s-]{7,20}$/.test(form.customerPhone.trim()))
      return setError("أدخل رقم هاتف صحيحًا.");
    if (!canCash && !canBank) return setError("لا توجد طريقة دفع متاحة حاليًا. تواصل مع المطعم.");
    if (form.orderType === "delivery" && !form.deliveryAddress.trim())
      return setError("أدخل عنوان التوصيل.");
    if (form.orderType === "delivery" && deliveryZones.length && !selectedZone)
      return setError("اختر منطقة التوصيل.");
    if (form.orderType === "delivery" && subtotal < Number(selectedZone?.minOrder || 0))
      return setError(
        `الحد الأدنى لهذه المنطقة ${formatCurrency(Number(selectedZone?.minOrder || 0), currency)}.`,
      );
    if (form.orderType === "dine_in" && !form.tableNumber.trim())
      return setError("أدخل رقم الطاولة.");
    if (subtotal < Number(settings.minOrderValue || 0))
      return setError(
        `الحد الأدنى للطلب ${formatCurrency(Number(settings.minOrderValue), currency)}.`,
      );
    setSubmitting(true);
    try {
      const orderNumber = Math.floor(100000 + Math.random() * 900000);
      const orderItems = lines.map((line) => ({
        product_id: line.productId,
        product_name: line.name,
        unit_price: line.unitPrice,
        quantity: line.quantity,
        selected_options: line.selectedOptions || line.selectionLabels.map((name) => ({ name })),
      }));
      let savedOrder;
      if (!store?.id) throw new Error("تعذر تحديد المطعم لهذا الطلب");
      if (isMockMode) {
        const existingOrder = readDemoData().orders.find(
          (order) => order.idempotency_key === checkoutAttemptId,
        );
        if (existingOrder) {
          setConfirmed(existingOrder);
          onSubmitted?.(existingOrder);
          return;
        }
        savedOrder = {
          id: crypto.randomUUID(),
          order_number: orderNumber,
          store_id: store.id,
          customer_name: form.customerName.trim(),
          customer_phone: form.customerPhone.trim(),
          order_type: form.orderType,
          delivery_address: form.orderType === "delivery" ? form.deliveryAddress.trim() : null,
          delivery_zone: selectedZone?.name || null,
          delivery_fee: deliveryFee,
          table_number: form.orderType === "dine_in" ? form.tableNumber.trim() : null,
          tracking_token: crypto.randomUUID(),
          idempotency_key: checkoutAttemptId,
          payment_status: form.paymentMethod === "cash" ? "unpaid" : "pending",
          delivery_latitude: form.latitude,
          delivery_longitude: form.longitude,
          promised_at: new Date(Date.now() + estimatedMinutes * 60000).toISOString(),
          notes: form.notes.trim(),
          payment_method: form.paymentMethod,
          subtotal_amount: subtotal,
          tax_amount: tax,
          total_amount: total,
          status: "pending",
          created_at: new Date().toISOString(),
          order_items: orderItems,
        };
        writeDemo("orders", [savedOrder, ...readDemoData().orders]);
      } else {
        const attribution = store?.attribution || {};
        const { data, error: orderError } = await supabase.rpc("create_order_v4", {
          p_store_id: store.id,
          p_customer_name: form.customerName.trim(),
          p_customer_phone: form.customerPhone.trim(),
          p_order_type: form.orderType,
          p_delivery_address: form.orderType === "delivery" ? form.deliveryAddress.trim() : null,
          p_notes: form.notes.trim() || null,
          p_payment_method: form.paymentMethod,
          p_items: orderItems,
          p_delivery_zone_id: form.deliveryZoneId || null,
          p_table_number: form.tableNumber.trim() || null,
          p_idempotency_key: checkoutAttemptId,
          p_delivery_latitude: form.latitude,
          p_delivery_longitude: form.longitude,
          p_campaign_slug: attribution.campaign || null,
          p_attribution_source: attribution.source || null,
        });
        if (orderError) {
          // PostgREST errors are plain objects, not Error instances.
          const message = orderError.code === 'P0001' && /^[\u0600-\u06ff]/.test(orderError.message || '')
            ? orderError.message
            : `تعذر إرسال الطلب. رمز الخطأ: ${/^[A-Z0-9]+$/.test(orderError.code || '') ? orderError.code : 'NETWORK'}`;
          throw new Error(message);
        }
        savedOrder = Array.isArray(data) ? data[0] : data;
      }
      const confirmation = {
        ...savedOrder,
        order_items: orderItems,
        customer_name: form.customerName.trim(),
        customer_phone: form.customerPhone.trim(),
        total_amount: savedOrder.total_amount ?? total,
      };
      setConfirmed(confirmation);
      onSubmitted?.(confirmation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إرسال الطلب. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" dir="rtl">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="سلة الطلب"
        className="animate-sheet-up relative flex max-h-[94vh] w-full max-w-md flex-col rounded-t-3xl bg-popover shadow-float"
      >
        <div className="flex items-center justify-between border-b px-4 py-4">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <ShoppingBag className="h-5 w-5 text-primary" />
            سلة الطلب
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-9 w-9 place-items-center rounded-full bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {confirmed ? (
          <div className="space-y-5 overflow-y-auto p-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
            <div>
              <h3 className="text-xl font-extrabold">تم استلام طلبك</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                رقم الطلب #{confirmed.order_number}
              </p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                <Clock3 size={14} /> الوقت المتوقع {estimatedMinutes} دقيقة
              </p>
            </div>
            {confirmed.tracking_token && (
              <a
                href={`/track/${confirmed.tracking_token}`}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3 font-bold text-white"
              >
                <ExternalLink size={17} /> تتبع حالة الطلب
              </a>
            )}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="gradient-primary block rounded-2xl py-3 font-bold text-primary-foreground"
            >
              إرسال نسخة عبر واتساب
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-surface py-3 font-bold"
            >
              إغلاق
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {lines.map((line) => (
                <div
                  key={line.key}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl bg-surface p-3"
                >
                  <img src={line.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{line.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.selectionLabels.join("، ")}
                    </p>
                    <p className="mt-1 text-xs font-bold text-primary">
                      {formatCurrency(line.unitPrice * line.quantity, currency)}
                    </p>
                    <div className="mt-2 flex w-fit items-center gap-2 rounded-full bg-surface-strong p-1">
                      <button
                        type="button"
                        aria-label="إنقاص الكمية"
                        onClick={() => onChangeQuantity?.(line.key, Math.max(1, line.quantity - 1))}
                        className="grid h-7 w-7 place-items-center"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{line.quantity}</span>
                      <button
                        type="button"
                        aria-label="زيادة الكمية"
                        onClick={() => onChangeQuantity?.(line.key, line.quantity + 1)}
                        className="grid h-7 w-7 place-items-center"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(line.key)}
                    aria-label={`حذف ${line.name}`}
                    className="grid h-9 w-9 place-items-center rounded-full bg-surface-strong text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-bold">
                  الاسم
                  <input
                    required
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="mt-1 w-full rounded-xl border bg-background p-3 font-normal"
                  />
                </label>
                <label className="text-sm font-bold">
                  الهاتف
                  <input
                    required
                    type="tel"
                    dir="ltr"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    className="mt-1 w-full rounded-xl border bg-background p-3 font-normal"
                  />
                </label>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-bold">نوع الطلب</legend>
                <div
                  className={`grid gap-2 ${settings.dineInEnabled !== false ? "grid-cols-3" : "grid-cols-2"}`}
                >
                  <label className="rounded-xl border p-3">
                    <input
                      type="radio"
                      name="orderType"
                      value="pickup"
                      checked={form.orderType === "pickup"}
                      onChange={(e) => setForm({ ...form, orderType: e.target.value })}
                    />{" "}
                    استلام
                  </label>
                  <label className="rounded-xl border p-3">
                    <input
                      type="radio"
                      name="orderType"
                      value="delivery"
                      checked={form.orderType === "delivery"}
                      disabled={settings.deliveryEnabled === false}
                      onChange={(e) => setForm({ ...form, orderType: e.target.value })}
                    />{" "}
                    توصيل
                  </label>
                  {settings.dineInEnabled !== false && (
                    <label className="rounded-xl border p-3">
                      <input
                        type="radio"
                        name="orderType"
                        value="dine_in"
                        checked={form.orderType === "dine_in"}
                        onChange={(e) => setForm({ ...form, orderType: e.target.value })}
                      />{" "}
                      داخل المطعم
                    </label>
                  )}
                </div>
              </fieldset>
              {form.orderType === "delivery" && (
                <div className="space-y-3">
                  <label className="block text-sm font-bold">
                    منطقة التوصيل
                    <select
                      required
                      value={form.deliveryZoneId}
                      onChange={(e) => setForm({ ...form, deliveryZoneId: e.target.value })}
                      className="mt-1 w-full rounded-xl border bg-background p-3 font-normal"
                    >
                      <option value="">اختر المنطقة</option>
                      {deliveryZones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} — {formatCurrency(zone.fee, currency)} — {zone.etaMinutes}{" "}
                          دقيقة
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold">
                    عنوان التوصيل
                    <textarea
                      required
                      value={form.deliveryAddress}
                      onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                      className="mt-1 min-h-20 w-full rounded-xl border bg-background p-3 font-normal"
                    />
                    <button
                      type="button"
                      onClick={captureLocation}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-50 p-2.5 font-bold text-blue-700"
                    >
                      <LocateFixed size={17} /> مشاركة موقعي مع المطعم
                    </button>
                    {locationStatus && (
                      <p className="mt-2 text-xs font-medium text-muted-foreground">
                        {locationStatus}
                      </p>
                    )}
                  </label>
                </div>
              )}
              {form.orderType === "dine_in" && (
                <label className="block text-sm font-bold">
                  رقم الطاولة
                  <input
                    required
                    value={form.tableNumber}
                    onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
                    className="mt-1 w-full rounded-xl border bg-background p-3 font-normal"
                  />
                </label>
              )}
              <label className="block text-sm font-bold">
                ملاحظات
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1 min-h-16 w-full rounded-xl border bg-background p-3 font-normal"
                />
              </label>
              {canBank && (
                <fieldset>
                  <legend className="mb-2 text-sm font-bold">طريقة الدفع</legend>
                  <div className="space-y-2">
                    {canCash && (
                      <label className="block rounded-xl border p-3">
                        <input
                          type="radio"
                          name="payment"
                          value="cash"
                          checked={form.paymentMethod === "cash"}
                          onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                        />{" "}
                        الدفع عند الاستلام
                      </label>
                    )}
                    <label className="block rounded-xl border p-3">
                      <input
                        type="radio"
                        name="payment"
                        value="bank_transfer"
                        checked={form.paymentMethod === "bank_transfer"}
                        onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      />{" "}
                      تحويل بنكي
                    </label>
                    {form.paymentMethod === "bank_transfer" && (
                      <p className="whitespace-pre-line rounded-xl bg-surface p-3 text-xs">
                        {payment.bankAccountDetails}
                      </p>
                    )}
                  </div>
                </fieldset>
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-destructive/10 p-3 text-sm font-bold text-destructive"
                >
                  {error}
                </p>
              )}
            </div>
            <div className="border-t px-4 py-4">
              {minimum > 0 && <p role="status" className="mb-3 text-sm">الحد الأدنى: {formatCurrency(minimum,currency)}{subtotal < minimum ? ` — أضف ${formatCurrency(minimum-subtotal,currency)} لإكمال الطلب` : ' — مستوفى'}</p>}
              {form.orderType==='delivery' && deliveryZones.length>0 && !selectedZone && <p className="mb-3 text-sm text-destructive">اختر منطقة التوصيل لاحتساب الرسوم والإجمالي النهائي.</p>}
              <div className="mb-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>المجموع</span>
                  <span>{formatCurrency(subtotal, currency)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between">
                    <span>الضريبة</span>
                    <span>{formatCurrency(tax, currency)}</span>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>رسوم التوصيل</span>
                    <span>{formatCurrency(deliveryFee, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-extrabold">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(total, currency)}</span>
                </div>
              </div>
              <button
                disabled={submitting || !lines.length || subtotal < minimum || (form.orderType==='delivery' && deliveryZones.length>0 && !selectedZone)}
                className="gradient-primary w-full rounded-2xl py-3.5 font-extrabold text-primary-foreground disabled:opacity-50"
              >
                {submitting ? "جارٍ إرسال الطلب…" : "تأكيد الطلب"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
