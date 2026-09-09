/* eslint-disable @typescript-eslint/no-explicit-any -- Generic CRUD values span multiple database entities. */
import { useCallback, useEffect, useState } from "react";
import { hasStoreAccess } from "../lib/access";
import { isMockMode, supabase } from "../lib/supabase";
import { readDemoData, writeDemo } from "../lib/storeDefaults";
import { resolvePlan } from "../lib/plans";

const tables = {
  categories: "categories",
  products: "products",
  offers: "offers",
  banners: "banners",
  addons: "addons",
};

export function useAdminData(storeSlug: string) {
  const [state, setState] = useState<any>({
    store: null,
    categories: [],
    products: [],
    offers: [],
    addons: [],
    banners: [],
    orders: [],
    appearance: {},
    settings: {},
    payment: {},
    organization: null,
    subscription: null,
    branches: [],
    team: [],
    invoices: [],
    subscriptionAddons: [],
    paymentTransactions: [],
    incidents: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      if (!(await hasStoreAccess(storeSlug, ["admin"]))) throw new Error("AUTH_REQUIRED");
      if (isMockMode) {
        setState(readDemoData());
        return;
      }
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", storeSlug)
        .maybeSingle();
      if (storeError) throw storeError;
      if (!store) throw new Error("المطعم غير موجود");
      const results = await Promise.all([
        supabase.from("categories").select("*").eq("store_id", store.id).order("display_order"),
        supabase
          .from("products")
          .select("*")
          .eq("store_id", store.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("offers")
          .select("*")
          .eq("store_id", store.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("addons")
          .select("*")
          .eq("store_id", store.id)
          .order("created_at", { ascending: false }),
        supabase.from("banners").select("*").eq("store_id", store.id).order("display_order"),
        supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("store_id", store.id)
          .order("created_at", { ascending: false }),
        supabase.from("organizations").select("*").eq("id", store.organization_id).maybeSingle(),
        supabase
          .from("subscriptions")
          .select("*, plans(*)")
          .eq("organization_id", store.organization_id)
          .maybeSingle(),
        supabase
          .from("stores")
          .select("*")
          .eq("organization_id", store.organization_id)
          .order("created_at"),
        supabase
          .from("staff_invitations")
          .select("*")
          .eq("organization_id", store.organization_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("billing_invoices")
          .select("*")
          .eq("organization_id", store.organization_id)
          .order("issued_at", { ascending: false }),
        supabase
          .from("subscription_addons")
          .select("*")
          .eq("organization_id", store.organization_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("payment_transactions")
          .select("*")
          .eq("store_id", store.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("system_incidents")
          .select("*")
          .eq("store_id", store.id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      setState({
        store,
        categories: results[0].data || [],
        products: results[1].data || [],
        offers: results[2].data || [],
        addons: results[3].data || [],
        banners: results[4].data || [],
        orders: results[5].data || [],
        appearance: store.appearance || {},
        settings: store.settings || {},
        payment: store.payment || {},
        organization: results[6].data,
        subscription: results[7].data,
        branches: results[8].data || [],
        team: results[9].data || [],
        invoices: results[10].data || [],
        subscriptionAddons: results[11].data || [],
        paymentTransactions: results[12].data || [],
        incidents: results[13].data || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل لوحة الإدارة");
    } finally {
      setLoading(false);
    }
  }, [storeSlug]);
  useEffect(() => {
    load();
    const listener = () => {
      load(true);
    };
    window.addEventListener("storage", listener);
    window.addEventListener('focus',listener);
    const timer=window.setInterval(listener,60000);
    return () => {window.removeEventListener("storage", listener);window.removeEventListener('focus',listener);window.clearInterval(timer);};
  }, [load]);
  useEffect(() => {
    if (isMockMode || !state.store?.id) return;
    const channel = supabase
      .channel(`admin-orders-${state.store.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${state.store.id}` },
        () => load(true),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.store?.id, load]);
  const setPart = (key: string) => (value: any) =>
    setState((prev: any) => ({
      ...prev,
      [key]: typeof value === "function" ? value(prev[key]) : value,
    }));
  const updateStore = async (updates: any) => {
    if (isMockMode) {
      const store = { ...state.store, ...updates };
      writeDemo("store", store);
      const branches = (state.branches || []).map((branch) =>
        branch.id === store.id ? store : branch,
      );
      writeDemo("branches", branches);
      const platformStores = readDemoData().platformStores.map((branch: any) =>
        branch.id === store.id ? store : branch,
      );
      writeDemo("platformStores", platformStores);
      setState((p) => ({ ...p, store, branches }));
      return true;
    }
    const { data, error: saveError } = await supabase
      .from("stores")
      .update(updates)
      .eq("id", state.store.id)
      .select()
      .single();
    if (saveError) throw saveError;
    if (Object.prototype.hasOwnProperty.call(updates, "custom_domain")) {
      const hostname = String(updates.custom_domain || "")
        .trim()
        .toLowerCase();
      if (hostname) {
        const { error: domainError } = await supabase.from("custom_domains").upsert(
          {
            organization_id: state.store.organization_id,
            store_id: state.store.id,
            hostname,
            status: "pending",
          },
          { onConflict: "store_id" },
        );
        if (domainError) throw domainError;
      } else {
        const { error: domainError } = await supabase
          .from("custom_domains")
          .delete()
          .eq("store_id", state.store.id);
        if (domainError) throw domainError;
      }
    }
    setState((p) => ({ ...p, store: data }));
    return true;
  };
  const saveStoreSection = async (section: string, value: any) => {
    await updateStore({
      [section]: value,
      ...(section === "payment" && value.currency ? { currency: value.currency } : {}),
    });
    setState((p: any) => ({ ...p, [section]: value }));
    if (isMockMode) writeDemo(section as any, value);
  };
  const saveEntity = async (collection: keyof typeof tables, entity: any) => {
    if (isMockMode) {
      const current = state[collection] || [];
      const saved = { ...entity, id: entity.id || `${collection}-${Date.now()}` };
      const next = current.some((x) => x.id === saved.id)
        ? current.map((x) => (x.id === saved.id ? saved : x))
        : [saved, ...current];
      writeDemo(collection, next);
      setState((p) => ({ ...p, [collection]: next }));
      return saved;
    }
    const payload = { ...entity, store_id: state.store.id };
    if (!entity.id || !/^[0-9a-f-]{36}$/i.test(entity.id)) delete payload.id;
    const { data, error: saveError } = await supabase
      .from(tables[collection])
      .upsert(payload)
      .select()
      .single();
    if (saveError) throw saveError;
    await load(true);
    return data;
  };
  const deleteEntity = async (collection: keyof typeof tables, id: string) => {
    if (!window.confirm('هل تريد حذف هذا العنصر؟ لا يمكن التراجع عن الحذف من هذه الشاشة.')) return;
    if (isMockMode) {
      const next = (state[collection] || []).filter((x) => x.id !== id);
      writeDemo(collection, next);
      setState((p) => ({ ...p, [collection]: next }));
      return;
    }
    const { error: deleteError } = await supabase
      .from(tables[collection])
      .delete()
      .eq("id", id)
      .eq("store_id", state.store.id);
    if (deleteError) throw deleteError;
    await load(true);
  };
  const importProducts = async (products: any[]) => {
    if (!products.length) return 0;
    if (isMockMode) {
      const imported = products.map((product, index) => ({
        ...product,
        id: `product-import-${Date.now()}-${index}`,
      }));
      const next = [...imported, ...(state.products || [])];
      writeDemo("products", next);
      setState((current: any) => ({ ...current, products: next }));
      return imported.length;
    }
    const payload = products.map((product) => ({ ...product, store_id: state.store.id }));
    const { data, error: importError } = await supabase
      .from("products")
      .insert(payload)
      .select("id");
    if (importError) throw importError;
    await load(true);
    return data?.length || 0;
  };
  const saveBranch = async (branch: any) => {
    const payload = {
      id: branch.id,
      organization_id: state.store.organization_id,
      name: branch.name || state.store.name,
      branch_name: branch.branch_name || branch.name,
      slug: branch.slug,
      bio: branch.bio ?? state.store.bio,
      phone_whatsapp: branch.phone_whatsapp || state.store.phone_whatsapp,
      currency: branch.currency || state.store.currency,
      is_active: branch.is_active !== false,
      logo_url: branch.logo_url ?? state.store.logo_url,
      cover_url: branch.cover_url ?? state.store.cover_url,
      timezone: branch.timezone || state.store.timezone || "Asia/Riyadh",
      social_links: branch.social_links ?? state.store.social_links ?? {},
      working_hours: branch.working_hours ?? state.store.working_hours ?? [],
      appearance: branch.appearance ?? state.store.appearance ?? {},
      settings: branch.settings ?? state.store.settings ?? {},
      payment: branch.payment ?? state.store.payment ?? {},
      custom_domain: branch.custom_domain || null,
      white_label: branch.white_label ?? state.store.white_label ?? {},
      legal: branch.legal ?? state.store.legal ?? {},
      onboarding: branch.onboarding ?? {},
    };
    if (isMockMode) {
      const saved = { ...payload, id: branch.id || `demo-branch-${Date.now()}` };
      const branches = state.branches.some((item: any) => item.id === saved.id)
        ? state.branches.map((item: any) => (item.id === saved.id ? saved : item))
        : [...state.branches, saved];
      writeDemo("branches", branches);
      const platformStores = readDemoData().platformStores.some((item: any) => item.id === saved.id)
        ? readDemoData().platformStores.map((item: any) => (item.id === saved.id ? saved : item))
        : [...readDemoData().platformStores, saved];
      writeDemo("platformStores", platformStores);
      setState((current: any) => ({ ...current, branches }));
      return saved;
    }
    if (!branch.id) delete payload.id;
    const { data, error: saveError } = await supabase
      .from("stores")
      .upsert(payload)
      .select()
      .single();
    if (saveError) throw saveError;
    await load(true);
    return data;
  };
  const deleteBranch = async (id: string) => {
    if (id === state.store.id) throw new Error("لا يمكن حذف الفرع المفتوح حاليًا");
    if (isMockMode) {
      const branches = state.branches.filter((branch: any) => branch.id !== id);
      writeDemo("branches", branches);
      writeDemo(
        "platformStores",
        readDemoData().platformStores.filter((branch: any) => branch.id !== id),
      );
      setState((current: any) => ({ ...current, branches }));
      return;
    }
    const { error: deleteError } = await supabase
      .from("stores")
      .delete()
      .eq("id", id)
      .eq("organization_id", state.store.organization_id);
    if (deleteError) throw deleteError;
    await load(true);
  };
  const inviteTeamMember = async (invitation: any) => {
    const saved = {
      id: invitation.id || `invite-${Date.now()}`,
      organization_id: state.store.organization_id,
      store_id: invitation.store_id || state.store.id,
      email: invitation.email.trim().toLowerCase(),
      role: invitation.role,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    if (isMockMode) {
      const team = [saved, ...state.team];
      writeDemo("team", team);
      setState((current: any) => ({ ...current, team }));
      return saved;
    }
    delete saved.id;
    const { data, error: inviteError } = await supabase.rpc('create_staff_invitation', {p_store_id:saved.store_id,p_email:saved.email,p_role:saved.role});
    if (inviteError) throw inviteError;
    await load(true);
    return data;
  };
  const removeTeamInvitation = async (id: string) => {
    if (isMockMode) {
      const team = state.team.filter((member: any) => member.id !== id);
      writeDemo("team", team);
      setState((current: any) => ({ ...current, team }));
      return;
    }
    const { error: removeError } = await supabase
      .from("staff_invitations")
      .delete()
      .eq("id", id)
      .eq("organization_id", state.store.organization_id);
    if (removeError) throw removeError;
    await load(true);
  };
  const toggleSubscriptionAddon = async (addon: any) => {
    const existing = (state.subscriptionAddons || []).find((item: any) => item.code === addon.code);
    if (isMockMode) {
      const saved = existing
        ? { ...existing, active: !existing.active }
        : { ...addon, id: `subscription-addon-${Date.now()}`, active: true };
      const next = existing
        ? state.subscriptionAddons.map((item: any) => (item.id === existing.id ? saved : item))
        : [saved, ...state.subscriptionAddons];
      writeDemo("subscriptionAddons", next);
      setState((current: any) => ({ ...current, subscriptionAddons: next }));
      return;
    }
    const payload = {
      organization_id: state.store.organization_id,
      code: addon.code,
      name: addon.name,
      price: addon.price,
      active: existing ? !existing.active : true,
    };
    const query = existing
      ? supabase.from("subscription_addons").update(payload).eq("id", existing.id)
      : supabase.from("subscription_addons").insert(payload);
    const { error: addonError } = await query;
    if (addonError) throw addonError;
    await load(true);
  };
  const resolveIncident = async (id: string) => {
    if (isMockMode) {
      setState((current: any) => ({
        ...current,
        incidents: current.incidents.map((incident: any) =>
          incident.id === id ? { ...incident, resolved_at: new Date().toISOString() } : incident,
        ),
      }));
      return;
    }
    const { error: incidentError } = await supabase
      .from("system_incidents")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", id)
      .eq("store_id", state.store.id);
    if (incidentError) throw incidentError;
    await load(true);
  };
  const planId = state.subscription?.plans?.code || state.subscription?.plan_id || "starter";
  const plan = resolvePlan(planId);
  return {
    ...state,
    loading,
    error,
    reload: load,
    updateStore,
    saveStoreSection,
    saveEntity,
    deleteEntity,
    importProducts,
    saveBranch,
    deleteBranch,
    inviteTeamMember,
    removeTeamInvitation,
    toggleSubscriptionAddon,
    resolveIncident,
    plan,
    features: !isMockMode && !['active','trial'].includes(state.subscription?.status) ? [] : (state.subscription?.plans?.features || plan.features),
    setCategories: setPart("categories"),
    setProducts: setPart("products"),
    setOffers: setPart("offers"),
    setAddons: setPart("addons"),
    setBanners: setPart("banners"),
    setOrders: setPart("orders"),
    setAppearance: setPart("appearance"),
    setSettings: setPart("settings"),
    setPayment: setPart("payment"),
  };
}
