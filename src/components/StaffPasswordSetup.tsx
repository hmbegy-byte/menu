import { useState } from 'react';
import { supabase, kitchenSupabase } from '../lib/supabase';
export default function StaffPasswordSetup({ kitchen = false, onDone }: {kitchen?: boolean; onDone: () => void}) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <form dir="rtl" className="max-w-md mx-auto my-12 border rounded-2xl p-6 space-y-4 bg-background" onSubmit={async e => {
    e.preventDefault(); setError('');
    if(password !== confirmation) {setError('كلمتا المرور غير متطابقتين'); return;}
    setBusy(true);
    const client = kitchen ? kitchenSupabase : supabase;
    try {
      const result = await client.functions.invoke('manage-staff', {body: {action:'activate',password}});
      if(result.error || result.data?.error) throw new Error('تعذر تفعيل الحساب. تحقق من كلمة المرور وحاول مجددًا.');
      await client.auth.signOut({scope:'local'});
      setPassword(''); setConfirmation(''); onDone();
    } catch(err) {setError(err instanceof Error ? err.message : 'تعذر الحفظ');}
    finally {setBusy(false);}
  }}>
    <h1 className="text-xl font-bold">اختر كلمة مرور خاصة بك</h1><p>قبل أول دخول، غيّر كلمة المرور الأولية. بعد الحفظ سجّل الدخول بكلمتك الجديدة.</p>
    <label className="block">كلمة المرور الجديدة<input className="block w-full border rounded-xl p-3" type="password" autoComplete="new-password" dir="ltr" required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)}/></label>
    <label className="block">تأكيد كلمة المرور<input className="block w-full border rounded-xl p-3" type="password" autoComplete="new-password" dir="ltr" required value={confirmation} onChange={e => setConfirmation(e.target.value)}/></label>
    {error && <p role="alert">{error}</p>}<button disabled={busy} className="bg-blue-700 text-white rounded-xl p-3 w-full">{busy ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}</button>
  </form>;
}
