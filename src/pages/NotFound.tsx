import React from "react";
import { Store } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
          <Store size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">المتجر غير متوفر حالياً</h1>
        <p className="text-gray-500">عذراً، هذا المتجر غير موجود أو غير مفعل في الوقت الحالي.</p>
      </div>
    </div>
  );
}
