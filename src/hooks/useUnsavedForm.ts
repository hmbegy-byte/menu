import { useEffect, useRef } from 'react';

export function useUnsavedForm(value: unknown) {
  const saved = useRef(JSON.stringify(value));
  const dirty = JSON.stringify(value) !== saved.current;
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: Event) => { if (!window.confirm('لديك تعديلات غير محفوظة. هل تريد المغادرة وتجاهلها؟')) event.preventDefault(); };
    window.addEventListener('beforeunload', unload);
    window.addEventListener('admin:leave', navigate);
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener('admin:leave', navigate); };
  }, [dirty]);
  return { dirty, markSaved: () => { saved.current = JSON.stringify(value); } };
}
