/* eslint-disable @typescript-eslint/no-explicit-any -- Demo storage accepts every configurable entity shape. */
export const defaultStore = {
  id: "demo-id",
  organization_id: "demo-organization",
  branch_name: "الفرع الرئيسي",
  name: "مطعم تجريبي",
  bio: "اكتشف قائمتنا واطلب بسهولة.",
  slug: "demo",
  phone_whatsapp: "+966500000000",
  currency: "SAR",
  is_active: true,
  cover_url: "",
  logo_url: "",
  social_links: {},
  working_hours: [],
  appearance: { primaryColor: "#2563eb", theme: "light" },
  settings: {
    acceptingOrders: true,
    taxPercent: 0,
    minOrderValue: 0,
    pickupEtaMinutes: 20,
    deliveryEnabled: true,
    dineInEnabled: true,
    kitchenWarningMinutes: 15,
    kitchenLateMinutes: 25,
    maxOrdersPer15Minutes: 12,
    pausedUntil: null,
    pauseReason: "",
    menuTagline: "",
    deliveryZones: [
      { id: "zone-center", name: "داخل الحي", fee: 8, minOrder: 30, etaMinutes: 35, active: true },
      {
        id: "zone-city",
        name: "باقي المدينة",
        fee: 15,
        minOrder: 50,
        etaMinutes: 50,
        active: true,
      },
    ],
    whatsappMessageTemplate: "",
    curbsideEnabled: false,
    googleReviewEnabled: false,
    googleReviewUrl: "",
    orderBoardEnabled: false,
    expensesEnabled: false,
    inventoryEnabled: false,
    profitabilityEnabled: false,
    defaultPaymentFee: 0,
    defaultDeliveryFulfillmentCost: 0,
    defaultCommissionPercent: 0,
  },
  payment: {
    currency: "SAR",
    cashOnDelivery: true,
    bankTransfer: false,
    bankAccountDetails: "",
    paymentProvider: "moyasar",
    providerConnected: false,
    applePayEnabled: false,
    merchantProfileId: "",
  },
  custom_domain: "",
  white_label: { hidePlatformBrand: true, supportEmail: "", supportPhone: "" },
  legal: {
    country: "SA",
    legalName: "مؤسسة المطعم التجريبي",
    commercialRegistration: "",
    vatNumber: "",
    nationalAddress: "",
    supportEmail: "",
    complaintPhone: "+966500000000",
    privacyEmail: "",
  },
  onboarding: { profile: true, menu: true, hours: false, payment: false, publish: true },
};

export const defaultOrganization = {
  id: "demo-organization",
  name: "مطعم تجريبي",
  legal_name: "مؤسسة المطعم التجريبي",
  status: "active",
  owner_email: "demo@restaurant.local",
  created_at: new Date().toISOString(),
};

export const defaultSubscription = {
  id: "demo-subscription",
  organization_id: defaultOrganization.id,
  plan_id: "pro",
  status: "active",
  current_period_end: "2027-08-26",
};

export const defaultBranches = [defaultStore];
export const defaultTeam = [
  {
    id: "demo-member",
    email: "demo@restaurant.local",
    role: "admin",
    status: "active",
    store_id: defaultStore.id,
  },
  {
    id: "demo-kitchen",
    email: "kitchen@restaurant.local",
    role: "kitchen",
    status: "active",
    store_id: defaultStore.id,
  },
];

export const defaultCategories = [
  {
    id: "c1",
    name: "وجبات رئيسية",
    description: "الأطباق الرئيسية",
    display_order: 1,
    is_active: true,
  },
  { id: "c2", name: "مقبلات", description: "المقبلات والسلطات", display_order: 2, is_active: true },
];

export const defaultProducts = [
  {
    id: "p1",
    category_id: "c1",
    name: "صنف تجريبي",
    price: 55,
    description: "وصف مختصر يضيفه المطعم لهذا الصنف.",
    image_url: "",
    is_available: true,
    options: [],
  },
  {
    id: "p2",
    category_id: "c1",
    name: "صنف بخيارات",
    price: 70,
    description: "مثال محايد لاختبار عرض المنتجات.",
    image_url: "",
    is_available: true,
    options: [
      {
        id: "demo-size",
        title: "الحجم",
        required: true,
        multiple: false,
        min_selections: 1,
        max_selections: 1,
        choices: [
          { id: "demo-regular", name: "عادي", extra_price: 0, is_available: true },
          { id: "demo-large", name: "كبير", extra_price: 5, is_available: true },
        ],
      },
    ],
  },
];

