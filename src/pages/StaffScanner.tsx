import { useEffect, useRef, useState } from "react";
import { supabase as adminSupabase, kitchenSupabase } from "../lib/supabase";
import { hasStoreAccess } from '../lib/access';
import { normalizeLoyaltyPhone } from '../lib/loyaltyPhone.mjs';
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScanLine, UserCheck, Plus, Minus, AlertCircle } from "lucide-react";

export default function StaffScannerPage({ storeSlug, kitchen = false }: { storeSlug: string; kitchen?: boolean }) {
  const supabase = kitchen ? kitchenSupabase : adminSupabase;
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!await hasStoreAccess(storeSlug,['admin','kitchen','manager','cashier'],supabase)) throw new Error('AUTH_REQUIRED');
        const result = await supabase.from('stores').select('id,name').eq('slug',storeSlug).single();
        if (result.error) throw new Error('تعذر تحميل المطعم');
        if (active) setStore(result.data);
      } catch(e) { if(active) setError(e instanceof Error ? e.message : 'تعذر التحميل'); }
      finally {if(active) setLoading(false);}
    })();
    return () => {active = false;};
  },[storeSlug,supabase]);
  const [scanning, setScanning] = useState(false);
  const [scannedCustomer, setScannedCustomer] = useState<any>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [scanError, setScanError] = useState("");
  const [reason, setReason] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => () => controlsRef.current?.stop(), []);

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل...</div>;
  if (error === "AUTH_REQUIRED") {
    return <div className="min-h-screen grid place-items-center">يجب تسجيل الدخول كمسؤول أو موظف</div>;
  }
  if (!store) {
    return <div className="min-h-screen grid place-items-center">المتجر غير موجود</div>;
  }

  const startScanning = async () => {
    setScanning(true);
    setScanError("");
    try {
      const codeReader = new BrowserQRCodeReader();
      controlsRef.current = await codeReader.decodeFromVideoDevice(undefined, 'video-preview', (result, err) => {
        if (result) {
          handleScan(result.getText());
          controlsRef.current?.stop();
          setScanning(false);
        }
        if (err && err.name !== 'NotFoundException') {
          console.error(err);
        }
      });
    } catch (e: any) {
      setScanError(e.message);
      setScanning(false);
    }
  };

  const findByPhone = async () => {
    setScanError("");
    const normalized = normalizeLoyaltyPhone(phoneSearch);
    if (!normalized) { setScanError('أدخل رقم جوال صالحًا.'); return; }
    const { data, error: lookupError } = await supabase.rpc('staff_loyalty_lookup', {p_store_id:store.id,p_phone:normalized});
    if (lookupError || data?.length !== 1) setScanError("لم نجد عضوية واحدة بهذا الرقم. اطلب من العميل عرض رمز بطاقته.");
    else setScannedCustomer(data[0]);
  };

  const handleScan = async (qrData: string) => {
    try {
      const parsed = JSON.parse(qrData);
      if (parsed.a && parsed.t) {
        // Fetch customer by token
        const { data, error } = await supabase.rpc('staff_loyalty_lookup', {p_store_id:store.id,p_customer_id:parsed.a,p_token:parsed.t});
          
        if (error || data?.length !== 1) {
          setScanError("رمز QR غير صالح أو غير مرتبط بهذا المطعم.");
        } else {
          setScannedCustomer(data[0]);
        }
      }
    } catch (e) {
      setScanError("رمز QR غير معروف");
    }
  };

  const handleAdjustment = async (type: "add" | "deduct", currency: "points" | "stamps") => {
    if (!scannedCustomer || adjustmentAmount <= 0 || !reason.trim()) {
      setScanError("اكتب سبب العملية قبل إضافة أو خصم الرصيد.");
      return;
    }
    setProcessing(true);
    
    try {
      const signedAmount = type === "deduct" ? -adjustmentAmount : adjustmentAmount;
      const { data, error: txError } = await supabase.rpc("adjust_loyalty_balance", {
        p_store_id: store.id,
        p_customer_id: scannedCustomer.id,
        p_amount: signedAmount,
        p_currency_type: currency,
        p_reason: reason.trim(),
      });
      if (txError) throw txError;
      const updated = Array.isArray(data) ? data[0] : data;
        
      alert("تمت العملية بنجاح!");
      setScannedCustomer({ ...scannedCustomer, ...(updated || {}) });
      setAdjustmentAmount(0);
      setReason("");
      
    } catch (e: any) {
      alert("حدث خطأ أثناء المعالجة: " + e.message);
    }
    
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-6 pt-4">
        <h1 className="text-2xl font-bold text-center">ماسح الولاء - {store.name}</h1>
        
        {!scannedCustomer ? (
          <Card>
            <CardHeader>
              <CardTitle>مسح رمز العميل</CardTitle>
              <CardDescription>قم بمسح رمز الـ QR الخاص بالعميل للتحقق من رصيده وإضافة أو خصم النقاط</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {scanning ? (
                <div className="w-full aspect-square bg-black rounded-lg overflow-hidden relative">
                  <video id="video-preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-primary/50 animate-pulse pointer-events-none m-8 rounded-xl" />
                  <Button variant="destructive" className="absolute bottom-4 left-1/2 -translate-x-1/2" onClick={() => { controlsRef.current?.stop(); setScanning(false); }}>
                    إلغاء المسح
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  <Button size="lg" className="w-full h-32 flex flex-col gap-2" onClick={startScanning}>
                    <ScanLine className="w-10 h-10" />
                    <span>تشغيل الكاميرا والمسح</span>
                  </Button>
                  
                  {scanError && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md flex gap-2 items-center text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {scanError}
                    </div>
                  )}
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">أو أدخل بيانات يدوياً</span></div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input placeholder="رقم جوال العميل" dir="ltr" value={phoneSearch} onChange={(e) => setPhoneSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && findByPhone()} />
                    <Button variant="outline" onClick={findByPhone}>بحث</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="bg-primary/5 border-b pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-primary" />
                    {scannedCustomer.name || 'عضوية العميل'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    رقم العضوية: <span className="font-mono text-foreground">{scannedCustomer.membership_number}</span>
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setScannedCustomer(null)}>مسح جديد</Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <p dir="ltr" className="text-center">{scannedCustomer.contact_phone || scannedCustomer.phone}</p>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-100 rounded-xl p-4">
                  <div className="text-sm text-muted-foreground mb-1">النقاط</div>
                  <div className="text-3xl font-black text-primary">{scannedCustomer.points_balance}</div>
                </div>
                <div className="bg-slate-100 rounded-xl p-4">
                  <div className="text-sm text-muted-foreground mb-1">الأختام</div>
                  <div className="text-3xl font-black text-primary">{scannedCustomer.stamps_balance}</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">تعديل الرصيد يدوياً</h3>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={adjustmentAmount || ""} 
                    onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                    min={0}
                    className="text-center font-bold text-lg"
                  />
                </div>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب العملية (إجباري)" />
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    className="text-green-600 border-green-200 hover:bg-green-50" 
                    onClick={() => handleAdjustment("add", "points")}
                    disabled={processing || !adjustmentAmount}
                  >
                    <Plus className="w-4 h-4 ml-1" /> إضافة نقاط
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleAdjustment("deduct", "points")}
                    disabled={processing || !adjustmentAmount}
                  >
                    <Minus className="w-4 h-4 ml-1" /> خصم نقاط
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-green-600 border-green-200 hover:bg-green-50" 
                    onClick={() => handleAdjustment("add", "stamps")}
                    disabled={processing || !adjustmentAmount}
                  >
                    <Plus className="w-4 h-4 ml-1" /> إضافة أختام
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleAdjustment("deduct", "stamps")}
                    disabled={processing || !adjustmentAmount}
                  >
                    <Minus className="w-4 h-4 ml-1" /> خصم أختام
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
