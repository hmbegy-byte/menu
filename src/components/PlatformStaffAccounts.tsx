import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function PlatformStaffAccounts({ stores }) {
  const [storeId, setStoreId] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('kitchen');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = async (id: string) => {
    const { data, error } = await supabase.from('staff_accounts').select('user_id,username,role,disabled').eq('store_id', id);
    if (error) { setAccounts([]); setMessage('تعذر تحميل الحسابات'); }
    else setAccounts(data || []);
  };
  useEffect(() => {
    setAccounts([]); setTarget(''); setPassword(''); setMessage('');
    if (storeId) {
      let active = true;
      supabase.from('staff_accounts').select('user_id,username,role,disabled').eq('store_id', storeId).then(({data,error}) => {
        if (active) { setAccounts(data || []); if (error) setMessage('تعذر تحميل الحسابات'); }
      });
      return () => { active = false; };
    }
  }, [storeId]);
  const execute = async (action: string, userId = target) => {
    setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: { action, store_id: storeId, user_id: userId, username, password, role },
      });
      if (error) {
        let detail = 'تعذر تنفيذ العملية. تحقق من اتصالك وصلاحية حساب المنصة.';
        try { detail = (await error.context.json()).error || detail; } catch { /* no structured response */ }
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);
      setPassword(''); setTarget(''); setUsername('');
      await load(storeId);
      setMessage('تم حفظ الحساب. سلّم كلمة المرور لصاحبه بطريقة آمنة؛ لن تظهر هنا مرة أخرى.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر الحفظ'); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border bg-white p-5 space-y-4">
    <h2 className="font-bold text-lg">حسابات دخول المطاعم</h2>
    <p className="text-sm text-gray-500">أنشئ حسابًا مستقلًا لكل موظف. لا يحتاج إلى بريد إلكتروني. أنشئ المطعم أولًا ثم اختره هنا.</p>
    <label className="block">المطعم<select disabled={busy} className="block w-full border rounded-xl p-3" value={storeId} onChange={e => setStoreId(e.target.value)}>
      <option value="">اختر المطعم</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name} — {s.slug}</option>)}
    </select></label>
    {storeId && <>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={e => {e.preventDefault(); void execute(target ? 'reset' : 'create');}}>
        {!target && <><label>اسم المستخدم<input disabled={busy} required pattern="[a-z0-9][a-z0-9._-]{2,31}" autoComplete="off" dir="ltr" className="block border rounded-xl p-3 w-full" value={username} onChange={e => setUsername(e.target.value.toLowerCase())}/><small>3–32 حرفًا إنجليزيًا صغيرًا أو رقمًا؛ يسمح بالنقطة والشرطة.</small></label>
        <label>الصلاحية<select disabled={busy} className="block border rounded-xl p-3 w-full" value={role} onChange={e => setRole(e.target.value)}><option value="kitchen">المطبخ فقط</option><option value="admin">إدارة المطعم</option></select></label></>}
        <label>{target ? 'كلمة مرور جديدة للحساب المحدد' : 'كلمة المرور'}<input disabled={busy} type="password" autoComplete="new-password" required minLength={12} maxLength={128} dir="ltr" className="block border rounded-xl p-3 w-full" value={password} onChange={e => setPassword(e.target.value)}/><small>12 حرفًا على الأقل. لا تُستخدم كلمة مرور بريدك الشخصي.</small></label>
        <button disabled={busy} className="rounded-xl bg-blue-700 text-white p-3 disabled:opacity-50">{busy ? 'جارٍ الحفظ…' : target ? 'حفظ كلمة المرور الجديدة' : 'إنشاء الحساب'}</button>
        {target && <button type="button" disabled={busy} onClick={() => {setTarget(''); setPassword('');}}>إلغاء تغيير كلمة المرور</button>}
      </form>
      <ul className="space-y-2">{accounts.map(a => <li key={a.user_id} className="border rounded-xl p-3 flex flex-wrap gap-3 items-center">
        <span dir="ltr">{a.username}</span><span>{a.role === 'kitchen' ? 'المطبخ' : 'إدارة المطعم'} — {a.disabled ? 'معطّل' : 'نشط'}</span>
        {!a.disabled && <><button disabled={busy} className="border rounded-lg p-2" onClick={() => {setTarget(a.user_id); setPassword(''); setMessage(`تغيير كلمة مرور ${a.username}`);}}>تعيين كلمة مرور جديدة</button>
        <button disabled={busy} className="border rounded-lg p-2 text-red-600" onClick={() => {if(window.confirm(`تعطيل حساب ${a.username} وسحب دخوله للمطعم؟`)) void execute('disable', a.user_id);}}>تعطيل</button></>}
      </li>)}</ul>
    </>}
    {message && <p role="status" className="border rounded-xl p-3">{message}</p>}
  </section>;
}
