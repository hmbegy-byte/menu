import { isMockMode, supabase } from "./supabase";

const demoKey = (slug: string, role: string) => `demo_access:${slug}:${role}`;

export async function signInToStore(
  slug: string,
  email: string,
  password: string,
  allowedRoles: string[],
) {
  if (isMockMode) {
    if (slug !== "demo" || email !== "demo@restaurant.local" || password !== "12345678") {
      throw new Error("بيانات الدخول التجريبية غير صحيحة");
    }
    const role = allowedRoles[0];
    if (!role) throw new Error("لم تحدد صلاحية للدخول");
    sessionStorage.setItem(demoKey(slug, role), "1");
    return { role };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
  const { data: membership, error: membershipError } = await supabase
    .from("store_members")
    .select("role, stores!inner(id, slug)")
    .eq("user_id", data.user.id)
    .eq("stores.slug", slug)
    .maybeSingle();
  if (membershipError || !membership || !allowedRoles.includes(membership.role)) {
    throw new Error("الحساب مسجّل لكن لا يملك دور هذه الصفحة. استخدم فتح لوحة العمل بالحساب الحالي للتوجيه حسب صلاحيتك.");
  }
  return membership;
}

export async function hasStoreAccess(slug: string, roles: string[]) {
  if (isMockMode) return roles.some((role) => sessionStorage.getItem(demoKey(slug, role)) === "1");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("store_members")
    .select("role, stores!inner(slug)")
    .eq("user_id", user.id)
    .eq("stores.slug", slug)
    .maybeSingle();
  return Boolean(data && roles.includes(data.role));
}

export async function signOutStore() {
  if (isMockMode) sessionStorage.clear();
  else await supabase.auth.signOut();
}

const platformDemoKey = "demo_access:platform:owner";

export async function signInPlatform(email: string, password: string) {
  if (isMockMode) {
    if (email !== "owner@platform.local" || password !== "12345678") {
      throw new Error("بيانات دخول مالك المنصة غير صحيحة");
    }
    sessionStorage.setItem(platformDemoKey, "1");
    return true;
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!platformAdmin) {
    await supabase.auth.signOut();
    throw new Error("هذا الحساب غير مصرح له بإدارة المنصة");
  }
  return true;
}

export async function hasPlatformAccess() {
  if (isMockMode) return sessionStorage.getItem(platformDemoKey) === "1";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return Boolean(data);
}
