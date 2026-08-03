export type Language = 'ru' | 'en';

export const LANGUAGE_STORAGE_KEY = 'flowstep-language';

export function isLanguage(value: unknown): value is Language {
  return value === 'ru' || value === 'en';
}

export function getStoredLanguage(): Language {
  const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(value) ? value : 'ru';
}

export function storeLanguage(language: Language) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  document.documentElement.lang = language;
}

export function currentLanguage(): Language {
  return typeof window === 'undefined' ? 'ru' : getStoredLanguage();
}
