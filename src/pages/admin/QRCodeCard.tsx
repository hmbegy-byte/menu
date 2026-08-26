import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";

export default function QRCodeCard({ store }) {
  const qrRef = useRef(null);
  const storeUrl = `${window.location.origin}/s/${store.slug}`;

  const downloadQRCode = async () => {
    if (!qrRef.current) return;
    try {
      const canvas = await html2canvas(qrRef.current, { scale: 2, useCORS: true });
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${store.slug}-qrcode.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error("Error generating QR code image", err);
      alert("حدث خطأ أثناء تحميل كود QR");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      {/* The Card to be captured */}
      <div
        ref={qrRef}
        className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center text-center w-full relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
        <h2 className="text-2xl font-black text-gray-900 mt-2 mb-1">{store.name}</h2>
        <p className="text-sm text-gray-500 mb-6">امسح الكود للطلب مباشرة</p>

        <div
          data-qr-surface
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 inline-block mb-4"
        >
          <QRCodeSVG
            value={storeUrl}
            size={180}
            level={"H"}
            bgColor={"#ffffff"}
            fgColor={"#000000"}
          />
        </div>
        <p className="text-xs text-gray-400 font-mono" dir="ltr">
          {storeUrl}
        </p>
      </div>

      {/* Download Button */}
      <button
        onClick={downloadQRCode}
        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
      >
        <Download size={20} />
        <span>تحميل كود الـ QR للطباعة</span>
      </button>
    </div>
  );
}
