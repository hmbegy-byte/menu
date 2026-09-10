import { useEffect, useState } from 'react';
import { supabase, isMockMode } from '../lib/supabase';

export default function StaffGoogleAccess({slug}: {slug:string}) {
  const [user,setUser]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>setUser(data.user));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user||null));
    return ()=>subscription.unsubscribe();
  },[]);
  if(isMockMode) return null;
  function storeSlug(){
    const input=slug.trim();
    if(!input || !/^[\w-]+$/.test(input)) throw new Error('اكتب معرّف المطعم فقط، مثل demo، وليس الرابط كاملًا.');
    return input;
  }
  async function google(){
    setBusy(true);setMessage('');
    try{
      const id=storeSlug();
      const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/s/${encodeURIComponent(id)}/loyalty?staff=1`,queryParams:{prompt:'select_account'}}});
      if(error) throw error;
    }catch(error){setMessage(error instanceof Error?error.message:'تعذر بدء الدخول باستخدام Google.');}
    finally{setBusy(false);}
  }
  async function continueSession(){
    setBusy(true);setMessage('');
    try{
      const id=storeSlug();
      const {data:{user:current},error:authError}=await supabase.auth.getUser();
      if(authError||!current) throw new Error('انتهت جلسة الدخول. استخدم زر Google.');
      const {data:member,error}=await supabase.from('store_members').select('role, stores!inner(slug)').eq('user_id',current.id).eq('stores.slug',id).maybeSingle();
      if(error) throw new Error('تعذر التحقق من الصلاحية. حاول مجددًا.');
      if(!member){
        const {data:owner}=await supabase.from('platform_admins').select('user_id').eq('user_id',current.id).maybeSingle();
        if(owner){window.location.assign('/platform');return;}
        throw new Error('هذا الحساب غير مرتبط بالمطعم. افتح رابط الدعوة واقبله بنفس بريد Google، أو اطلب من المدير مراجعة العضوية.');
      }
      if(!['admin','kitchen'].includes(member.role)) throw new Error('دور هذا الحساب ليس مديرًا أو موظف مطبخ. اطلب مراجعة الدور من مدير المطعم.');
      window.location.assign(`/${member.role==='kitchen'?'kitchen':'admin'}/${encodeURIComponent(id)}`);
    }catch(error){setMessage(error instanceof Error?error.message:'تعذر فتح لوحة العمل.');}
    finally{setBusy(false);}
  }
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <p className="text-sm text-muted-foreground">قبلت دعوة باستخدام Google؟ لا تحتاج كلمة مرور جديدة. اكتب معرّف المطعم ثم تابع.</p>
    {user&&<><p dir="ltr" className="break-all text-sm">{user.email}</p><button type="button" disabled={busy} onClick={continueSession} className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground">فتح لوحة العمل بالحساب الحالي</button></>}
    <button type="button" disabled={busy} onClick={google} className="w-full rounded-xl border border-input px-4 py-3 font-bold">{user?'اختيار حساب Google آخر':'الدخول باستخدام Google'}</button>
    {message&&<p role="alert" className="text-sm text-destructive">{message}</p>}
  </section>;
}
