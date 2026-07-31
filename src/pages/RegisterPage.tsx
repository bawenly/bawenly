import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuthModal } from '../components/AuthModal';

export function RegisterPage() {
  const [, navigate] = useLocation();
  const { openAuth } = useAuthModal();

  useEffect(() => {
    navigate('/');
    openAuth();
  }, [navigate, openAuth]);

  return null;
}
