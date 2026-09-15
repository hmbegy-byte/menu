import { useEffect, useState } from "react";

export function useUnsavedForm(value: unknown) {
  const snapshot = JSON.stringify(value);
  const [saved, setSaved] = useState(snapshot);
  const dirty = snapshot !== saved;
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: Event) => {
      if (!window.confirm("لديك تعديلات غير محفوظة. هل تريد المغادرة وتجاهلها؟"))
        event.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("admin:leave", navigate);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("admin:leave", navigate);
    };
  }, [dirty]);
  // Capture this render's submitted value, not edits made while its save is pending.
  return {
    dirty,
    markSaved: () => {
      setSaved(snapshot);
    },
  };
}
