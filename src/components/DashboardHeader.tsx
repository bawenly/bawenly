import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Brand } from './Brand';
import { useAuthModal } from './AuthModal';
import { useProfile } from './ProfileProvider';
import { UserAvatar } from './UserAvatar';
import { formatVisitStreak } from '../lib/visitStreak';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from './LanguageProvider';

export function DashboardHeader() {
  const { openAuth } = useAuthModal();
  const { user, profile } = useProfile();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 4);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={`dashboard-header${isScrolled ? ' dashboard-header--scrolled' : ''}`}>
      <div className="dashboard-header__inner">
        <Brand />
        <nav className="dashboard-nav" aria-label="Основная навигация">
          <Link className={`dashboard-nav__link${location === '/' ? ' dashboard-nav__link--active' : ''}`} href="/">Сегодня</Link>
          <Link className={`dashboard-nav__link${location === '/tasks' ? ' dashboard-nav__link--active' : ''}`} href="/tasks">Задачи</Link>
          <Link className={`dashboard-nav__link${location === '/progress' ? ' dashboard-nav__link--active' : ''}`} href="/progress">Прогресс</Link>
          <Link className={`dashboard-nav__link${location === '/timer' ? ' dashboard-nav__link--active' : ''}`} href="/timer">Таймер</Link>
        </nav>
        <div className="dashboard-account">
          {user && profile && (
            <span className="streak">
              <span aria-hidden="true">✦</span> {formatVisitStreak(profile.visitStreak, language)}
            </span>
          )}
          <LanguageSwitcher />
          <div className="dashboard-account__auth">
            {user === null && (
              <button className="header-login-button" type="button" onClick={() => openAuth()}>Вход</button>
            )}
            {user && (
              <div className="profile-menu">
                <Link
                  className="profile-menu__button"
                  href="/profile"
                  aria-label={`Редактировать профиль${profile?.displayName ? ` ${profile.displayName}` : ''}`}
                >
                  <UserAvatar name={profile?.displayName ?? ''} avatarUrl={profile?.avatarUrl ?? null} />
                </Link>
              </div>
            )}
          </div>
          <button
            className={`menu-button${isMobileMenuOpen ? ' menu-button--open' : ''}`}
            type="button"
            aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          >
            <span /><span />
          </button>
        </div>
      </div>
      <nav
        className={`mobile-menu${isMobileMenuOpen ? ' mobile-menu--open' : ''}`}
        id="mobile-menu"
        aria-label="Мобильная навигация"
      >
        <Link href="/" onClick={closeMenus}>Сегодня</Link>
        <Link href="/tasks" onClick={closeMenus}>Задачи</Link>
        <Link href="/progress" onClick={closeMenus}>Прогресс</Link>
        <Link href="/timer" onClick={closeMenus}>Таймер</Link>
        {user && <Link className="mobile-menu__profile" href="/profile" onClick={closeMenus}>Редактировать профиль</Link>}
      </nav>
    </header>
  );
}
