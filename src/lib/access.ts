import { isMockMode, supabase, kitchenSupabase } from "./supabase";
import { resolveCurrentStoreSlug } from "./platformBrand";

const unlockedAdmins = new Set<string>();
export const isAdminUnlocked = (slug: string) => unlockedAdmins.has(slug);
export const lockAdmin = (slug: string) => unlockedAdmins.delete(slug);
export const unlockAdmin = (slug: string) => unlockedAdmins.add(normalizeStoreSlug(slug));

const demoKey = (slug: string, role: string) => `demo_access:${slug}:${role}`;

export const normalizeStoreSlug = (value: string) => value.trim().toLowerCase();
export const normalizeStaffUsername = (value: string) => value.trim().toLowerCase();

export async function signInUnified(slug: string, username: string, password: string) {
  const normalizedSlug = normalizeStoreSlug(slug);
  const normalizedUsername = normalizeStaffUsername(username);
  if (
    !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizedUsername) ||
    !/^[a-z0-9][a-z0-9-]{2,62}$/.test(normalizedSlug)
  )
    throw new Error("بيانات الدخول غير صحيحة");
  if (isMockMode) {
    if (
      normalizedSlug !== "demo" ||
      !["demo", "demo@restaurant.local"].includes(normalizedUsername) ||
      password !== "12345678"
    )
      throw new Error("بيانات الدخول غير صحيحة");
    unlockAdmin(normalizedSlug);
    return { destination: "admin" as const, slug: normalizedSlug, needsPasswordChange: false };
  }
  const { currentSlug } = await resolveCurrentStoreSlug(normalizedSlug);
  const { data: resolvedLogin } = await supabase.rpc("resolve_staff_login", {
    p_slug: currentSlug,
    p_username: normalizedUsername,
  });
  if (typeof resolvedLogin !== "string" || !resolvedLogin)
    throw new Error("بيانات الدخول غير صحيحة");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolvedLogin,
    password,
  });
  if (error || !data.user) throw new Error("بيانات الدخول غير صحيحة");
  const { data: membership } = await supabase
    .from("store_members")
    .select("role, stores!inner(slug)")
    .eq("user_id", data.user.id)
    .eq("stores.slug", currentSlug)
    .maybeSingle();
  if (!membership) {
    await supabase.auth.signOut({ scope: "local" });
    throw new Error("بيانات الدخول غير صحيحة");
  }
  const needsPasswordChange = Boolean(data.user.app_metadata?.["staff_password_pending"]);
  if (membership.role === "kitchen") {
    await supabase.auth.signOut({ scope: "local" });
    const kitchenLogin = await kitchenSupabase.auth.signInWithPassword({
      email: resolvedLogin,
      password,
    });
    if (kitchenLogin.error) throw new Error("بيانات الدخول غير صحيحة");
    return { destination: "kitchen" as const, slug: currentSlug, needsPasswordChange };
  }
  if (["admin", "manager"].includes(membership.role)) {
    unlockAdmin(currentSlug);
    return { destination: "admin" as const, slug: currentSlug, needsPasswordChange };
  }
  if (membership.role === "cashier")
    return { destination: "scanner" as const, slug: currentSlug, needsPasswordChange };
  await supabase.auth.signOut({ scope: "local" });
  throw new Error("بيانات الدخول غير صحيحة");
}

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
  // The visible slug may change, while the managed Auth email intentionally stays
  // immutable. Resolve it by stable store/account IDs so existing staff credentials
  // continue to work through both the current slug and historical aliases.
  const { data: resolvedLogin } = await client.rpc("resolve_staff_login", {
    p_slug: normalizedSlug,
    p_username: normalizedUsername,
  });
  const loginEmail =
    (typeof resolvedLogin === "string" && resolvedLogin) ||
    `${normalizedUsername}.${normalizedSlug}@staff.flavor-flow.invalid`;
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
  if (data && roles.includes(data.role)) return true;
  if (!roles.includes("admin")) return false;
  const { data: store } = await client
    .from("stores")
    .select("organization_id")
    .eq("slug", normalizedSlug)
    .maybeSingle();
  if (!store?.organization_id) return false;
  const { data: organizationAccess } = await client
    .from("organization_members")
    .select("role")
    .eq("organization_id", store.organization_id)
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  return Boolean(organizationAccess);
}

export async function signOutStore(kitchen = false) {
  if (!kitchen) unlockedAdmins.clear();
  if (isMockMode) sessionStorage.clear();
  else await (kitchen ? kitchenSupabase : supabase).auth.signOut({ scope: "local" });
}

const platformDemoKey = "demo_access:platform:owner";

export async function signInPlatform(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (isMockMode) {
    if (normalizedEmail !== "owner@platform.local" || password !== "12345678") {
      throw new Error("بيانات دخول مالك المنصة غير صحيحة");
    }
    sessionStorage.setItem(platformDemoKey, "1");
    return true;
  }
  // A host migration creates a fresh browser origin. Clear only this tab's stale
  // session before authenticating so an old restaurant/customer token cannot
  // interfere with the platform-owner check.
  await supabase.auth.signOut({ scope: "local" });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes("fetch")) {
      throw new Error("تعذر الاتصال بخدمة الدخول. تحقق من الإنترنت ثم حاول مجددًا");
    }
    throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
  }
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
