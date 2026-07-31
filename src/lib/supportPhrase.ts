import { createSupportPhrase } from './ai';
import { getLocalDateKey, loadStoredTasks } from './tasks';

const HISTORY_KEY = 'baw-support-phrases-v1';
const HISTORY_LIMIT = 5;

const fallbackPhrases = [
  'Даже две минуты — уже спокойное движение вперёд.',
  'Можно начать с самого маленького шага — этого достаточно.',
  'Необязательно видеть весь путь, достаточно выбрать первый шаг.',
  'Можно не спешить: начни с того, что сейчас кажется посильным.',
  'Один небольшой шаг поможет мягко войти в работу.',
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

function getCurrentTaskTitle() {
  const tasks = loadStoredTasks().filter((task) => task.status !== 'done');
  return tasks.find((task) => task.dueDate === getLocalDateKey())?.title
    ?? tasks.find((task) => task.status === 'in_progress')?.title;
}

function cleanPhrase(value: string) {
  const phrase = value.replace(/^["«„]|["»“]$/g, '').replace(/\s+/g, ' ').trim();
  if (!phrase || phrase.length > 140 || /[\r\n]/.test(value)) {
    throw new Error('Некорректная поддерживающая фраза.');
  }
  return phrase;
}

function chooseFallback(recentPhrases: string[]) {
  return fallbackPhrases.find((phrase) => !recentPhrases.includes(phrase)) ?? fallbackPhrases[0];
}

export async function loadSupportPhrase(displayName?: string) {
  const recentPhrases = loadRecentPhrases();
  try {
    const generated = await createSupportPhrase({
      displayName,
      taskTitle: getCurrentTaskTitle(),
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
