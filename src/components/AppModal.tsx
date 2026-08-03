import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';

export type RequestModalClose = (afterClose?: () => void) => void;

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode | ((requestClose: RequestModalClose) => ReactNode);
  actions: ReactNode | ((requestClose: RequestModalClose) => ReactNode);
  className?: string;
};

const CLOSE_DURATION = 220;

export function AppModal({ title, onClose, children, actions, className = '' }: Props) {
  const titleId = useId();
  const [isClosing, setIsClosing] = useState(false);
  const closingRef = useRef(false);
  const requestClose = useCallback<RequestModalClose>((afterClose) => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    window.setTimeout(() => (afterClose ?? onClose)(), CLOSE_DURATION);
  }, [onClose]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('app-modal-open');
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.classList.remove('app-modal-open');
    };
  }, [requestClose]);

  return (
    <div className={`app-modal-backdrop${isClosing ? ' app-modal-backdrop--closing' : ''}`}
      role="presentation" aria-hidden={isClosing || undefined}>
      <section className={`app-modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="app-modal__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={() => requestClose()} disabled={isClosing} aria-label="Закрыть">×</button>
        </header>
        <div className="app-modal__content">{typeof children === 'function' ? children(requestClose) : children}</div>
        <footer className="app-modal__actions">{typeof actions === 'function' ? actions(requestClose) : actions}</footer>
      </section>
    </div>
  );
}
