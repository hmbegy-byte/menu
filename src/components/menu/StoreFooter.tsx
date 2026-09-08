import React from "react";
import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Instagram, Facebook, Link as LinkIcon, MessageCircle } from "lucide-react";

export function StoreFooter({ store }) {
  if (!store) return null;

  const { social_links, working_hours } = store;
  const hasSocials =
    social_links &&
    (social_links.instagram || social_links.facebook || social_links.tiktok || social_links.map);
  const hasHours = working_hours && working_hours.length > 0;

  return (
    <footer className="mt-8 mb-8 mx-4 bg-surface rounded-3xl p-6 space-y-6">
      <a href={`/s/${encodeURIComponent(store.slug)}/loyalty`} className="block rounded-2xl bg-primary p-4 text-center font-bold text-primary-foreground">برنامج الولاء — انضم أو اعرض بطاقتك</a>
      {hasHours && (
        <div>
          <h3 className="font-bold text-base flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" /> أوقات العمل
          </h3>
          <div className="space-y-2">
            {working_hours.map((day) => (
              <div key={day.id} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{day.dayName}</span>
                <span className="font-medium">
                  {day.isOpen ? (
                    `${day.from} - ${day.to}`
                  ) : (
                    <span className="text-destructive font-bold">مغلق</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSocials && (
        <div className="pt-4 border-t border-border">
          <h3 className="font-bold text-base flex items-center gap-2 mb-3">
            <LinkIcon className="w-5 h-5 text-primary" /> تواصل معنا
          </h3>
          <div className="flex gap-4 flex-wrap">
            {social_links.instagram && (
              <a
                href={social_links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-surface-strong rounded-2xl text-foreground hover:bg-primary hover:text-white transition-colors"
              >
                <Instagram className="w-6 h-6" />
              </a>
            )}
            {social_links.facebook && (
              <a
                href={social_links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-surface-strong rounded-2xl text-foreground hover:bg-primary hover:text-white transition-colors"
              >
                <Facebook className="w-6 h-6" />
              </a>
            )}
            {social_links.tiktok && (
              <a
                href={social_links.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-surface-strong rounded-2xl text-foreground hover:bg-primary hover:text-white transition-colors flex items-center justify-center font-bold"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.68a6.34 6.34 0 0 0 6.27 6.36 6.34 6.34 0 0 0 6.25-6.36V8.05a8.36 8.36 0 0 0 4.39 1.28V5.88a5.3 5.3 0 0 1-2.32-.23z" />
                </svg>
              </a>
            )}
            {social_links.map && (
              <a
                href={social_links.map}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-surface-strong rounded-2xl text-foreground hover:bg-primary hover:text-white transition-colors"
              >
                <MapPin className="w-6 h-6" />
              </a>
            )}
            {store.phone_whatsapp && (
              <a
                href={`https://wa.me/${store.phone_whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-surface-strong rounded-2xl text-foreground hover:bg-[#25D366] hover:text-white transition-colors"
              >
                <MessageCircle className="w-6 h-6" />
              </a>
            )}
          </div>
        </div>
      )}
      {store.legal?.legalName && (
        <div className="border-t border-border pt-4 text-sm leading-7 text-muted-foreground">
          <p className="font-bold text-foreground">بيانات مقدم الخدمة</p>
          <p>{store.legal.legalName}</p>
          {store.legal.commercialRegistration && (
            <p>السجل التجاري: {store.legal.commercialRegistration}</p>
          )}
          {store.legal.vatNumber && <p>الرقم الضريبي: {store.legal.vatNumber}</p>}
          {store.legal.nationalAddress && <p>العنوان: {store.legal.nationalAddress}</p>}
          {(store.legal.supportEmail || store.legal.complaintPhone) && (
            <p>الشكاوى والدعم: {store.legal.supportEmail || store.legal.complaintPhone}</p>
          )}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
        <Link to="/legal/privacy" className="hover:text-primary">
          سياسة الخصوصية
        </Link>
        <Link to="/legal/terms" className="hover:text-primary">
          الشروط والأحكام
        </Link>
        <span>المطعم هو البائع والمنفذ للطلب، والمنصة توفر البنية التقنية.</span>
      </div>
    </footer>
  );
}
