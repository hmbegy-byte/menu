import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { safeInstalledStartPath } from "../lib/hostedAppDestination.mjs";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstaller() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() =>
    typeof window === "undefined" ? false : sessionStorage.getItem("pwa-install-hidden") === "1",
  );
  const [checkoutActive, setCheckoutActive] = useState(false);

  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onCheckoutState = (event: Event) => {
      setCheckoutActive(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("flavor-flow:checkout-active", onCheckoutState);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("flavor-flow:checkout-active", onCheckoutState);
    };
  }, []);

  if (!promptEvent || hidden || checkoutActive) return null;

  return (
    <div
      dir="rtl"
      className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border bg-card p-3 text-foreground shadow-float sm:right-auto sm:bottom-4 sm:left-4 sm:mx-0"
    >
      <div className="min-w-0">
        <p className="font-bold">ثبّت النظام على جهازك</p>
        <p className="text-xs text-muted-foreground">يفتح كتطبيق مستقل دون متجر تطبيقات.</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          const startPath = safeInstalledStartPath(window.location.pathname);
          if (startPath) localStorage.setItem("flavor-flow:installed-start", startPath);
          await promptEvent.prompt();
          await promptEvent.userChoice;
          setPromptEvent(null);
        }}
        className="flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
      >
        <Download size={16} /> تثبيت
      </button>
      <button
        type="button"
        aria-label="إخفاء اقتراح التثبيت لهذه الجلسة"
        onClick={() => {
          sessionStorage.setItem("pwa-install-hidden", "1");
          setHidden(true);
        }}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
      >
        <X size={16} />
      </button>
    </div>
  );
}
