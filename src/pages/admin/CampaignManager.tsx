import { useEffect, useMemo, useState } from "react";
import { Copy, Link2, Plus, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../lib/currency";

const sources = [
  ["instagram", "إنستغرام"], ["snapchat", "سناب شات"], ["whatsapp", "واتساب"],
  ["influencer", "مؤثر"], ["other", "مصدر آخر"],
];

export default function CampaignManager({ adminData }: any) {
  const { store, products } = adminData;
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [source, setSource] = useState("instagram");
  const [productId, setProductId] = useState("");
  const [days, setDays] = useState(30);
  const [message, setMessage] = useState("");

  const load = async () => {
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const to = new Date(Date.now() + 86400000).toISOString();
    const [{ data: rows }, { data: stats }] = await Promise.all([
      supabase.from("campaigns").select("*").eq("store_id", store.id).order("created_at", { ascending: false }),
      supabase.rpc("campaign_metrics", { p_store_id: store.id, p_from: from, p_to: to }),
    ]);
    setCampaigns(rows || []); setMetrics(stats || []);
  };
  useEffect(() => { load(); }, [store.id, days]);

  const metricsById = useMemo(() => new Map(metrics.map((row) => [row.campaign_id, row])), [metrics]);
  const create = async () => {
    if (name.trim().length < 2) return setMessage("اكتب اسمًا واضحًا للحملة.");
    const slug = `${source}-${Date.now().toString(36)}`;
    const { error } = await supabase.from("campaigns").insert({ store_id: store.id, name: name.trim(), source, slug });
    if (error) return setMessage(error.message);
    setName(""); setMessage("تم إنشاء الرابط."); await load();
  };
  const linkFor = (campaign: any) => {
    const query = new URLSearchParams({ campaign: campaign.slug, source: campaign.source });
    if (productId) query.set("product", productId);
    return `${window.location.origin}/s/${store.slug}?${query}`;
  };
  return <div className="space-y-6">
    <div><h2 className="flex items-center gap-2 text-2xl font-bold"><Link2 /> روابط الحملات والأصناف</h2><p className="mt-1 text-gray-500">مبيعات منسوبة للرابط، وليست ربحًا أو عائدًا إعلانيًا.</p></div>
    <section className="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-4">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الحملة" className="rounded-xl border p-3" />
      <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded-xl border p-3">{sources.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select>
      <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-xl border p-3"><option value="">القائمة كاملة</option>{products.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <button onClick={create} className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 p-3 font-bold text-white"><Plus size={18}/>إنشاء الرابط</button>
      {message && <p className="text-sm text-purple-700 md:col-span-4">{message}</p>}
    </section>
    <div className="flex items-center gap-2"><span className="font-bold">الفترة:</span>{[7,30,90].map((value) => <button key={value} onClick={() => setDays(value)} className={`rounded-full px-4 py-2 ${days===value?'bg-purple-600 text-white':'bg-white border'}`}>{value} يوم</button>)}</div>
    <section className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[720px] text-right"><thead className="bg-gray-50 text-sm"><tr><th className="p-4">الحملة</th><th>المصدر</th><th>الطلبات المنسوبة</th><th>صافي المبيعات</th><th>متوسط الطلب</th><th>الرابط</th></tr></thead><tbody>{campaigns.map((campaign) => { const stat=metricsById.get(campaign.id)||{}; return <tr key={campaign.id} className="border-t"><td className="p-4 font-bold">{campaign.name}</td><td>{sources.find(([id])=>id===campaign.source)?.[1]}</td><td>{stat.orders_count||0}</td><td>{formatCurrency(Number(stat.net_sales||0),store.currency)}</td><td>{formatCurrency(Number(stat.average_order_value||0),store.currency)}</td><td><button onClick={() => navigator.clipboard.writeText(linkFor(campaign))} className="rounded-lg border p-2" aria-label="نسخ الرابط"><Copy size={17}/></button></td></tr>; })}</tbody></table></section>
    <p className="text-sm text-gray-500">قاعدة القياس: آخر رابط حملة صالح يُرسل مع الطلب. يُحسب الطلب مرة واحدة فقط. الملغي والمسترد بالكامل = صفر، والاسترداد الجزئي يُخصم من المبيعات.</p>
  </div>;
}
