export const PLAN_CATALOG = {
  starter: {
    id: "starter",
    name: "البداية",
    description: "لإطلاق القائمة الرقمية والطلبات بسرعة.",
    monthlyPrice: 99,
    features: ["digital_menu", "qr", "orders", "whatsapp", "basic_reports"],
    limits: { branches: 1, staff: 3, products: 100 },
  },
  growth: {
    id: "growth",
    name: "النمو",
    description: "للمطاعم التي تحتاج المطبخ والدفع والتسويق.",
    monthlyPrice: 199,
    features: [
      "digital_menu",
      "qr",
      "orders",
      "whatsapp",
      "basic_reports",
      "kitchen",
      "online_payment",
      "delivery",
      "coupons",
      "advanced_reports",
    ],
    limits: { branches: 2, staff: 10, products: 500 },
  },
  pro: {
    id: "pro",
    name: "الاحترافية",
    description: "للعلامات متعددة الفروع والهوية المستقلة.",
    monthlyPrice: 399,
    features: [
      "digital_menu",
      "qr",
      "orders",
      "whatsapp",
      "basic_reports",
      "kitchen",
      "online_payment",
      "delivery",
      "coupons",
      "advanced_reports",
      "multi_branch",
      "custom_domain",
      "white_label",
      "loyalty",
      "integrations",
      "custom_roles",
    ],
    limits: { branches: 20, staff: 100, products: 5000 },
  },
} as const;

export type PlanId = keyof typeof PLAN_CATALOG;

export const FEATURE_LABELS: Record<string, string> = {
  digital_menu: "القائمة الرقمية",
  qr: "رمز QR",
  orders: "الطلبات الإلكترونية",
  whatsapp: "واتساب",
  basic_reports: "التقارير الأساسية",
  kitchen: "شاشة المطبخ",
  online_payment: "الدفع الإلكتروني",
  delivery: "التوصيل ومناطقه",
  coupons: "العروض والكوبونات",
  advanced_reports: "التقارير المتقدمة",
  multi_branch: "تعدد الفروع",
  custom_domain: "النطاق الخاص",
  white_label: "إخفاء هوية المنصة",
  loyalty: "الولاء والنقاط",
  integrations: "التكاملات",
  custom_roles: "الصلاحيات المخصصة",
};

export function resolvePlan(planId?: string | null) {
  return PLAN_CATALOG[(planId as PlanId) || "starter"] || PLAN_CATALOG.starter;
}

export function hasPlanFeature(planId: string | null | undefined, feature: string) {
  return (resolvePlan(planId).features as readonly string[]).includes(feature);
}
