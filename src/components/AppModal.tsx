import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type RequestModalClose = (afterClose?: () => void) => void;

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode | ((requestClose: RequestModalClose) => ReactNode);
  actions: ReactNode | ((requestClose: RequestModalClose) => ReactNode);
  className?: string;
  closeDisabled?: boolean;
};

const CLOSE_DURATION = 220;

export function AppModal({ title, onClose, children, actions, className = '', closeDisabled = false }: Props) {
  const titleId = useId();
  const [isClosing, setIsClosing] = useState(false);
  const closingRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const requestClose = useCallback<RequestModalClose>((afterClose) => {
    if (closingRef.current || closeDisabled) return;
    closingRef.current = true;
    setIsClosing(true);
    window.setTimeout(() => (afterClose ?? onClose)(), CLOSE_DURATION);
  }, [closeDisabled, onClose]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    document.documentElement.classList.add('app-modal-open');
    document.body.classList.add('app-modal-open');
    contentRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.documentElement.classList.remove('app-modal-open');
      document.body.classList.remove('app-modal-open');
    };
  }, [requestClose]);

  return createPortal(
    <div className={`app-modal-backdrop${isClosing ? ' app-modal-backdrop--closing' : ''}`}
      role="presentation" aria-hidden={isClosing || undefined}>
      <section className={`app-modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="app-modal__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={() => requestClose()} disabled={isClosing || closeDisabled} aria-label="Закрыть">×</button>
        </header>
        <div className="app-modal__content" ref={contentRef} tabIndex={0}>
          {typeof children === 'function' ? children(requestClose) : children}
        </div>
        <footer className="app-modal__actions">{typeof actions === 'function' ? actions(requestClose) : actions}</footer>
      </section>
    </div>,
    document.body,
  );
}
