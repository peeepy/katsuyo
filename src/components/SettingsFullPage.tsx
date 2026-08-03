import { useEffect, type ReactNode } from 'react';

interface SettingsFullPageProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function SettingsFullPage({ title, onClose, children, footer }: SettingsFullPageProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fullpage" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fullpage-header">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Back">←</button>
        <h3>{title}</h3>
        <span className="fullpage-header-spacer" aria-hidden="true" />
      </div>
      <div className="fullpage-body">{children}</div>
      {footer && <div className="fullpage-footer">{footer}</div>}
    </div>
  );
}