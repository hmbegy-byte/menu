import { createClient } from "npm:@supabase/supabase-js@2";
import { runActivation } from "./activation.mjs";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "") || "";
  const { data: identity, error: authError } = await admin.auth.getUser(token);
  if (authError || !identity.user) return reply({ error: "يجب تسجيل الدخول" }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return reply({ error: "طلب غير صالح" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return reply({ error: "طلب غير صالح" }, 400);
  if (body.action === "activate") {
    const { data: account } = await admin
      .from("staff_accounts")
      .select("*")
      .eq("user_id", identity.user.id)
      .single();
    if (!account || account.disabled || !identity.user.app_metadata?.staff_password_pending)
      return reply({ error: "العملية غير متاحة لهذا الحساب" }, 403);
    if (
      typeof body.password !== "string" ||
      body.password.length < 12 ||
      body.password.length > 128
    )
      return reply({ error: "كلمة المرور يجب أن تكون بين 12 و128 حرفًا" }, 400);
    const result = await runActivation({
      savePassword: () =>
        admin.auth.admin.updateUserById(account.user_id, {
          password: body.password,
        }),
      grantMembership: () =>
        admin.rpc("activate_managed_account_revision", {
          p_user: account.user_id,
          p_revision: account.access_revision,
        }),
      finishMetadata: () =>
        admin.auth.admin.updateUserById(account.user_id, {
          app_metadata: { staff_password_pending: false },
        }),
    });
    return reply(result, result.ok ? 200 : 400);
  }
  const { data: owner } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", identity.user.id)
    .maybeSingle();
  if (!owner) return reply({ error: "إدارة الحسابات متاحة لمالك المنصة فقط" }, 403);
  try {
    const { data: store } = await admin
      .from("stores")
      .select("id,slug")
      .eq("id", body.store_id)
      .single();
    if (!store) return reply({ error: "المطعم غير موجود" }, 400);
    if (body.action === "create") {
      const username = String(body.username || "")
        .trim()
        .toLowerCase();
      if (
        !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) ||
        !["admin", "kitchen"].includes(body.role)
      )
        return reply({ error: "تحقق من اسم المستخدم والدور" }, 400);
      if (
        typeof body.password !== "string" ||
        body.password.length < 12 ||
        body.password.length > 128
      )
        return reply({ error: "كلمة المرور يجب أن تكون بين 12 و128 حرفًا" }, 400);
      const email = `${username}.${store.slug}@staff.flavor-flow.invalid`;
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true,
        app_metadata: { staff_password_pending: true },
      });
      if (error || !created.user)
        return reply(
          { error: "تعذر إنشاء الحساب. قد يكون اسم المستخدم مستخدمًا أو كلمة المرور غير مقبولة." },
          400,
        );
      const id = created.user.id;
      const { error: rowError } = await admin.from("staff_accounts").insert({
        user_id: id,
        store_id: store.id,
        username,
        role: body.role,
        intended_owner: body.intended_owner === true && body.role === "admin",
      });
      if (rowError) {
        await admin.auth.admin.deleteUser(id);
        return reply({ error: "تعذر ربط الحساب بالمطعم" }, 400);
      }
      return reply({ ok: true });
    }
    const { data: account } = await admin
      .from("staff_accounts")
      .select("*")
      .eq("user_id", body.user_id)
      .eq("store_id", store.id)
      .single();
    if (!account) return reply({ error: "الحساب غير موجود في هذا المطعم" }, 404);
    if (body.action === "role") {
      if (!["admin", "kitchen"].includes(body.role))
        return reply({ error: "تحقق من الصلاحية" }, 400);
      const { error } = await admin.rpc("change_managed_account_role", {
        p_user: account.user_id,
        p_store: store.id,
        p_role: body.role,
      });
      if (error) return reply({ error: "تعذر تغيير صلاحية الحساب" }, 400);
    } else if (body.action === "reset") {
      if (
        typeof body.password !== "string" ||
        body.password.length < 12 ||
        body.password.length > 128
      )
        return reply({ error: "كلمة المرور يجب أن تكون بين 12 و128 حرفًا" }, 400);
      const { data: resetRevision, error: revokeError } = await admin.rpc(
        "begin_managed_account_reset",
        {
          p_user: account.user_id,
          p_store: store.id,
        },
      );
      if (revokeError) return reply({ error: "تعذر سحب الجلسة القديمة" }, 400);
      const { error } = await admin.auth.admin.updateUserById(account.user_id, {
        password: body.password,
        app_metadata: { staff_password_pending: true },
      });
      if (error) return reply({ error: "تعذر تغيير كلمة المرور" }, 400);
      const { data: resumed, error: resumeError } = await admin.rpc(
        "finish_managed_account_reset",
        {
          p_user: account.user_id,
          p_store: store.id,
          p_revision: resetRevision,
        },
      );
      if (resumeError || !resumed)
        return reply(
          { error: "تم حفظ كلمة المرور؛ الحساب معطل بأمان. أعد تعيين كلمة المرور لإكمال الإعداد." },
          400,
        );
    } else if (body.action === "disable") {
      // Removing membership revokes database access even for existing JWTs.
      const { error } = await admin.rpc("revoke_managed_account", {
        p_user: account.user_id,
        p_store: store.id,
      });
      if (error) return reply({ error: "تعذر تعطيل الصلاحية" }, 400);
    } else return reply({ error: "إجراء غير مدعوم" }, 400);
    return reply({ ok: true });
  } catch {
    return reply({ error: "تعذر تنفيذ العملية" }, 400);
  }
});
