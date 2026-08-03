import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useProfile } from './ProfileProvider';
import { getStoredLanguage, Language, storeLanguage } from '../lib/locale';
import { saveProfileLanguage } from '../lib/profile';
import { english } from '../lib/translations';

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (text: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);
const textOriginals = new WeakMap<Node, string>();
const attributeOriginals = new WeakMap<Element, Map<string, string>>();

function translate(text: string, language: Language) {
  if (language === 'ru') return text;
  const exact = english[text.trim()];
  if (exact) return text.replace(text.trim(), exact);
  return text
    .replace(/^Доброе утро(?:, (.+))?$/, (_, name: string | undefined) => name ? `Good morning, ${name}` : 'Good morning')
    .replace(/^Редактировать профиль (.+)$/, 'Edit profile $1')
    .replace(/^Твоя задача:\s*/, 'Your task: ')
    .replace(/^Ты последовательно завершил задачу «(.+)»\.$/, 'You completed “$1” one step at a time.')
    .replace(/^После этого — (\d+) минут отдыха$/, 'After this — a $1-minute break')
    .replace(/^(?:Фокус|Отдых) · цикл (\d+) из 4$/, 'Focus · cycle $1 of 4')
    .replace(/(\d+)\s+мин(?:ут[а-я]*)?/g, '$1 min')
    .replace(/(\d+)\s+(?:день|дня|дней)/g, '$1 days')
    .replace(/(\d+)\s+из\s+(\d+)\s+шагов/g, '$1 of $2 steps')
    .replace(/Выполнено\s+(\d+)\s+из\s+(\d+)\s+шагов/g, '$1 of $2 steps completed');
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useProfile();
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    if (profile?.language && profile.language !== language) setLanguageState(profile.language);
  }, [profile?.language]);

  useEffect(() => {
    storeLanguage(language);
    const translateTree = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const parent = node.parentElement;
        if (parent && !['SCRIPT', 'STYLE'].includes(parent.tagName) && !parent.closest('[data-user-text]')) {
          const current = node.textContent ?? '';
          const previous = textOriginals.get(node);
          if (previous === undefined || (current !== previous && current !== translate(previous, language))) {
            textOriginals.set(node, current);
          }
          const original = textOriginals.get(node) ?? '';
          const next = translate(original, language);
          if (node.textContent !== next) node.textContent = next;
        }
        node = walker.nextNode();
      }
      if (root instanceof Element || root instanceof Document) {
        root.querySelectorAll<HTMLElement>('[placeholder],[aria-label],[title]').forEach((element) => {
          ['placeholder', 'aria-label', 'title'].forEach((attribute) => {
            const current = element.getAttribute(attribute);
            let originals = attributeOriginals.get(element);
            if (!originals) { originals = new Map(); attributeOriginals.set(element, originals); }
            const previous = originals.get(attribute);
            if (current && (previous === undefined || (current !== previous && current !== translate(previous, language)))) {
              originals.set(attribute, current);
            }
            const original = originals.get(attribute);
            if (original) element.setAttribute(attribute, translate(original, language));
          });
        });
      }
    };
    translateTree(document.body);
    const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => {
      mutation.addedNodes.forEach(translateTree);
      if (mutation.type === 'characterData') translateTree(mutation.target.parentNode ?? mutation.target);
    }));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.title = language === 'en' ? 'FlowStep — small steps forward' : 'FlowStep — маленькие шаги вперёд';
    return () => observer.disconnect();
  }, [language]);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    storeLanguage(next);
    if (user) void saveProfileLanguage(user.id, next);
  };
  const value = useMemo(() => ({ language, setLanguage, t: (text: string) => translate(text, language) }), [language, user]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}