export const defaultOffers = [];
export const defaultAddons = [];
export const defaultBanners = [];
export const defaultInvoices = [
  {
    id: "invoice-demo-1",
    number: "INV-1001",
    amount: 299,
    currency: "SAR",
    status: "paid",
    issued_at: "2026-08-01",
    due_at: "2026-08-01",
  },
];
export const defaultSubscriptionAddons = [
  { id: "addon-delivery", code: "delivery_plus", name: "التوصيل المتقدم", price: 49, active: true },
];
export const defaultPaymentTransactions = [];
export const defaultIncidents = [];
export const defaultLoyaltyProgram = {
  id: "demo-loyalty-program",
  organization_id: defaultOrganization.id,
  is_active: true,
  program_type: "hybrid",
  points_name: "نقاط",
  stamps_name: "أختام",
  min_order_amount: 25,
  allow_staff_adjustments: true,
};
export const defaultLoyaltyRules = [
  {
    id: "demo-loyalty-rule",
    organization_id: defaultOrganization.id,
    is_active: true,
    rule_type: "points_per_currency",
    currency_type: "points",
    reward_value: 1,
    min_amount: 25,
    conditions: { title: "نقطة لكل ريال" },
    valid_from: null,
    valid_until: null,
  },
];
export const defaultLoyaltyRewards = [
  {
    id: "demo-loyalty-reward",
    organization_id: defaultOrganization.id,
    is_active: true,
    reward_type: "free_item",
    reward_value: 1,
    points_cost: 100,
    stamps_cost: 0,
    conditions: { title: "صنف مجاني", product_id: "p1" },
    valid_from: null,
    valid_until: null,
  },
];
export const defaultLoyaltyCustomers = [];

export const demoStorageKeys = {
  store: "demo_store",
  categories: "demo_categories",
  products: "demo_products",
  offers: "demo_offers",
  addons: "demo_addons",
  banners: "demo_banners",
  orders: "demo_orders",
  appearance: "demo_appearance",
  settings: "demo_settings",
  payment: "demo_payment",
  organization: "demo_organization",
  subscription: "demo_subscription",
  branches: "demo_branches",
  team: "demo_team",
  invoices: "demo_invoices",
  subscriptionAddons: "demo_subscription_addons",
  paymentTransactions: "demo_payment_transactions",
  incidents: "demo_system_incidents",
  platformOrganizations: "demo_platform_organizations",
  platformSubscriptions: "demo_platform_subscriptions",
  platformStores: "demo_platform_stores",
  loyaltyProgram: "demo_loyalty_program",
  loyaltyRules: "demo_loyalty_rules",
  loyaltyRewards: "demo_loyalty_rewards",
  loyaltyCustomers: "demo_loyalty_customers",
};

export function readDemoData() {
  const read = (key: string, fallback: any) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "") || fallback;
    } catch {
      return fallback;
    }
  };
  const store = read(demoStorageKeys.store, defaultStore);
  return {
    store,
    categories: read(demoStorageKeys.categories, defaultCategories),
    products: read(demoStorageKeys.products, defaultProducts),
    offers: read(demoStorageKeys.offers, defaultOffers),
    addons: read(demoStorageKeys.addons, defaultAddons),
    banners: read(demoStorageKeys.banners, defaultBanners),
    orders: read(demoStorageKeys.orders, []),
    appearance: read(demoStorageKeys.appearance, store.appearance || defaultStore.appearance),
    settings: read(demoStorageKeys.settings, store.settings || defaultStore.settings),
    payment: read(demoStorageKeys.payment, store.payment || defaultStore.payment),
    organization: read(demoStorageKeys.organization, defaultOrganization),
    subscription: read(demoStorageKeys.subscription, defaultSubscription),
    branches: read(demoStorageKeys.branches, defaultBranches),
    team: read(demoStorageKeys.team, defaultTeam),
    invoices: read(demoStorageKeys.invoices, defaultInvoices),
    subscriptionAddons: read(demoStorageKeys.subscriptionAddons, defaultSubscriptionAddons),
    paymentTransactions: read(demoStorageKeys.paymentTransactions, defaultPaymentTransactions),
    incidents: read(demoStorageKeys.incidents, defaultIncidents),
    platformOrganizations: read(demoStorageKeys.platformOrganizations, [defaultOrganization]),
    platformSubscriptions: read(demoStorageKeys.platformSubscriptions, [defaultSubscription]),
    platformStores: read(demoStorageKeys.platformStores, defaultBranches),
    loyaltyProgram: read(demoStorageKeys.loyaltyProgram, defaultLoyaltyProgram),
    loyaltyRules: read(demoStorageKeys.loyaltyRules, defaultLoyaltyRules),
    loyaltyRewards: read(demoStorageKeys.loyaltyRewards, defaultLoyaltyRewards),
    loyaltyCustomers: read(demoStorageKeys.loyaltyCustomers, defaultLoyaltyCustomers),
  };
}

export function writeDemo(key: keyof typeof demoStorageKeys, value: any) {
  localStorage.setItem(demoStorageKeys[key], JSON.stringify(value));
  window.dispatchEvent(new StorageEvent("storage", { key: demoStorageKeys[key] }));
}
