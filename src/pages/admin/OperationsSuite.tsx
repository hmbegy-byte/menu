import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  CalendarClock,
  ChefHat,
  CircleAlert,
  PackagePlus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { isMockMode, supabase } from "../../lib/supabase";

import type { AdminViewData } from "../../lib/adminViewTypes";
import type { CatalogProduct } from "../../lib/catalogTypes";
type Row = CatalogProduct;
type Station = { id: string; name: string; capacity: number; is_active: boolean };
type Inventory = {
  id: string;
  name: string;
  unit: string;
  on_hand: number;
  reorder_level: number;
  unit_cost?: number | null;
};
type Recipe = {
  product_id: string;
  inventory_item_id: string;
  quantity: number;
  unit?: string | null;
};
type ProductCost = { product_id: string; packaging_cost: number; ingredient_cost?: number };
type Movement = {
  id: string;
  inventory_item_id: string;
  quantity_delta: number;
  movement_type: string;
  reason: string;
  expires_on?: string | null;
  created_at: string;
};
type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  cutoff_minutes: number;
  booked: number;
};
type LimitedOffer = {
  id: string;
  product_id: string;
  offer_price: number;
  total_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  sale_starts_at: string;
  sale_ends_at: string;
  is_active: boolean;
};
type Data = {
  stations: Station[];
  inventory: Inventory[];
  recipes: Recipe[];
  productCosts: ProductCost[];
  movements: Movement[];
  slots: Slot[];
  offers: LimitedOffer[];
};
type IdentifiedDataKey = "stations" | "inventory" | "slots" | "offers";
const emptyData: Data = {
  stations: [],
  inventory: [],
  recipes: [],
  productCosts: [],
  movements: [],
  slots: [],
  offers: [],
};
const localKey = (storeId: string) => `demo_operations:${storeId}`;
const localRead = (storeId: string): Data => {
  try {
    return { ...emptyData, ...JSON.parse(localStorage.getItem(localKey(storeId)) || "{}") };
  } catch {
    return emptyData;
  }
};
const dateInput = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );

