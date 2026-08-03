import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

const DISMISS_THRESHOLD_PX = 90;

export function BottomSheet({ title, onClose, children, footer }: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    // Only start a drag-to-dismiss gesture when the inner content is scrolled
    // all the way to the top — otherwise this would hijack normal scrolling.
    if (scrollableRef.current && scrollableRef.current.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    setDragging(true);
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!dragging || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setDragY(delta);
  };

  const onTouchEnd = () => {
    setDragging(false);
    if (dragY > DISMISS_THRESHOLD_PX) {
      onClose();
    } else {
      setDragY(0);
    }
    startY.current = null;
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet-content"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : undefined,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="sheet-drag-zone"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="sheet-grabber" aria-hidden="true" />
          <div className="sheet-header">
            <h3>{title}</h3>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="sheet-body" ref={scrollableRef}>{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>
  );
}