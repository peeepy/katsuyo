import { useEffect, useRef, useState } from 'react';

export function WordTypeHint({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  return (
    <div className="hint-wrap" ref={ref}>
      <button type="button" className="hint-btn" onClick={() => setOpen(o => !o)} aria-label="Word type hint">
        ?
      </button>
      {open && <div className="hint-tooltip">{label}</div>}
    </div>
  );
}