export default function OperationsSuite({
  adminData,
}: {
  adminData: AdminViewData & {
    setProducts: (update: (current: CatalogProduct[]) => CatalogProduct[]) => void;
  };
}) {
  const { store, products = [] } = adminData;
  const [data, setData] = useState<Data>(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stationForm, setStationForm] = useState({ name: "", capacity: 1 });
  const [stockForm, setStockForm] = useState({
    name: "",
    unit: "قطعة",
    on_hand: 0,
    reorder_level: 0,
    unit_cost: 0,
  });
  const [adjustment, setAdjustment] = useState({
    item_id: "",
    delta: 0,
    reason: "جرد يدوي",
    movement_type: "adjustment",
    expires_on: "",
  });
  const [recipeForm, setRecipeForm] = useState({
    product_id: "",
    inventory_item_id: "",
    quantity: 1,
  });
  const [costForm, setCostForm] = useState({ product_id: "", packaging_cost: 0 });
  const [slotForm, setSlotForm] = useState({
    starts_at: "",
    ends_at: "",
    capacity: 10,
    cutoff_minutes: 30,
  });
  const [offerForm, setOfferForm] = useState({
    product_id: "",
    offer_price: 0,
    total_quantity: 10,
    sale_starts_at: dateInput(new Date().toISOString()),
    sale_ends_at: dateInput(new Date(Date.now() + 86400000).toISOString()),
  });
  const [assignment, setAssignment] = useState({
    product_id: "",
    station_id: "",
    preparation_minutes: 15,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    if (isMockMode) {
      setData(localRead(store.id));
      setLoading(false);
      return;
    }
    const productIds = products.map((product: Row) => product.id).filter(Boolean);
    const recipesRequest = productIds.length
      ? supabase
          .from("recipe_components")
          .select("product_id,inventory_item_id,quantity,unit")
          .in("product_id", productIds)
      : Promise.resolve({ data: [], error: null });
    const costsRequest = productIds.length
      ? supabase
          .from("product_costs")
          .select("product_id,packaging_cost,ingredient_cost")
          .in("product_id", productIds)
      : Promise.resolve({ data: [], error: null });
    const [stations, inventory, recipes, productCosts, movements, slots, offers] =
      await Promise.all([
        supabase.from("preparation_stations").select("*").eq("store_id", store.id).order("name"),
        supabase.from("inventory_items").select("*").eq("store_id", store.id).order("name"),
        recipesRequest,
        costsRequest,
        supabase
          .from("inventory_movements")
          .select("*")
          .eq("store_id", store.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("capacity_slots").select("*").eq("store_id", store.id).order("starts_at"),
        supabase
          .from("limited_offers")
          .select("*")
          .eq("store_id", store.id)
          .order("sale_starts_at", { ascending: false }),
      ]);
    const failed = [stations, inventory, recipes, productCosts, movements, slots, offers].find(
      (result) => result.error,
    );
    if (failed?.error)
      setError("تعذر تحميل أدوات التشغيل. يجب تطبيق ترحيلات قاعدة البيانات الجديدة أولًا.");
    else
      setData({
        stations: stations.data || [],
        inventory: inventory.data || [],
        recipes: recipes.data || [],
        productCosts: productCosts.data || [],
        movements: movements.data || [],
        slots: slots.data || [],
        offers: offers.data || [],
      });
    setLoading(false);
  }, [store.id, products]);
  useEffect(() => void load(), [load]);

  const persistMock = (next: Data) => {
    localStorage.setItem(localKey(store.id), JSON.stringify(next));
    setData(next);
  };
  const run = async (work: () => Promise<void>, success: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      setMessage(success);
      setTimeout(() => setMessage(""), 3000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ التغيير");
    } finally {
      setBusy(false);
    }
  };
  const createRow = async <K extends IdentifiedDataKey>(
    table: string,
    key: K,
    payload: Omit<Data[K][number], "id">,
  ) => {
    if (isMockMode) {
      persistMock({ ...data, [key]: [{ ...payload, id: crypto.randomUUID() }, ...data[key]] });
      return;
    }
    const { error: saveError } = await supabase
      .from(table)
      .insert({ ...payload, store_id: store.id });
    if (saveError) throw saveError;
    await load();
  };
  const removeRow = async (table: string, key: IdentifiedDataKey, id: string) => {
    if (isMockMode) {
      persistMock({ ...data, [key]: data[key].filter((row) => row["id"] !== id) });
      return;
    }
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("store_id", store.id);
    if (deleteError) throw deleteError;
    await load();
  };

  const submitStation = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await createRow("preparation_stations", "stations", {
        name: stationForm.name.trim(),
        capacity: Number(stationForm.capacity),
        is_active: true,
      });
      setStationForm({ name: "", capacity: 1 });
    }, "تمت إضافة محطة التحضير");
  };
  const submitStock = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await createRow("inventory_items", "inventory", {
        ...stockForm,
        name: stockForm.name.trim(),
        on_hand: Number(stockForm.on_hand),
        reorder_level: Number(stockForm.reorder_level),
      });
      setStockForm({ name: "", unit: "قطعة", on_hand: 0, reorder_level: 0, unit_cost: 0 });
    }, "تمت إضافة مادة المخزون");
  };
  const submitAdjustment = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (!adjustment.item_id || Number(adjustment.delta) === 0)
        throw new Error("اختر المادة وأدخل كمية التعديل");
      if (isMockMode) {
        const next = data.inventory.map((item) => {
          if (item["id"] !== adjustment.item_id) return item;
          const onHand = Number(item["on_hand"]) + Number(adjustment.delta);
          if (onHand < 0) throw new Error("لا يمكن أن يصبح المخزون سالبًا");
          return { ...item, on_hand: onHand };
        });
        persistMock({ ...data, inventory: next });
      } else {
        const { error: adjustmentError } = await supabase.rpc("record_inventory_movement", {
          p_store: store.id,
          p_item: adjustment.item_id,
          p_delta: Number(adjustment.delta),
          p_type: adjustment.movement_type,
          p_reason: adjustment.reason.trim(),
          p_idempotency: crypto.randomUUID(),
          p_expires_on: adjustment.expires_on || null,
        });
        if (adjustmentError) throw adjustmentError;
        await load();
      }
      setAdjustment({
        item_id: "",
        delta: 0,
        reason: "جرد يدوي",
        movement_type: "adjustment",
        expires_on: "",
      });
    }, "تم تحديث رصيد المخزون وتسجيل الحركة");
  };
  const submitRecipe = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (
        !recipeForm.product_id ||
        !recipeForm.inventory_item_id ||
        Number(recipeForm.quantity) <= 0
      )
        throw new Error("اختر الصنف والمكوّن وأدخل كمية صحيحة");
      const item = data.inventory.find(
        (candidate) => candidate.id === recipeForm.inventory_item_id,
      );
      const payload = {
        ...recipeForm,
        quantity: Number(recipeForm.quantity),
        unit: item?.unit || null,
      };
      if (isMockMode) {
        const recipes = [
          ...data.recipes.filter(
            (recipe) =>
              !(
                recipe.product_id === payload.product_id &&
                recipe.inventory_item_id === payload.inventory_item_id
              ),
          ),
          payload,
        ];
        persistMock({ ...data, recipes });
      } else {
        const { error: recipeError } = await supabase
          .from("recipe_components")
          .upsert(payload, { onConflict: "product_id,inventory_item_id" });
        if (recipeError) throw recipeError;
        await load();
      }
      setRecipeForm({ product_id: "", inventory_item_id: "", quantity: 1 });
    }, "تم حفظ مكوّن الوصفة");
  };
  const removeRecipe = (recipe: Recipe) =>
    void run(async () => {
      if (isMockMode)
        persistMock({ ...data, recipes: data.recipes.filter((candidate) => candidate !== recipe) });
      else {
        const { error: removeError } = await supabase
          .from("recipe_components")
          .delete()
          .eq("product_id", recipe.product_id)
          .eq("inventory_item_id", recipe.inventory_item_id);
        if (removeError) throw removeError;
        await load();
      }
    }, "تم حذف مكوّن الوصفة");
  const submitProductCost = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (!costForm.product_id || Number(costForm.packaging_cost) < 0)
        throw new Error("اختر الصنف وأدخل تكلفة صحيحة");
      const payload = {
        product_id: costForm.product_id,
        packaging_cost: Number(costForm.packaging_cost),
        ingredient_cost: 0,
      };
      if (isMockMode)
        persistMock({
          ...data,
          productCosts: [
            ...data.productCosts.filter((cost) => cost.product_id !== payload.product_id),
            payload,
          ],
        });
      else {
        const { error: costError } = await supabase
          .from("product_costs")
          .upsert(payload, { onConflict: "product_id" });
        if (costError) throw costError;
        await load();
      }
      setCostForm({ product_id: "", packaging_cost: 0 });
    }, "تم حفظ تكلفة التغليف للصنف");
  };
  const submitSlot = (event: FormEvent) => {
    event.preventDefault();
    if (new Date(slotForm.ends_at) <= new Date(slotForm.starts_at)) {
      setError("وقت نهاية الفترة يجب أن يكون بعد بدايتها");
      return;
    }
    void run(async () => {
      await createRow("capacity_slots", "slots", {
        ...slotForm,
        starts_at: new Date(slotForm.starts_at).toISOString(),
        ends_at: new Date(slotForm.ends_at).toISOString(),
        capacity: Number(slotForm.capacity),
        cutoff_minutes: Number(slotForm.cutoff_minutes),
        booked: 0,
      });
      setSlotForm({ starts_at: "", ends_at: "", capacity: 10, cutoff_minutes: 30 });
    }, "تمت إضافة فترة الاستلام");
  };
  const submitOffer = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (new Date(offerForm.sale_ends_at) <= new Date(offerForm.sale_starts_at))
        throw new Error("نهاية العرض يجب أن تكون بعد بدايته");
      await createRow("limited_offers", "offers", {
        ...offerForm,
        offer_price: Number(offerForm.offer_price),
        total_quantity: Number(offerForm.total_quantity),
        reserved_quantity: 0,
        sold_quantity: 0,
        sale_starts_at: new Date(offerForm.sale_starts_at).toISOString(),
        sale_ends_at: new Date(offerForm.sale_ends_at).toISOString(),
        is_active: true,
      });
      setOfferForm((current) => ({
        ...current,
        product_id: "",
        offer_price: 0,
        total_quantity: 10,
      }));
    }, "تم إنشاء العرض المحدود");
  };
  const saveAssignment = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (isMockMode) {
        adminData.setProducts((current: Row[]) =>
          current.map((product) =>
            product["id"] === assignment.product_id
              ? {
                  ...product,
                  station_id: assignment.station_id || null,
                  preparation_minutes: Number(assignment.preparation_minutes),
                }
              : product,
          ),
        );
        return;
      }
      const { error: updateError } = await supabase
        .from("products")
        .update({
          station_id: assignment.station_id || null,
          preparation_minutes: Number(assignment.preparation_minutes),
        })
        .eq("id", assignment.product_id)
        .eq("store_id", store.id);
      if (updateError) throw updateError;
      await adminData.reload();
    }, "تم توجيه الصنف إلى محطة التحضير");
  };

  const activeSlots = useMemo(
    () => data.slots.filter((slot) => new Date(slot["ends_at"]) > new Date()),
    [data.slots],
  );
  const productName = (id: string) =>
    products.find((product: Row) => product["id"] === id)?.name || "صنف محذوف";
  if (loading)
    return (
      <div className="rounded-2xl border bg-white p-10 text-center text-gray-500">
        جاري تحميل أدوات التشغيل...
      </div>
    );

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">التشغيل والمطبخ</h2>
        <p className="mt-1 text-gray-600">
          اضبط طاقة المطبخ والمخزون والعروض المحدودة من مكان واحد.
        </p>
        <label className="mt-4 flex max-w-md items-center justify-between rounded-xl border bg-white p-4 font-bold">
          خصم مخزون الوصفات عند بدء التحضير
          <input
            type="checkbox"
            checked={adminData.settings.inventoryEnabled === true}
            onChange={(event) =>
              void adminData
                .saveStoreSection("settings", {
                  ...adminData.settings,
                  inventoryEnabled: event.target.checked,
                })
                .then(() => adminData.reload())
            }
          />
        </label>
        {!adminData.settings.inventoryEnabled && (
          <p className="mt-2 text-sm text-amber-700">
            المخزون في وضع الإعداد فقط؛ لن يُخصم شيء من الطلبات حتى تفعّل الخيار.
          </p>
        )}
      </div>
      {(message || error) && (
        <div
          role="status"
          className={`rounded-xl border p-3 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
        >
          {error || message}
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="text-purple-600" /> محطات التحضير
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submitStation} className="grid gap-3 sm:grid-cols-[1fr_110px_auto]">
              <Input
                aria-label="اسم المحطة"
                placeholder="مثال: الشواية"
                value={stationForm.name}
                onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                required
              />
              <Input
                aria-label="طاقة المحطة"
                type="number"
                min="1"
                value={stationForm.capacity}
                onChange={(e) =>
                  setStationForm({ ...stationForm, capacity: Number(e.target.value) })
                }
                required
              />
              <Button disabled={busy}>
                <PackagePlus size={17} /> إضافة
              </Button>
            </form>
            <div className="divide-y rounded-xl border">
              {data.stations.length === 0 && (
                <p className="p-4 text-sm text-gray-500">لا توجد محطات بعد.</p>
              )}
              {data.stations.map((station) => (
                <div key={station["id"]} className="flex items-center justify-between p-3">
                  <div>
                    <strong>{station["name"]}</strong>
                    <p className="text-xs text-gray-500">الطاقة المتزامنة: {station["capacity"]}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`حذف ${station["name"]}`}
                    onClick={() =>
                      void run(
                        () => removeRow("preparation_stations", "stations", station["id"]),
                        "تم حذف المحطة",
                      )
                    }
                  >
                    <Trash2 size={17} className="text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
            <form onSubmit={saveAssignment} className="space-y-3 rounded-xl bg-purple-50 p-4">
              <strong className="block text-sm text-purple-900">توجيه صنف للمطبخ</strong>
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  className="rounded-lg border bg-white p-2 text-sm"
                  value={assignment.product_id}
                  onChange={(e) => setAssignment({ ...assignment, product_id: e.target.value })}
                  required
                >
                  <option value="">اختر الصنف</option>
                  {products.map((product: Row) => (
                    <option key={product["id"]} value={product["id"]}>
                      {product["name"]}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-lg border bg-white p-2 text-sm"
                  value={assignment.station_id}
                  onChange={(e) => setAssignment({ ...assignment, station_id: e.target.value })}
                  required
                >
                  <option value="">اختر المحطة</option>
                  {data.stations.map((station) => (
                    <option key={station["id"]} value={station["id"]}>
                      {station["name"]}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label="دقائق التحضير"
                  type="number"
                  min="1"
                  value={assignment.preparation_minutes}
                  onChange={(e) =>
                    setAssignment({ ...assignment, preparation_minutes: Number(e.target.value) })
                  }
                />
              </div>
              <Button disabled={busy || !assignment.product_id || !assignment.station_id}>
                <Save size={17} /> حفظ التوجيه
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="text-purple-600" /> المخزون والتنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submitStock} className="grid gap-3 sm:grid-cols-2">
              <Field label="المادة">
                <Input
                  value={stockForm.name}
                  onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                  placeholder="أرز، أكواب، لحم..."
                  required
                />
              </Field>
              <Field label="الوحدة">
                <Input
                  value={stockForm.unit}
                  onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })}
                  required
                />
              </Field>
              <Field label="الكمية الحالية">
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={stockForm.on_hand}
                  onChange={(e) => setStockForm({ ...stockForm, on_hand: Number(e.target.value) })}
                />
              </Field>
              <Field label="نبّهني عند">
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={stockForm.reorder_level}
                  onChange={(e) =>
                    setStockForm({ ...stockForm, reorder_level: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="تكلفة الوحدة">
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={stockForm.unit_cost}
                  onChange={(e) =>
                    setStockForm({ ...stockForm, unit_cost: Number(e.target.value) })
                  }
                />
              </Field>
              <Button className="sm:col-span-2" disabled={busy}>
                <PackagePlus size={17} /> إضافة للمخزون
              </Button>
            </form>
            {data.inventory.length > 0 && (
              <form
                onSubmit={submitAdjustment}
                className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"
              >
                <strong className="sm:col-span-2 text-sm text-slate-900">
                  تسجيل إضافة أو استهلاك
                </strong>
                <select
                  className="rounded-lg border bg-white p-2.5 text-sm"
                  value={adjustment.item_id}
                  onChange={(event) =>
                    setAdjustment({ ...adjustment, item_id: event.target.value })
                  }
                  required
                >
                  <option value="">اختر المادة</option>
                  {data.inventory.map((item) => (
                    <option key={item["id"]} value={item["id"]}>
                      {item["name"]}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label="كمية التعديل"
                  type="number"
                  step="0.001"
                  value={adjustment.delta}
                  onChange={(event) =>
                    setAdjustment({ ...adjustment, delta: Number(event.target.value) })
                  }
                  placeholder="موجب للإضافة، سالب للاستهلاك"
                  required
                />
                <select
                  className="rounded-lg border bg-white p-2.5 text-sm"
                  value={adjustment.movement_type}
                  onChange={(event) =>
                    setAdjustment({ ...adjustment, movement_type: event.target.value })
                  }
                >
                  <option value="adjustment">تسوية جرد</option>
                  <option value="restock">توريد</option>
                  <option value="waste">هدر أو تلف</option>
                </select>
                <Input
                  type="date"
                  aria-label="تاريخ الصلاحية إن وجد"
                  value={adjustment.expires_on}
                  onChange={(event) =>
                    setAdjustment({ ...adjustment, expires_on: event.target.value })
                  }
                />
                <Input
                  className="sm:col-span-2"
                  value={adjustment.reason}
                  onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })}
                  placeholder="سبب التعديل"
                  required
                />
                <Button variant="outline" className="sm:col-span-2" disabled={busy}>
                  حفظ حركة المخزون
                </Button>
              </form>
            )}
            <div className="divide-y rounded-xl border">
              {data.inventory.length === 0 && (
                <p className="p-4 text-sm text-gray-500">أضف أول مادة ليبدأ رصد النقص.</p>
              )}
              {data.inventory.map((item) => {
                const low = Number(item["on_hand"]) <= Number(item["reorder_level"]);
                return (
                  <div key={item["id"]} className="flex items-center justify-between gap-3 p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong>{item["name"]}</strong>
                        {low && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                            <CircleAlert size={13} /> منخفض
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {item["on_hand"]} {item["unit"]} · حد التنبيه {item["reorder_level"]}
                        {item.unit_cost != null
                          ? ` · تكلفة الوحدة ${item.unit_cost}`
                          : " · التكلفة ناقصة"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        void run(
                          () => removeRow("inventory_items", "inventory", item["id"]),
                          "تم حذف المادة",
                        )
                      }
                    >
                      <Trash2 size={17} className="text-red-600" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={submitProductCost}
              className="space-y-3 rounded-xl border bg-slate-50 p-4"
            >
              <strong className="block text-sm text-slate-900">تكلفة التغليف لكل صنف</strong>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <select
                  required
                  value={costForm.product_id}
                  onChange={(event) => setCostForm({ ...costForm, product_id: event.target.value })}
                  className="rounded-lg border bg-white p-2.5 text-sm"
                >
                  <option value="">اختر الصنف</option>
                  {products.map((product: Row) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <Input
                  required
                  aria-label="تكلفة التغليف"
                  type="number"
                  min="0"
                  step="0.01"
                  value={costForm.packaging_cost}
                  onChange={(event) =>
                    setCostForm({ ...costForm, packaging_cost: Number(event.target.value) })
                  }
                />
                <Button disabled={busy}>حفظ التكلفة</Button>
              </div>
              {data.productCosts.length > 0 && (
                <p className="text-xs text-slate-600">
                  تم ضبط تكلفة التغليف لـ {data.productCosts.length} صنف.
                </p>
              )}
            </form>
            <form onSubmit={submitRecipe} className="space-y-3 rounded-xl border bg-slate-50 p-4">
              <strong className="block text-sm text-slate-900">ربط وصفة الصنف بالمخزون</strong>
              <p className="text-xs text-slate-600">
                تُخصم المكونات مرة واحدة عند نقل الطلب إلى «قيد التحضير». الإلغاء بعد بدء التحضير لا
                يعيدها تلقائيًا.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  required
                  value={recipeForm.product_id}
                  onChange={(event) =>
                    setRecipeForm({ ...recipeForm, product_id: event.target.value })
                  }
                  className="rounded-lg border bg-white p-2.5 text-sm"
                >
                  <option value="">اختر الصنف</option>
                  {products.map((product: Row) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={recipeForm.inventory_item_id}
                  onChange={(event) =>
                    setRecipeForm({ ...recipeForm, inventory_item_id: event.target.value })
                  }
                  className="rounded-lg border bg-white p-2.5 text-sm"
                >
                  <option value="">اختر المكوّن</option>
                  {data.inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
                <Input
                  required
                  aria-label="كمية المكوّن لكل وحدة من الصنف"
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={recipeForm.quantity}
                  onChange={(event) =>
                    setRecipeForm({ ...recipeForm, quantity: Number(event.target.value) })
                  }
                />
              </div>
              <Button disabled={busy}>حفظ مكوّن الوصفة</Button>
              <div className="divide-y rounded-xl border bg-white">
                {data.recipes.map((recipe) => (
                  <div
                    key={`${recipe.product_id}-${recipe.inventory_item_id}`}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <p className="text-sm">
                      <strong>{productName(recipe.product_id)}</strong> ←{" "}
                      {data.inventory.find((item) => item.id === recipe.inventory_item_id)?.name ||
                        "مكوّن محذوف"}{" "}
                      · {recipe.quantity} {recipe.unit}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRecipe(recipe)}
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </Button>
                  </div>
                ))}
                {data.recipes.length === 0 && (
                  <p className="p-3 text-sm text-gray-500">
                    الأصناف بلا وصفة تستمر في قبول الطلبات، لكن تظهر تكلفتها ناقصة في تقرير الربحية.
                  </p>
                )}
              </div>
            </form>
            {data.movements.length > 0 && (
              <details className="rounded-xl border p-4">
                <summary className="cursor-pointer font-bold">آخر حركات المخزون</summary>
                <div className="mt-3 divide-y">
                  {data.movements.map((movement) => (
                    <div key={movement.id} className="flex justify-between gap-3 py-2 text-sm">
                      <span>
                        {data.inventory.find((item) => item.id === movement.inventory_item_id)
                          ?.name || "مادة"}{" "}
                        · {movement.reason}
                      </span>
                      <strong dir="ltr">
                        {Number(movement.quantity_delta) > 0 ? "+" : ""}
                        {movement.quantity_delta}
                      </strong>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="text-purple-600" /> فترات الاستلام والسعة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submitSlot} className="grid gap-3 sm:grid-cols-2">
              <Field label="البداية">
                <Input
                  type="datetime-local"
                  value={slotForm.starts_at}
                  onChange={(e) => setSlotForm({ ...slotForm, starts_at: e.target.value })}
                  required
                />
              </Field>
              <Field label="النهاية">
                <Input
                  type="datetime-local"
                  value={slotForm.ends_at}
                  onChange={(e) => setSlotForm({ ...slotForm, ends_at: e.target.value })}
                  required
                />
              </Field>
              <Field label="أقصى عدد طلبات">
                <Input
                  type="number"
                  min="1"
                  value={slotForm.capacity}
                  onChange={(e) => setSlotForm({ ...slotForm, capacity: Number(e.target.value) })}
                  required
                />
              </Field>
              <Field label="إغلاق الحجز قبل (دقيقة)">
                <Input
                  type="number"
                  min="0"
                  value={slotForm.cutoff_minutes}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, cutoff_minutes: Number(e.target.value) })
                  }
                />
              </Field>
              <Button className="sm:col-span-2" disabled={busy}>
                إضافة الفترة
              </Button>
            </form>
            <div className="divide-y rounded-xl border">
              {activeSlots.length === 0 && (
                <p className="p-4 text-sm text-gray-500">لا توجد فترات قادمة.</p>
              )}
              {activeSlots.map((slot) => (
                <div key={slot["id"]} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <strong>{formatDate(slot["starts_at"])}</strong>
                    <p className="text-xs text-gray-500">
                      محجوز {slot["booked"] || 0} من {slot["capacity"]} · يقفل قبل{" "}
                      {slot["cutoff_minutes"]} دقيقة
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      void run(
                        () => removeRow("capacity_slots", "slots", slot["id"]),
                        "تم حذف الفترة",
                      )
                    }
                  >
                    <Trash2 size={17} className="text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="text-purple-600" /> عروض بكمية محدودة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submitOffer} className="grid gap-3 sm:grid-cols-2">
              <Field label="الصنف" wide>
                <select
                  className="w-full rounded-lg border bg-white p-2.5 text-sm"
                  value={offerForm.product_id}
                  onChange={(e) => {
                    const product = products.find((p: Row) => p["id"] === e.target.value);
                    setOfferForm({
                      ...offerForm,
                      product_id: e.target.value,
                      offer_price: Number(product?.price || 0),
                    });
                  }}
                  required
                >
                  <option value="">اختر الصنف</option>
                  {products.map((product: Row) => (
                    <option key={product["id"]} value={product["id"]}>
                      {product["name"]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="سعر العرض">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={offerForm.offer_price}
                  onChange={(e) =>
                    setOfferForm({ ...offerForm, offer_price: Number(e.target.value) })
                  }
                  required
                />
              </Field>
              <Field label="الكمية">
                <Input
                  type="number"
                  min="1"
                  value={offerForm.total_quantity}
                  onChange={(e) =>
                    setOfferForm({ ...offerForm, total_quantity: Number(e.target.value) })
                  }
                  required
                />
              </Field>
              <Field label="بداية البيع">
                <Input
                  type="datetime-local"
                  value={offerForm.sale_starts_at}
                  onChange={(e) => setOfferForm({ ...offerForm, sale_starts_at: e.target.value })}
                  required
                />
              </Field>
              <Field label="نهاية البيع">
                <Input
                  type="datetime-local"
                  value={offerForm.sale_ends_at}
                  onChange={(e) => setOfferForm({ ...offerForm, sale_ends_at: e.target.value })}
                  required
                />
              </Field>
              <Button className="sm:col-span-2" disabled={busy}>
                إنشاء العرض المحدود
              </Button>
            </form>
            <div className="divide-y rounded-xl border">
              {data.offers.length === 0 && (
                <p className="p-4 text-sm text-gray-500">لا توجد عروض محدودة بعد.</p>
              )}
              {data.offers.map((offer) => (
                <div key={offer["id"]} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <strong>
                      {productName(offer["product_id"])} · {offer["offer_price"]} {store.currency}
                    </strong>
                    <p className="text-xs text-gray-500">
                      المتاح{" "}
                      {Number(offer["total_quantity"]) -
                        Number(offer["reserved_quantity"] || 0) -
                        Number(offer["sold_quantity"] || 0)}{" "}
                      من {offer["total_quantity"]} · حتى {formatDate(offer["sale_ends_at"])}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      void run(
                        () => removeRow("limited_offers", "offers", offer["id"]),
                        "تم حذف العرض",
                      )
                    }
                  >
                    <Trash2 size={17} className="text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
