import { useRef, useState } from "react";
import { DatabaseBackup, Download, FileSpreadsheet, HardDrive, Upload } from "lucide-react";
import { isMockMode } from "../../lib/supabase";
import { demoStorageKeys, writeDemo } from "../../lib/storeDefaults";

const exportKeys = [
  "store",
  "organization",
  "categories",
  "products",
  "offers",
  "addons",
  "banners",
  "orders",
  "branches",
  "team",
] as const;

function downloadFile(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export default function DataTools({ adminData }) {
  const [message, setMessage] = useState("");
  const backupInput = useRef<HTMLInputElement>(null);
  const menuInput = useRef<HTMLInputElement>(null);
  const estimatedBytes = new Blob([
    JSON.stringify(exportKeys.reduce((data, key) => ({ ...data, [key]: adminData[key] }), {})),
  ]).size;

  const exportBackup = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      storeSlug: adminData.store.slug,
      data: exportKeys.reduce((data, key) => ({ ...data, [key]: adminData[key] }), {}),
    };
    downloadFile(
      `backup-${adminData.store.slug}-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
    setMessage("تم تنزيل نسخة احتياطية على جهازك.");
  };

  const exportOrders = () => {
    const header = [
      "رقم الطلب",
      "التاريخ",
      "العميل",
      "الجوال",
      "الحالة",
      "طريقة الدفع",
      "الإجمالي",
    ];
    const rows = adminData.orders.map((order) => [
      order.order_number,
      order.created_at,
      order.customer_name,
      order.customer_phone,
      order.status,
      order.payment_method,
      order.total_amount,
    ]);
    downloadFile(
      `orders-${adminData.store.slug}.csv`,
      `\uFEFF${[header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")}`,
      "text/csv;charset=utf-8",
    );
    setMessage("تم تصدير الطلبات بصيغة مناسبة لبرامج الجداول.");
  };

  const restoreDemo = async (file?: File) => {
    if (!file || !isMockMode) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.version !== 1 || !parsed.data?.store) throw new Error();
      for (const key of exportKeys) {
        if (parsed.data[key] !== undefined && key in demoStorageKeys)
          writeDemo(key as keyof typeof demoStorageKeys, parsed.data[key]);
      }
      setMessage("تمت استعادة النسخة التجريبية بنجاح.");
      await adminData.reload();
    } catch {
      setMessage("الملف غير صالح أو لا يطابق صيغة النسخة الاحتياطية.");
    }
  };

  const importMenu = async (file?: File) => {
    if (!file) return;
    try {
      const rows = parseCsv(await file.text());
      const [headers, ...values] = rows;
      const normalized = headers.map((header) => header.trim().toLowerCase());
      const indexOf = (...names: string[]) =>
        normalized.findIndex((header) => names.includes(header));
      const nameIndex = indexOf("name", "الاسم", "اسم الصنف");
      const priceIndex = indexOf("price", "السعر");
      const descriptionIndex = indexOf("description", "الوصف");
      const categoryIndex = indexOf("category", "التصنيف");
      if (nameIndex < 0 || priceIndex < 0) throw new Error();
      const products: Array<Record<string, unknown>> = [];
      for (const row of values.slice(0, 300)) {
        const name = row[nameIndex]?.trim();
        const price = Number(row[priceIndex]);
        if (!name || !Number.isFinite(price) || price < 0) continue;
        const categoryName = row[categoryIndex]?.trim();
        const category =
          adminData.categories.find((item) => item.name === categoryName) ||
          adminData.categories[0];
        if (!category) continue;
        products.push({
          name,
          price,
          description: row[descriptionIndex]?.trim() || "",
          category_id: category.id,
          is_available: true,
          options: [],
        });
      }
      const imported = await adminData.importProducts(products);
      setMessage(imported ? `تم استيراد ${imported} صنفًا.` : "لم نجد صفوفًا صالحة للاستيراد.");
    } catch {
      setMessage("تعذر قراءة الملف. استخدم الأعمدة: الاسم، السعر، الوصف، التصنيف.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">البيانات والنسخ الاحتياطي</h2>
        <p className="mt-1 text-gray-500">
          أدوات مجانية لحماية بيانات المطعم وتسريع إدخال القائمة.
        </p>
      </div>
      {message && (
        <div role="status" className="rounded-xl bg-purple-50 p-3 font-bold text-purple-700">
          {message}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <ActionCard
          icon={DatabaseBackup}
          title="نسخة احتياطية كاملة"
          description="نزّل بيانات المطعم والقائمة والطلبات في ملف واحد."
          button="تنزيل النسخة"
          onClick={exportBackup}
        />
        <ActionCard
          icon={FileSpreadsheet}
          title="تصدير الطلبات"
          description="ملف CSV يعمل مع Excel وGoogle Sheets."
          button="تصدير الطلبات"
          onClick={exportOrders}
        />
        <ActionCard
          icon={Upload}
          title="استيراد قائمة الطعام"
          description="أعمدة الملف: الاسم، السعر، الوصف، التصنيف. الحد 300 صنف في المرة."
          button="اختيار CSV"
          onClick={() => menuInput.current?.click()}
        />
        <ActionCard
          icon={HardDrive}
          title="حجم البيانات الحالي"
          description={`الحجم التقريبي للبيانات النصية: ${(estimatedBytes / 1024).toFixed(1)} كيلوبايت.`}
          button={isMockMode ? "استعادة نسخة تجريبية" : "الاستعادة محمية في الإنتاج"}
          disabled={!isMockMode}
          onClick={() => backupInput.current?.click()}
        />
      </div>
      <input
        ref={menuInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => importMenu(event.target.files?.[0])}
      />
      <input
        ref={backupInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => restoreDemo(event.target.files?.[0])}
      />
      <p className="text-sm text-gray-500">
        احتفظ بالنسخة في مكان خاص؛ قد تتضمن أسماء العملاء وأرقام هواتفهم. الاستعادة المباشرة متاحة
        في العرض التجريبي فقط لمنع الكتابة فوق بيانات الإنتاج بالخطأ.
      </p>
    </div>
  );
}

function ActionCard({ icon: Icon, title, description, button, onClick, disabled = false }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <Icon className="mb-3 text-purple-600" size={28} />
      <h3 className="font-bold text-gray-900">{title}</h3>
      <p className="mt-1 min-h-12 text-sm leading-6 text-gray-500">{description}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="mt-4 rounded-xl bg-purple-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {button}
      </button>
    </section>
  );
}
