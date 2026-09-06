import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useStoreData } from "../hooks/useStoreData";
import { BrandUpdater } from "../components/BrandUpdater";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Gift, Apple, Smartphone, LogOut } from "lucide-react";

export default function LoyaltyPage({ storeSlug }: { storeSlug: string }) {
  const { store, brand_assets, loading: storeLoading } = useStoreData(storeSlug);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  
  const [loyaltyProgram, setLoyaltyProgram] = useState<any>(null);
  const [loyaltyAccount, setLoyaltyAccount] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && store?.id) {
      loadLoyaltyData();
    }
  }, [session, store?.id]);

  const loadLoyaltyData = async () => {
    if (!store?.organization_id || !session?.user?.id) return;
    
    // Fetch Program
    const { data: prog } = await supabase
      .from("loyalty_programs")
      .select("*")
      .eq("organization_id", store.organization_id)
      .eq("is_active", true)
      .maybeSingle();
      
    if (prog) {
      setLoyaltyProgram(prog);
      
      // Fetch Account
      let { data: acc } = await supabase
        .from("loyalty_customers")
        .select("*")
        .eq("organization_id", store.organization_id)
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
        
      if (!acc) {
        // Create account
        const { data: newAcc } = await supabase
          .from("loyalty_customers")
          .insert({
            organization_id: store.organization_id,
            auth_user_id: session.user.id,
            phone: session.user.phone,
          })
          .select()
          .single();
        acc = newAcc;
      }
      setLoyaltyAccount(acc);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    setLoading(false);
    if (error) {
      alert("Error sending OTP: " + error.message);
    } else {
      setOtpSent(true);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (error) {
      alert("Error verifying OTP: " + error.message);
    }
  };

  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  if (storeLoading || loading) {
    return <div className="min-h-screen grid place-items-center bg-slate-50">جاري التحميل...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <BrandUpdater assets={brand_assets} isStore />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {store?.logo_url && (
              <img src={store.logo_url} alt="Logo" className="w-20 h-20 mx-auto rounded-full object-cover mb-4" />
            )}
            <CardTitle>نظام الولاء</CardTitle>
            <CardDescription>سجل الدخول لعرض نقاطك ومكافآتك</CardDescription>
          </CardHeader>
          <CardContent>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label>رقم الجوال</Label>
                  <Input 
                    type="tel" 
                    placeholder="+966500000000" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    required 
                    dir="ltr"
                    className="text-right"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  إرسال الرمز
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label>رمز التحقق</Label>
                  <Input 
                    type="text" 
                    placeholder="123456" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    required 
                    dir="ltr"
                    className="text-center text-xl tracking-widest"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  تحقق
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!loyaltyProgram) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <BrandUpdater assets={brand_assets} isStore />
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p>برنامج الولاء غير مفعل حالياً لهذا المطعم.</p>
            <Button variant="outline" className="mt-4" onClick={handleSignOut}>تسجيل الخروج</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate QR string with secure token
  const qrData = JSON.stringify({
    a: loyaltyAccount?.id, // account id
    t: loyaltyAccount?.qr_token
  });

  return (
    <div 
      className="min-h-screen bg-slate-50 pb-20 transition-colors duration-300"
      style={{
        "--theme-primary": brand_assets?.theme_color || "#0284c7",
      } as React.CSSProperties}
      dir="rtl"
    >
      <BrandUpdater assets={brand_assets} isStore />
      
      <header className="bg-[var(--theme-primary)] text-white p-6 rounded-b-[2rem] shadow-md mb-6 relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4 text-white hover:bg-white/20"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5" />
        </Button>
        <div className="text-center mt-4">
          {store?.logo_url ? (
            <img src={store.logo_url} alt="Logo" className="w-20 h-20 mx-auto rounded-full object-cover border-4 border-white/20 mb-3" />
          ) : (
            <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-3">
              <Gift className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold">{store?.name}</h1>
          <p className="opacity-90">برنامج الولاء والمكافآت</p>
        </div>
      </header>

      <main className="px-4 max-w-md mx-auto space-y-6">
        {/* Balance Card */}
        <Card className="border-0 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--theme-primary)] opacity-10 rounded-bl-full -z-10" />
          <CardContent className="p-6 text-center">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              {loyaltyProgram.program_type === 'points' ? 'رصيد النقاط' : 'أختامك الحالية'}
            </h2>
            <div className="text-5xl font-black text-[var(--theme-primary)] flex items-center justify-center gap-2">
              {loyaltyAccount?.points_balance || 0}
              {loyaltyProgram.program_type === 'points' && <span className="text-lg text-muted-foreground font-normal">نقطة</span>}
            </div>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">بطاقة الولاء الخاصة بك</CardTitle>
            <CardDescription>امسح هذا الرمز عند الكاشير</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl shadow-inner mb-6">
              {loyaltyAccount && (
                <QRCodeSVG
                  value={qrData}
                  size={200}
                  level="H"
                  includeMargin={false}
                  imageSettings={
                    store?.logo_url ? {
                      src: store.logo_url,
                      x: undefined,
                      y: undefined,
                      height: 40,
                      width: 40,
                      excavate: true,
                    } : undefined
                  }
                />
              )}
            </div>

            {(loyaltyProgram.wallet_settings?.apple_enabled || loyaltyProgram.wallet_settings?.samsung_enabled) && <div className="grid grid-cols-2 gap-3 w-full">
              {loyaltyProgram.wallet_settings?.apple_enabled && (
              <Button variant="outline" className="flex gap-2">
                <Apple className="w-4 h-4" />
                Apple Wallet
              </Button>
              )}
              {loyaltyProgram.wallet_settings?.samsung_enabled && (
              <Button variant="outline" className="flex gap-2">
                <Smartphone className="w-4 h-4" />
                Samsung Wallet
              </Button>
              )}
            </div>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
