import { useEffect, useState } from 'react';
import { useLanguage } from '../components/LanguageProvider';

function formatCurrentDate(language: 'ru' | 'en') {
  const dateFormatter = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const label = dateFormatter.format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function useCurrentDateLabel() {
  const { language } = useLanguage();
  const [label, setLabel] = useState(() => formatCurrentDate(language));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setLabel(formatCurrentDate(language));
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [language]);

  useEffect(() => setLabel(formatCurrentDate(language)), [language]);

  return label;
}
