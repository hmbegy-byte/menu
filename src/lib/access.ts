import { isMockMode, supabase, kitchenSupabase } from "./supabase";

const unlockedAdmins = new Set<string>();
export const isAdminUnlocked = (slug: string) => unlockedAdmins.has(slug);
export const lockAdmin = (slug: string) => unlockedAdmins.delete(slug);

const demoKey = (slug: string, role: string) => `demo_access:${slug}:${role}`;

export const normalizeStoreSlug = (value: string) => value.trim().toLowerCase();
export const normalizeStaffUsername = (value: string) => value.trim().toLowerCase();

export async function signInToStore(
  slug: string,
  email: string,
  password: string,
  allowedRoles: string[],
) {
  const normalizedSlug = normalizeStoreSlug(slug);
  const normalizedUsername = normalizeStaffUsername(email);
  const client = allowedRoles[0] === "kitchen" ? kitchenSupabase : supabase;
  if (isMockMode) {
    if (
      normalizedSlug !== "demo" ||
      normalizedUsername !== "demo@restaurant.local" ||
      password !== "12345678"
    ) {
      throw new Error("بيانات الدخول التجريبية غير صحيحة");
    }
    const role = allowedRoles[0];
    if (!role) throw new Error("لم تحدد صلاحية للدخول");
    sessionStorage.setItem(demoKey(normalizedSlug, role), "1");
    if (allowedRoles[0] === "admin") unlockedAdmins.add(normalizedSlug);
    return { role };
  }
  if (
    !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizedUsername) ||
    !/^[a-z0-9][a-z0-9-]*$/.test(normalizedSlug)
  )
    throw new Error("أدخل اسم المستخدم ومعرّف المطعم الصحيحين، وليس البريد الإلكتروني");
  const loginEmail = `${normalizedUsername}.${normalizedSlug}@staff.flavor-flow.invalid`;
  const { data, error } = await client.auth.signInWithPassword({ email: loginEmail, password });
  if (error || !data.user) throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
  if (data.user.app_metadata?.["staff_password_pending"])
    return { needsPasswordChange: true, role: "" };
  const { data: membership, error: membershipError } = await client
    .from("store_members")
    .select("role, stores!inner(id, slug)")
    .eq("user_id", data.user.id)
    .eq("stores.slug", normalizedSlug)
    .maybeSingle();
  if (membershipError || !membership || !allowedRoles.includes(membership.role)) {
    await client.auth.signOut({ scope: "local" });
    throw new Error("لا يملك الحساب صلاحية دخول هذه الصفحة في المطعم المحدد");
  }
  if (allowedRoles[0] === "admin") unlockedAdmins.add(normalizedSlug);
  return membership;
}

export async function hasStoreAccess(slug: string, roles: string[], client = supabase) {
  const normalizedSlug = normalizeStoreSlug(slug);
  if (isMockMode)
    return roles.some((role) => sessionStorage.getItem(demoKey(normalizedSlug, role)) === "1");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return false;
  const { data } = await client
    .from("store_members")
    .select("role, stores!inner(slug)")
    .eq("user_id", user.id)
    .eq("stores.slug", normalizedSlug)
    .maybeSingle();
  return Boolean(data && roles.includes(data.role));
}

export async function signOutStore(kitchen = false) {
  if (!kitchen) unlockedAdmins.clear();
  if (isMockMode) sessionStorage.clear();
  else await (kitchen ? kitchenSupabase : supabase).auth.signOut({ scope: "local" });
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
