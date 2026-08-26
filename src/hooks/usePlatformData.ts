/* eslint-disable @typescript-eslint/no-explicit-any -- Platform rows span configurable SaaS entities. */
import { useCallback, useEffect, useState } from "react";
import { hasPlatformAccess } from "../lib/access";
import { PLAN_CATALOG } from "../lib/plans";
import {
  defaultBranches,
  defaultOrganization,
  defaultSubscription,
  readDemoData,
  writeDemo,
} from "../lib/storeDefaults";
import { isMockMode, supabase } from "../lib/supabase";

const initialState = {
  organizations: [] as any[],
  stores: [] as any[],
  subscriptions: [] as any[],
  plans: Object.values(PLAN_CATALOG) as any[],
  invoices: [] as any[],
};

export function usePlatformData(enabled: boolean) {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      if (!(await hasPlatformAccess())) throw new Error("AUTH_REQUIRED");
      if (isMockMode) {
        const demo = readDemoData();
        setState({
          organizations: demo.platformOrganizations || [demo.organization || defaultOrganization],
          stores: demo.platformStores || defaultBranches,
          subscriptions: demo.platformSubscriptions || [demo.subscription || defaultSubscription],
          plans: Object.values(PLAN_CATALOG),
          invoices: demo.invoices || [],
        });
        return;
      }
      const [organizations, stores, subscriptions, plans, invoices] = await Promise.all([
        supabase.from("organizations").select("*").order("created_at", { ascending: false }),
        supabase.from("stores").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*, plans(*)"),
        supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("billing_invoices").select("*").order("issued_at", { ascending: false }),
      ]);
      const failed = [organizations, stores, subscriptions, plans, invoices].find(
        (result) => result.error,
      );
      if (failed?.error) throw failed.error;
      setState({
        organizations: organizations.data || [],
        stores: stores.data || [],
        subscriptions: subscriptions.data || [],
        plans: plans.data || [],
        invoices: invoices.data || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل لوحة المنصة");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStore = async (store: any) => {
    const is_active = !store.is_active;
    if (isMockMode) {
      const stores = state.stores.map((item) =>
        item.id === store.id ? { ...item, is_active } : item,
      );
      writeDemo("platformStores", stores);
      setState((current) => ({ ...current, stores }));
      return;
    }
    const { error: updateError } = await supabase
      .from("stores")
      .update({ is_active })
      .eq("id", store.id);
    if (updateError) throw updateError;
    await load();
  };

  const changePlan = async (organizationId: string, planCode: string) => {
    if (isMockMode) {
      const subscription = {
        ...(state.subscriptions[0] || defaultSubscription),
        organization_id: organizationId,
        plan_id: planCode,
      };
      if (organizationId === defaultOrganization.id) writeDemo("subscription", subscription);
      const subscriptions = state.subscriptions.some(
        (item) => item.organization_id === organizationId,
      )
        ? state.subscriptions.map((item) =>
            item.organization_id === organizationId ? subscription : item,
          )
        : [...state.subscriptions, subscription];
      writeDemo("platformSubscriptions", subscriptions);
      setState((current) => ({ ...current, subscriptions }));
      return;
    }
    const plan = state.plans.find((item) => item.code === planCode || item.id === planCode);
    if (!plan) throw new Error("الباقة غير موجودة");
    const { error: updateError } = await supabase
      .from("subscriptions")
      .upsert(
        { organization_id: organizationId, plan_id: plan.id, status: "active" },
        { onConflict: "organization_id" },
      );
    if (updateError) throw updateError;
    await load();
  };

  const createOrganization = async (input: any) => {
    const trialEndsAt =
      input.current_period_end || new Date(Date.now() + 14 * 86400000).toISOString();
    if (isMockMode) {
      const organization = {
        id: `organization-${Date.now()}`,
        name: input.name,
        legal_name: input.legal_name || input.name,
        owner_email: input.owner_email,
        status: "trial",
        created_at: new Date().toISOString(),
      };
      const store = {
        ...defaultBranches[0],
        id: `store-${Date.now()}`,
        organization_id: organization.id,
        name: input.name,
        branch_name: input.branch_name || "الفرع الرئيسي",
        slug: input.slug,
        phone_whatsapp: input.phone_whatsapp,
        is_active: true,
      };
      const subscription = {
        id: `subscription-${Date.now()}`,
        organization_id: organization.id,
        plan_id: input.plan_id,
        status: "trial",
        current_period_end: trialEndsAt,
      };
      const organizations = [...state.organizations, organization];
      const stores = [...state.stores, store];
      const subscriptions = [...state.subscriptions, subscription];
      writeDemo("platformOrganizations", organizations);
      writeDemo("platformStores", stores);
      writeDemo("platformSubscriptions", subscriptions);
      setState((current) => ({ ...current, organizations, stores, subscriptions }));
      return organization;
    }
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .insert({
        name: input.name,
        legal_name: input.legal_name || input.name,
        owner_email: input.owner_email,
        status: "trial",
      })
      .select()
      .single();
    if (organizationError) throw organizationError;
    const plan = state.plans.find((item) => item.code === input.plan_id);
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .insert({
        organization_id: organization.id,
        name: input.name,
        branch_name: input.branch_name || "الفرع الرئيسي",
        slug: input.slug,
        phone_whatsapp: input.phone_whatsapp,
        currency: "SAR",
      })
      .select()
      .single();
    if (storeError) throw storeError;
    const { error: subscriptionError } = await supabase.from("subscriptions").insert({
      organization_id: organization.id,
      plan_id: plan.id,
      status: "trial",
      current_period_end: trialEndsAt,
    });
    if (subscriptionError) throw subscriptionError;
    const { error: invitationError } = await supabase.from("staff_invitations").insert({
      organization_id: organization.id,
      store_id: store.id,
      email: input.owner_email,
      role: "admin",
    });
    if (invitationError) throw invitationError;
    await load();
    return organization;
  };
  const issueInvoice = async (organizationId: string) => {
    const subscription = state.subscriptions.find(
      (item) => item.organization_id === organizationId,
    );
    const plan =
      PLAN_CATALOG[
        (subscription?.plans?.code ||
          subscription?.plan_id ||
          "starter") as keyof typeof PLAN_CATALOG
      ] || PLAN_CATALOG.starter;
    const invoice = {
      id: `invoice-${Date.now()}`,
      organization_id: organizationId,
      number: `INV-${Date.now().toString().slice(-8)}`,
      amount: plan.monthlyPrice,
      currency: "SAR",
      status: "open",
      issued_at: new Date().toISOString().slice(0, 10),
      due_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    };
    if (isMockMode) {
      const invoices = [invoice, ...state.invoices];
      writeDemo("invoices", invoices);
      setState((current) => ({ ...current, invoices }));
      return;
    }
    const { id, ...payload } = invoice;
    const { error: invoiceError } = await supabase.from("billing_invoices").insert(payload);
    if (invoiceError) throw invoiceError;
    await load();
  };

  return {
    ...state,
    loading,
    error,
    reload: load,
    toggleStore,
    changePlan,
    createOrganization,
    issueInvoice,
  };
}
