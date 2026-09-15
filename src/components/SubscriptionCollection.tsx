import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function SubscriptionCollection({
  organizationId,
  onSaved,
}: {
  organizationId: string;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState(30);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border p-2">
        تسجيل تحصيل وتجديد
      </button>
    );
  return (
    <form
      className="min-w-64 space-y-2 rounded-xl border p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!confirmed || busy) return;
        setBusy(true);
        setMessage("");
        try {
          const key = `collection:${organizationId}:${reference.trim()}`;
          const request = sessionStorage.getItem(key) || crypto.randomUUID();
          sessionStorage.setItem(key, request);
          const { data, error } = await supabase.rpc("confirm_subscription_collection", {
            p_org: organizationId,
            p_request: request,
            p_reference: reference.trim(),
            p_amount: Number(amount),
            p_days: days,
          });
          if (error) throw error;
          setMessage(`تم تسجيل التحصيل. نهاية الاشتراك: ${data}`);
          setConfirmed(false);
          await onSaved();
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "تعذر التسجيل. احتفظ بنفس المرجع عند المحاولة مجددًا.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        تحصيل يدوي لاشتراك المنصة، وليس دفع طلبات الطعام. التجديد بعدد أيام ثابت ويُضاف للمدة
        المدفوعة المتبقية.
      </p>
      <label className="block">
        مرجع التحصيل الفريد
        <input
          required
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="block w-full rounded border p-2"
        />
      </label>
      <label className="block">
        المبلغ المحصل (ر.س)
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="block w-full rounded border p-2"
        />
      </label>
      <label className="block">
        عدد الأيام
        <input
          required
          type="number"
          min="1"
          max="366"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="block w-full rounded border p-2"
        />
      </label>
      <label className="flex gap-2">
        <input
          type="checkbox"
          required
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        أؤكد استلام المبلغ خارج المنصة وصحة المرجع والمدة.
      </label>
      <button disabled={busy || !confirmed} className="rounded border p-2 disabled:opacity-50">
        {busy ? "جارٍ التسجيل…" : "تأكيد التحصيل والتجديد"}
      </button>
      <button type="button" disabled={busy} onClick={() => setOpen(false)} className="p-2">
        إغلاق
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
