import { useEffect, useRef, useState } from 'react';
import { useLanguage } from './LanguageProvider';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = language === 'ru' ? 'RU' : 'ENG';
  const alternative = language === 'ru' ? 'ENG' : 'RU';

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  return <div className="language-switcher" ref={rootRef}>
    <button type="button" aria-label="Выбрать язык" aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)}>{current}</button>
    {isOpen && <div className="language-switcher__menu">
      <button type="button" onClick={() => { setLanguage(alternative === 'ENG' ? 'en' : 'ru'); setIsOpen(false); }}>{alternative}</button>
    </div>}
  </div>;
}
