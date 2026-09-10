import { createClient } from 'npm:@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = request.headers.get('Authorization')?.replace(/^Bearer /i, '') || '';
  const { data: identity, error: authError } = await admin.auth.getUser(token);
  if (authError || !identity.user) return reply({ error: 'يجب تسجيل الدخول' }, 401);
  let body;
  try { body = await request.json(); } catch { return reply({ error: 'طلب غير صالح' }, 400); }
  if (body.action === 'activate') {
    const { data: account } = await admin.from('staff_accounts').select('*').eq('user_id', identity.user.id).single();
    if (!account || account.disabled || !identity.user.app_metadata?.staff_password_pending) return reply({ error: 'العملية غير متاحة لهذا الحساب' }, 403);
    if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) return reply({ error: 'كلمة المرور يجب أن تكون بين 12 و128 حرفًا' }, 400);
    const { error: passwordError } = await admin.auth.admin.updateUserById(account.user_id, { password: body.password });
    if (passwordError) return reply({ error: 'تعذر حفظ كلمة المرور الجديدة' }, 400);
    const { error: memberError } = await admin.from('store_members').upsert({ user_id: account.user_id, store_id: account.store_id, role: account.role }, { onConflict: 'store_id,user_id' });
    if (memberError) return reply({ error: 'تم حفظ كلمة المرور لكن تعذر تفعيل الصلاحية. حاول مجددًا.' }, 400);
    const { error: metadataError } = await admin.auth.admin.updateUserById(account.user_id, { app_metadata: { staff_password_pending: false } });
    if (metadataError) return reply({ error: 'تعذر إنهاء التفعيل. حاول مجددًا.' }, 400);
    return reply({ ok: true });
  }
  const { data: owner } = await admin.from('platform_admins').select('user_id').eq('user_id', identity.user.id).maybeSingle();
  if (!owner) return reply({ error: 'إدارة الحسابات متاحة لمالك المنصة فقط' }, 403);
  try {
    const { data: store } = await admin.from('stores').select('id,slug').eq('id', body.store_id).single();
    if (!store) return reply({ error: 'المطعم غير موجود' }, 400);
    if (body.action === 'create') {
      const username = String(body.username || '').trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) || !['admin','kitchen'].includes(body.role)) return reply({ error: 'تحقق من اسم المستخدم والدور' }, 400);
      if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) return reply({ error: 'كلمة المرور يجب أن تكون بين 12 و128 حرفًا' }, 400);
      const email = `${username}.${store.slug}@staff.flavor-flow.invalid`;
      const { data: created, error } = await admin.auth.admin.createUser({ email, password: body.password, email_confirm: true, app_metadata: { staff_password_pending: true } });
      if (error || !created.user) return reply({ error: 'تعذر إنشاء الحساب. قد يكون اسم المستخدم مستخدمًا أو كلمة المرور غير مقبولة.' }, 400);
      const id = created.user.id;
      const { error: rowError } = await admin.from('staff_accounts').insert({ user_id: id, store_id: store.id, username, role: body.role });
      if (rowError) { await admin.auth.admin.deleteUser(id); return reply({ error: 'تعذر ربط الحساب بالمطعم' }, 400); }
      return reply({ ok: true });
    }
    const { data: account } = await admin.from('staff_accounts').select('*').eq('user_id', body.user_id).eq('store_id', store.id).single();
    if (!account) return reply({ error: 'الحساب غير موجود في هذا المطعم' }, 404);
    if (body.action === 'reset') {
      if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) return reply({ error: 'كلمة المرور يجب أن تكون بين 12 و128 حرفًا' }, 400);
      const { error: revokeError } = await admin.from('store_members').delete().eq('user_id', account.user_id).eq('store_id', store.id);
      if (revokeError) return reply({ error: 'تعذر سحب الجلسة القديمة' }, 400);
      const { error } = await admin.auth.admin.updateUserById(account.user_id, { password: body.password, app_metadata: { staff_password_pending: true } });
      if (error) return reply({ error: 'تعذر تغيير كلمة المرور' }, 400);
    } else if (body.action === 'disable') {
      // Removing membership revokes database access even for existing JWTs.
      const { error } = await admin.from('store_members').delete().eq('user_id', account.user_id).eq('store_id', store.id);
      if (error) return reply({ error: 'تعذر تعطيل الصلاحية' }, 400);
      const { error: flagError } = await admin.from('staff_accounts').update({ disabled: true }).eq('user_id', account.user_id);
      if (flagError) return reply({ error: 'تم سحب الصلاحية لكن تعذر تحديث حالة الحساب' }, 500);
    } else return reply({ error: 'إجراء غير مدعوم' }, 400);
    return reply({ ok: true });
  } catch { return reply({ error: 'تعذر تنفيذ العملية' }, 400); }
});
