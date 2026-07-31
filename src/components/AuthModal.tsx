import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthForm } from './AuthForm';
import { supabase } from '../lib/supabase';

type AuthModalContextValue = {
  openAuth: (onSuccess?: () => void) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const successAction = useRef<(() => void) | undefined>();

  const close = useCallback(() => {
    setIsOpen(false);
    successAction.current = undefined;
  }, []);

  const completeAuth = useCallback(() => {
    const action = successAction.current;
    successAction.current = undefined;
    setIsOpen(false);
    action?.();
  }, []);

  const openAuth = useCallback((onSuccess?: () => void) => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        onSuccess?.();
        return;
      }
      successAction.current = onSuccess;
      setIsOpen(true);
    });
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && successAction.current) completeAuth();
    });
    return () => data.subscription.unsubscribe();
  }, [completeAuth]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.body.classList.add('auth-modal-open');
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('auth-modal-open');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [close, isOpen]);

  return (
    <AuthModalContext.Provider value={{ openAuth }}>
      {children}
      {isOpen && (
        <div className="auth-modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) close();
        }}>
          <div className="auth-modal__dialog" role="dialog" aria-modal="true" aria-label="Регистрация и вход">
            <button className="auth-modal__close" type="button" onClick={close} aria-label="Закрыть">×</button>
            <AuthForm onSuccess={completeAuth} />
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) throw new Error('useAuthModal must be used inside AuthModalProvider');
  return context;
}
