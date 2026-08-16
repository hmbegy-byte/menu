import grilledFish from "@/assets/sea-grilled-fish.jpg";
import friedShrimp from "@/assets/sea-fried-shrimp.jpg";
import seafoodBowl from "@/assets/sea-seafood-bowl.jpg";
import shrimpWrap from "@/assets/sea-shrimp-wrap.jpg";
import soup from "@/assets/sea-soup.jpg";
import drink from "@/assets/sea-drink.jpg";

export type Option = {
  id: string;
  name: string;
  price: number;
};

export type OptionGroup = {
  id: string;
  title: string;
  subtitle: string;
  multiple: boolean;
  options: Option[];
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  tag?: string;
  groups: OptionGroup[];
};

export const categories = [
  { id: "bowls", name: "الأطباق" },
  { id: "grill", name: "المشاوي" },
  { id: "fried", name: "المقليات" },
  { id: "wraps", name: "الساندويتشات" },
  { id: "soups", name: "الشوربات" },
  { id: "drinks", name: "المشروبات" },
];

const sizeGroup: OptionGroup = {
  id: "size",
  title: "اختر الحجم",
  subtitle: "الخطوة الأساسية — يحدد الكمية",
  multiple: false,
  options: [
    { id: "regular", name: "عادي", price: 0 },
    { id: "large", name: "كبير", price: 12 },
    { id: "family", name: "عائلي", price: 28 },
  ],
};

const methodGroup: OptionGroup = {
  id: "method",
  title: "طريقة الطهي",
  subtitle: "كل طبق يُحضّر طازجًا حسب طلبك",
  multiple: false,
  options: [
    { id: "grilled", name: "مشوي على الفحم", price: 0 },
    { id: "fried", name: "مقلي مقرمش", price: 4 },
    { id: "sayadieh", name: "صيادية بالأرز", price: 9 },
    { id: "spicy", name: "حار على الطريقة الحراق", price: 6 },
  ],
};

const toppingsGroup: OptionGroup = {
  id: "toppings",
  title: "إضافات",
  subtitle: "اختر ما تحب — بدون حدود",
  multiple: true,
  options: [
    { id: "tahini", name: "صلصة الطحينة", price: 3 },
    { id: "garlic", name: "ثومية بالليمون", price: 3 },
    { id: "rice", name: "أرز صيادية إضافي", price: 8 },
    { id: "shrimp", name: "٥ حبات روبيان", price: 15 },
    { id: "calamari", name: "كاليماري مقرمش", price: 13 },
    { id: "salad", name: "سلطة حراق", price: 5 },
  ],
};

const drinkGroup: OptionGroup = {
  id: "size",
  title: "اختر الحجم",
  subtitle: "مثلج وطازج",
  multiple: false,
  options: [
    { id: "medium", name: "وسط", price: 0 },
    { id: "large", name: "كبير", price: 6 },
  ],
};

const drinkExtras: OptionGroup = {
  id: "extras",
  title: "إضافات",
  subtitle: "لمسة أخيرة",
  multiple: true,
  options: [
    { id: "mint", name: "نعناع طازج", price: 2 },
    { id: "ice", name: "ثلج إضافي", price: 0 },
    { id: "lime", name: "ليمون أخضر", price: 2 },
  ],
};

const fullGroups = [sizeGroup, methodGroup, toppingsGroup];

export const menuItems: MenuItem[] = [
  {
    id: "seafood-bowl",
    name: "طبق البحر المشكل",
    description: "روبيان، كاليماري وفيليه هامور على أرز الصيادية مع بهارات البحر",
    price: 68,
    image: seafoodBowl,
    category: "bowls",
    tag: "الأكثر طلبًا",
    groups: fullGroups,
  },
  {
    id: "hamour-bowl",
    name: "طبق هامور بالليمون",
    description: "فيليه هامور طازج مع أرز بالكركم وخضار مشوية",
    price: 74,
    image: grilledFish,
    category: "bowls",
    groups: fullGroups,
  },
  {
    id: "grilled-fish",
    name: "سمك مشوي على الفحم",
    description: "سمك اليوم مشوي بالكامل مع صلصة الحراق وليمون",
    price: 82,
    image: grilledFish,
    category: "grill",
    tag: "طازج اليوم",
    groups: fullGroups,
  },
  {
    id: "grilled-shrimp",
    name: "روبيان مشوي بالثوم",
    description: "روبيان جامبو متبل بالثوم والزبدة على الفحم",
    price: 79,
    image: friedShrimp,
    category: "grill",
    groups: fullGroups,
  },
  {
    id: "fried-shrimp",
    name: "روبيان مقرمش",
    description: "روبيان مغطى بالبقسماط الذهبي مع صوص التارتار",
    price: 59,
    image: friedShrimp,
    category: "fried",
    groups: fullGroups,
  },
  {
    id: "calamari",
    name: "كاليماري مقلي",
    description: "حلقات كاليماري مقرمشة مع ليمون وصوص حار",
    price: 52,
    image: friedShrimp,
    category: "fried",
    groups: fullGroups,
  },
  {
    id: "shrimp-wrap",
    name: "راب الروبيان",
    description: "خبز طري، روبيان مشوي، كولسلو وثومية",
    price: 42,
    image: shrimpWrap,
    category: "wraps",
    groups: fullGroups,
  },
  {
    id: "fish-wrap",
    name: "ساندويتش فيليه السمك",
    description: "فيليه مقرمش مع خس وصلصة التارتار",
    price: 38,
    image: shrimpWrap,
    category: "wraps",
    groups: fullGroups,
  },
  {
    id: "chowder",
    name: "شوربة البحر الكريمية",
    description: "قشدية بالروبيان والذرة مع خبز محمص",
    price: 29,
    image: soup,
    category: "soups",
    groups: [sizeGroup, toppingsGroup],
  },
  {
    id: "lemonade",
    name: "ليمون بالنعناع",
    description: "عصير ليمون طازج مثلج مع نعناع",
    price: 16,
    image: drink,
    category: "drinks",
    groups: [drinkGroup, drinkExtras],
  },
  {
    id: "sparkling",
    name: "ليموناضة فوارة",
    description: "ماء فوار مع ليمون أخضر وثلج",
    price: 14,
    image: drink,
    category: "drinks",
    groups: [drinkGroup, drinkExtras],
  },
];

export const formatPrice = (value: number) =>
  `${value.toFixed(0)} ر.س`;
