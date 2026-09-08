import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStoreData } from '../hooks/useStoreData';
import { BrandUpdater } from '../components/BrandUpdater';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../components/ui/button';
import type { Session } from '@supabase/supabase-js';
import { normalizeLoyaltyPhone } from '../lib/loyaltyPhone.mjs';

export default function LoyaltyPage({ storeSlug }: { storeSlug: string }) {
  const { store, brand_assets, loading: storeLoading } = useStoreData(storeSlug);
  const [session, setSession] = useState<Session | null>(null);
  const [program, setProgram] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (new URLSearchParams(window.location.hash.slice(1)).has('error') || new URLSearchParams(window.location.search).has('error')) {
      setError('لم يكتمل تسجيل الدخول. حاول مجددًا.');
      window.history.replaceState(null, '', window.location.pathname);
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!store?.organization_id) { if (!storeLoading) setLoading(false); return; }
    let active = true;
    setLoading(true); setAccount(null); setProgram(null);
    (async () => {
      try {
        const result = await supabase.from('loyalty_programs').select('*').eq('organization_id', store.organization_id).eq('is_active', true).maybeSingle();
        if (result.error) throw result.error;
        if (!active) return;
        setProgram(result.data);
        if (result.data && session?.user.id) {
          const membership = await supabase.from('loyalty_customers').select('*').eq('organization_id', store.organization_id).eq('auth_user_id', session.user.id).maybeSingle();
          if (membership.error) throw membership.error;
          if (active) setAccount(membership.data);
        }
      } catch { if (active) setError('تعذر تحميل بطاقة الولاء. حاول مجددًا.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [store?.organization_id, storeLoading, session?.user.id, refresh]);
  async function login() {
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/s/${encodeURIComponent(storeSlug)}/loyalty`, queryParams: { prompt: 'select_account' } } });
      if (error) throw error;
    } catch { setError('تسجيل الدخول بقوقل غير متاح الآن. حاول لاحقًا.'); }
    finally { setBusy(false); }
  }
  async function join() {
    if (!consent || !store?.id) return;
    const normalized = normalizeLoyaltyPhone(phone);
    if (!normalized || name.trim().length < 2) { setError('اكتب اسمك ورقم جوال صالحًا مثل 0501234567.'); return; }
    setBusy(true); setError('');
    try {
      const result = await supabase.rpc('join_loyalty_program', { p_store_id: store.id, p_consent: true, p_phone: normalized, p_name: name.trim() });
      if (result.error) throw result.error;
      setAccount(result.data);
    } catch { setError('تعذر إنشاء العضوية. حاول مجددًا.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) setError('تعذر تسجيل الخروج.');
    else { setAccount(null); setConsent(false); }
  }
  return <main dir="rtl" className="min-h-screen bg-background text-foreground px-4 py-8">
    <BrandUpdater assets={brand_assets} isStore />
    <div className="mx-auto max-w-md space-y-5">
      <a href={`/s/${encodeURIComponent(storeSlug)}`} className="text-primary underline">العودة إلى قائمة المطعم</a>
      <section className="space-y-5 rounded-3xl border bg-card p-6 text-center text-card-foreground">
        {store?.logo_url && <img src={store.logo_url} alt={store.name} className="mx-auto h-20 w-20 rounded-full object-cover" />}
        <h1 className="text-2xl font-bold">{store?.name} — الولاء والمكافآت</h1>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {storeLoading || loading ? <p role="status">جاري التحميل…</p> : !store ? <p>تعذر العثور على المطعم.</p> : !program ? <p>برنامج الولاء غير مفعل حاليًا لهذا المطعم.</p> : !session ? <>
          <p>ادخل بحساب قوقل لعرض بطاقتك أو الانضمام إلى البرنامج.</p>
          <Button onClick={login} disabled={busy} className="w-full">المتابعة باستخدام Google</Button>
          <p className="text-sm text-muted-foreground">لا تحتاج كلمة مرور جديدة أو رسالة جوال.</p>
        </> : !account ? <>
          <p>مرحبًا {session.user.user_metadata?.full_name || session.user.email}</p>
          <label className="block text-start">اسمك لدى المطعم<input className="mt-2 w-full rounded-xl border bg-background p-3 text-foreground" value={name} maxLength={100} onChange={e => setName(e.target.value)} autoComplete="name" /></label>
          <label className="block text-start">رقم الجوال<input type="tel" dir="ltr" className="mt-2 w-full rounded-xl border bg-background p-3 text-foreground" value={phone} maxLength={20} onChange={e => setPhone(e.target.value)} placeholder="05XXXXXXXX" autoComplete="tel" /></label>
          <label className="flex items-start gap-3 text-start"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" /><span>أوافق على إنشاء عضوية لدى {store.name} وحفظ اسمي ومعرّف حسابي لإدارة نقاطي. الانضمام لا يعني الموافقة على الرسائل التسويقية. <a href="/legal/privacy" className="text-primary underline">سياسة الخصوصية</a></span></label>
          <Button onClick={join} disabled={!consent || !name.trim() || !phone.trim() || busy} className="w-full">{busy ? 'جارٍ إنشاء العضوية…' : 'انضم مجانًا'}</Button>
        </> : <>
          <p>{account.name || 'بطاقتك'}</p>
          <p dir="ltr">{account.contact_phone || account.phone}</p>
          <p className="text-5xl font-bold text-primary">{program.program_type === 'stamps' ? account.stamps_balance : account.points_balance}</p>
          <p>{program.program_type === 'stamps' ? program.stamps_name : program.points_name}</p>
          {program.program_type === 'hybrid' && <p>{account.stamps_balance} {program.stamps_name}</p>}
          <div className="mx-auto w-fit rounded-2xl bg-white p-4"><QRCodeSVG value={JSON.stringify({ a: account.id, t: account.qr_token })} size={200} level="H" /></div>
          <p>اعرض هذا الرمز لموظف المطعم لإضافة النقاط أو استبدالها.</p>
          <p className="text-sm">رقم العضوية: {account.membership_number}</p>
          <details className="rounded-xl border p-4 text-start"><summary className="cursor-pointer font-bold">حفظ البطاقة على شاشة الجوال</summary><p className="mt-3">آيفون: افتح الصفحة في Safari ثم المشاركة ← إضافة إلى الشاشة الرئيسية.</p><p className="mt-2">أندرويد: من قائمة المتصفح اختر إضافة إلى الشاشة الرئيسية.</p><p className="mt-2">يمكنك فتح البطاقة من جهاز آخر بتسجيل الدخول بنفس حساب قوقل.</p></details>
        </>}
        <Button variant="outline" onClick={() => { setError(''); setRefresh(n => n + 1); }} disabled={loading}>تحديث</Button>
        {session && <Button variant="ghost" onClick={signOut}>تسجيل الخروج</Button>}
      </section>
    </div>
  </main>;
}
