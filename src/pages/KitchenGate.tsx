import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChefHat } from "lucide-react";
import { signInToStore } from "../lib/access";
import { isMockMode } from "../lib/supabase";
import StaffGoogleAccess from '../components/StaffGoogleAccess';

export default function KitchenGate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    slug: isMockMode ? "demo" : "",
    email: isMockMode ? "demo@restaurant.local" : "",
    password: isMockMode ? "12345678" : "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInToStore(form.slug.trim(), form.email.trim(), form.password, ["kitchen", "admin"]);
      navigate({ to: `/kitchen/${form.slug.trim()}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-md w-full space-y-6">
        <div className="text-center">
          <ChefHat className="mx-auto text-orange-600" size={44} />
          <h1 className="mt-3 text-2xl font-bold">دخول المطبخ</h1>
          <p className="mt-1 text-sm text-gray-500">الحسابات المصرح لها بالمطبخ فقط</p>
        </div>
        <StaffGoogleAccess slug={form.slug}/>
        <form onSubmit={submit} className="space-y-4">
          <input
            aria-label="رابط المطعم"
            placeholder="رابط المطعم"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full border rounded-xl p-3"
            dir="ltr"
            required
          />
          <input
            aria-label="البريد الإلكتروني"
            type="email"
            placeholder="البريد الإلكتروني"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded-xl p-3"
            dir="ltr"
            required
          />
          <input
            aria-label="كلمة المرور"
            type="password"
            placeholder="كلمة المرور"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border rounded-xl p-3"
            dir="ltr"
            required
            minLength={8}
          />
          {error && (
            <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl disabled:opacity-60"
          >
            {loading ? "جارٍ التحقق…" : "دخول شاشة المطبخ"}
          </button>
        </form>
      </div>
    </div>
  );
}
