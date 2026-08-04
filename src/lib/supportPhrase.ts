import { createSupportPhrase } from './ai';

const HISTORY_KEY = 'baw-support-phrases-v1';
const HISTORY_LIMIT = 5;

const fallbackPhrases = [
  'Можно начать спокойно — не обязательно делать всё сразу.',
  'Небольшое движение вперёд уже имеет значение.',
  'Не нужно быть идеально готовым, чтобы начать.',
  'Двигаться в удобном темпе — уже достаточно.',
  'Мягкое начало тоже может быть хорошим началом.',
];

function loadRecentPhrases() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string').slice(0, HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function rememberPhrase(phrase: string, recentPhrases: string[]) {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify([phrase, ...recentPhrases.filter((item) => item !== phrase)].slice(0, HISTORY_LIMIT)),
  );
}

function cleanPhrase(value: string) {
  const phrase = value.replace(/^["«„]|["»“]$/g, '').replace(/\s+/g, ' ').trim();
  if (!phrase || phrase.length > 110 || /[\r\n]/.test(value)) {
    throw new Error('Некорректная поддерживающая фраза.');
  }
  return phrase;
}

function chooseFallback(recentPhrases: string[]) {
  return fallbackPhrases.find((phrase) => !recentPhrases.includes(phrase)) ?? fallbackPhrases[0];
}

export async function loadSupportPhrase(_displayName?: string) {
  const recentPhrases = loadRecentPhrases();
  try {
    const generated = await createSupportPhrase({
      recentPhrases,
    });
    const phrase = cleanPhrase(generated);
    if (recentPhrases.includes(phrase)) {
      const fallback = chooseFallback(recentPhrases);
      rememberPhrase(fallback, recentPhrases);
      return fallback;
    }
    rememberPhrase(phrase, recentPhrases);
    return phrase;
  } catch {
    const fallback = chooseFallback(recentPhrases);
    rememberPhrase(fallback, recentPhrases);
    return fallback;
  }
}
