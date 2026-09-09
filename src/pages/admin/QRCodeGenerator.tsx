import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
export default function QRCodeGenerator({ store }) {
  const ref = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [destination, setDestination] = useState('menu');
  const url = `${window.location.origin}/s/${encodeURIComponent(store.slug)}${destination === 'loyalty' ? '/loyalty' : ''}`;
  function download() {
    const svg = ref.current?.querySelector('svg');
    if (!svg) return;
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
    link.href = objectUrl; link.download = `${store.slug}-${destination}-qr.svg`; link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
  return <section className="max-w-lg space-y-5">
    <h2 className="text-2xl font-bold">رمز QR للمطعم</h2>
    <label className="block">وجهة الرمز<select className="mt-2 w-full rounded-xl border bg-background p-3" value={destination} onChange={e => setDestination(e.target.value)}><option value="menu">قائمة المطعم والطلبات</option><option value="loyalty">برنامج الولاء</option></select></label>
    <div className="rounded-2xl border bg-white p-8 text-center" ref={ref}><h3 className="mb-4 text-xl font-bold" style={{color:'#111'}}>{store.name}</h3><QRCodeSVG className="mx-auto max-w-full" value={url} size={256} marginSize={4} bgColor="#ffffff" fgColor="#000000" /><p className="mt-3 break-all" dir="ltr" style={{color:'#111'}}>{url}</p></div>
    <div className="flex flex-wrap gap-3"><button onClick={download} className="rounded-xl bg-primary px-4 py-3 text-primary-foreground">تحميل QR للطباعة (SVG)</button><button className="rounded-xl border px-4 py-3" onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage('تم نسخ الرابط'); } catch { setMessage('تعذر النسخ، انسخ الرابط المعروض يدويًا'); } }}>نسخ الرابط</button><a href={url} target="_blank" rel="noreferrer" className="rounded-xl border px-4 py-3">فتح الرابط</a></div>
    <p role="status">{message}</p>
  </section>;
}
