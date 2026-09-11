import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Gift, Save, CheckCircle2, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import LoyaltyRulesEditor from '../../components/LoyaltyRulesEditor';

export default function LoyaltySettings({ adminData }: any) {
  const { store } = adminData;
  const organization = adminData.organization || (store?.organization_id ? {id:store.organization_id} : null);
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (organization?.id) {
      loadProgram();
    }
  }, [organization?.id]);

  const loadProgram = async () => {
    setLoading(true);
    let { data, error: loadError } = await supabase
      .from("loyalty_programs")
      .select("*")
      .eq("organization_id", organization.id)
      .maybeSingle();
    if(loadError){setMessage('تعذر تحميل إعدادات الولاء');setLoading(false);return;}

    if (!data) {
      // Create default
      const { data: newProgram } = await supabase
        .from("loyalty_programs")
        .insert({
          organization_id: organization.id,
          is_active: false,
        })
        .select()
        .single();
      data = newProgram;
    }
    setProgram(data);
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("loyalty_programs")
      .update({
        is_active: program.is_active,
        points_name: program.points_name,
        min_order_amount: program.min_order_amount,
        program_type: program.program_type,
        stamps_name: program.stamps_name,
        allow_staff_adjustments: program.allow_staff_adjustments,
      })
      .eq("id", program.id);

    setSaving(false);
    if (error) {
      setMessage("حدث خطأ أثناء الحفظ");
    } else {
      setMessage("تم الحفظ بنجاح!");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (!loading && !program) return <p role="alert">{message || 'تعذر تحميل إعدادات الولاء'}</p>;
  if (loading || !program) {
    return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;
  }

  const customerLink = `${window.location.origin}/s/${store.slug}/loyalty`;
  const scannerLink = `${window.location.origin}/s/${store.slug}/scanner`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Gift className="w-6 h-6 text-primary" /> نظام الولاء
        </h2>
        <p className="mt-1 text-muted-foreground">قم بإدارة برنامج الولاء والمكافآت الخاص بمطعمك.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الإعدادات الأساسية</CardTitle>
          <CardDescription>تفعيل وإدارة البرنامج</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <Label className="text-lg font-bold">تفعيل برنامج الولاء</Label>
              <p className="text-sm text-muted-foreground">السماح للعملاء بجمع النقاط واستبدالها</p>
            </div>
            <Switch 
              checked={program.is_active} 
              onCheckedChange={(c) => setProgram({ ...program, is_active: c })} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>نوع البرنامج<select className="block w-full border rounded-xl p-3" value={program.program_type} onChange={e=>setProgram({...program,program_type:e.target.value})}><option value="points">نقاط</option><option value="stamps">أختام</option><option value="hybrid">نقاط وأختام</option></select></label>
            <label>اسم الأختام<Input value={program.stamps_name} onChange={e=>setProgram({...program,stamps_name:e.target.value})}/></label>
            <label className="flex gap-3 items-center"><input type="checkbox" checked={Boolean(program.allow_staff_adjustments)} onChange={e=>setProgram({...program,allow_staff_adjustments:e.target.checked})}/>السماح للعامل بإضافة وخصم الرصيد يدويًا خارج القواعد</label>
            <div className="space-y-2">
              <Label>اسم العملة (مثال: نقاط، نجوم)</Label>
              <Input 
                value={program.points_name} 
                onChange={(e) => setProgram({ ...program, points_name: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>الحد الأدنى للطلب لجمع النقاط (ر.س)</Label>
              <Input 
                type="number" 
                value={program.min_order_amount} 
                onChange={(e) => setProgram({ ...program, min_order_amount: parseFloat(e.target.value) || 0 })} 
              />
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="w-full md:w-auto">
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
          
          {message && (
            <p className="text-sm font-bold text-green-600 flex items-center gap-1 mt-2">
              <CheckCircle2 className="w-4 h-4" /> {message}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2"><LoyaltyRulesEditor organizationId={organization.id} products={adminData.products || []}/></div>
        <Card>
          <CardHeader>
            <CardTitle>رابط صفحة العملاء</CardTitle>
            <CardDescription>شارك هذا الرابط مع عملائك ليتمكنوا من عرض بطاقة الولاء الخاصة بهم</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={customerLink} readOnly dir="ltr" className="bg-slate-50" />
              <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(customerLink)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ماسح الموظفين</CardTitle>
            <CardDescription>الرابط الخاص بالموظفين لمسح بطاقات العملاء وإضافة/خصم النقاط</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={scannerLink} readOnly dir="ltr" className="bg-slate-50" />
              <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(scannerLink)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
