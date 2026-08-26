import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstaller() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!promptEvent || hidden) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-4 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-purple-200 bg-card p-3 text-foreground shadow-xl"
    >
      <div className="min-w-0">
        <p className="font-bold">ثبّت النظام على جهازك</p>
        <p className="text-xs text-muted-foreground">يفتح كتطبيق مستقل دون متجر تطبيقات.</p>
      </div>
      <button
        type="button"
        onClick={async () => {
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
        aria-label="إخفاء"
        onClick={() => setHidden(true)}
        className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
      >
        <X size={16} />
      </button>
    </div>
  );
}
