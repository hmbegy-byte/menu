import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
interface Ticket {
  id: string;
  reference: number;
  subject: string;
  details: string;
  status: string;
}
export default function SupportTickets({ storeId }: { storeId?: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    let query = supabase
      .from("support_tickets")
      .select("id,reference,subject,details,status")
      .order("created_at", { ascending: false })
      .limit(50);
    if (storeId) query = query.eq("store_id", storeId);
    const { data, error } = await query;
    if (error) setMessage("تعذر تحميل طلبات الدعم");
    else setTickets(data || []);
  }, [storeId]);
  useEffect(() => {
    void load();
  }, [load]);
  const labels: Record<string, string> = {
    open: "مفتوح",
    in_progress: "قيد المعالجة",
    resolved: "تم الحل",
  };
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h2 className="font-bold">طلبات الدعم — آخر 50 طلبًا</h2>
      <p>متابعة يدوية داخل المنصة. لا تُرسل رسائل خارجية تلقائيًا.</p>
      {import.meta.env["VITE_SUPPORT_HOURS"] && (
        <p>ساعات الدعم: {import.meta.env["VITE_SUPPORT_HOURS"]}</p>
      )}
      {storeId && (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) throw new Error("سجل الدخول مجددًا");
              const key = `support:${storeId}:${subject}:${details}`;
              const id = sessionStorage.getItem(key) || crypto.randomUUID();
              sessionStorage.setItem(key, id);
              const { error } = await supabase
                .from("support_tickets")
                .insert({ id, store_id: storeId, requester_id: user.id, subject, details });
              if (error && error.code !== "23505") throw error;
              setMessage("تم تسجيل الطلب. يظهر رقمه وحالته في القائمة.");
              setSubject("");
              setDetails("");
              await load();
            } catch {
              setMessage("تعذر تسجيل الطلب. احتفظ بالنص وحاول مجددًا.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block">
            العنوان
            <input
              required
              minLength={5}
              maxLength={150}
              className="block w-full rounded border p-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="block">
            التفاصيل — لا تكتب كلمات مرور
            <textarea
              required
              minLength={10}
              maxLength={4000}
              className="block w-full rounded border p-2"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </label>
          <button disabled={busy} className="rounded border p-2">
            تسجيل طلب دعم
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {tickets.map((t) => (
        <article key={t.id} className="rounded border p-3">
          <strong>
            #{t.reference} — {t.subject}
          </strong>
          <p className="whitespace-pre-wrap">{t.details}</p>
          <p>{labels[t.status] || t.status}</p>
          {!storeId && (
            <select
              aria-label={`حالة الطلب ${t.reference}`}
              value={t.status}
              onChange={async (e) => {
                const status = e.target.value;
                const { error } = await supabase
                  .from("support_tickets")
                  .update({
                    status,
                    resolved_at: status === "resolved" ? new Date().toISOString() : null,
                  })
                  .eq("id", t.id);
                if (error) setMessage("تعذر تعديل الحالة");
                else await load();
              }}
            >
              {Object.entries(labels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </article>
      ))}
    </section>
  );
}
