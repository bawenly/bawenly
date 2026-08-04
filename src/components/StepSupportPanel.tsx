import { useEffect, useMemo, useState } from 'react';
import { createStepSupport, resolveStepSupport } from '../lib/stepSupport';
import { useLanguage } from './LanguageProvider';
import type { StepSupport } from '../lib/tasks';

const STORAGE_KEY = 'baw-step-support-v1';
type SavedOption = { id: string; label: string; intent: string; result?: string };
type SavedHelp = { message: string; options: SavedOption[]; selectedId?: string; result?: string };
type HelpStore = Record<string, SavedHelp>;
export type ActiveStepSupport = { taskId: string; task: string; reason: string; stepId: string;
  step: string; completedSteps: string[]; preparedSupport?: StepSupport };

function loadStore(): HelpStore {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as HelpStore; } catch { return {}; }
}

export function clearStepSupport(taskId?: string) {
  if (!taskId) return localStorage.removeItem(STORAGE_KEY);
  const next = Object.fromEntries(Object.entries(loadStore())
    .filter(([key]) => !key.startsWith(`${taskId}:`)));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function StepSupportPanel({ context }: { context: ActiveStepSupport }) {
  const { language } = useLanguage();
  const cacheKey = `${context.taskId}:${context.stepId}:${language}`;
  const [store, setStore] = useState<HelpStore>(loadStore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const prepared = context.preparedSupport;
  const saved = store[cacheKey];
  const contextKey = useMemo(() => JSON.stringify(context), [context]);

  useEffect(() => {
    if (saved) return;
    if (prepared) {
      setStore((current) => ({ ...current, [cacheKey]: { message: prepared.message,
        options: prepared.options.map((option) => ({ ...option, intent: '' })) } }));
      return;
    }
    let active = true;
    setLoading(true); setError('');
    void createStepSupport(context).then((suggestion) => {
      if (!active) return;
      setStore((current) => ({ ...current, [cacheKey]: suggestion }));
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : '');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cacheKey, contextKey, prepared, saved]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }, [store]);

  async function selectOption(option: SavedOption) {
    const preparedOption = prepared?.options.find((item) => item.id === option.id);
    if (preparedOption) {
      setStore((current) => ({ ...current, [cacheKey]: {
        message: prepared?.message ?? '', options: (prepared?.options ?? []).map((item) => ({ ...item, intent: '' })),
        selectedId: option.id, result: preparedOption.result,
      } }));
      return;
    }
    setStore((current) => ({ ...current, [cacheKey]: { ...current[cacheKey], selectedId: option.id } }));
    if (saved?.selectedId === option.id && saved.result) return;
    setLoading(true); setError('');
    try {
      const result = await resolveStepSupport(context, option);
      setStore((current) => ({ ...current, [cacheKey]: { ...current[cacheKey], selectedId: option.id, result } }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '');
    } finally { setLoading(false); }
  }

  const selected = saved?.options.find((option) => option.id === saved.selectedId);
  return (
    <aside className="support-card support-card--done step-support" aria-live="polite">
      <p className="eyebrow">{language === 'en' ? 'Help for this step' : 'Помощь для этого шага'}</p>
      {selected ? <>
        <button className="step-support__back" type="button"
          onClick={() => setStore((current) => ({ ...current, [cacheKey]: { ...current[cacheKey], selectedId: undefined, result: undefined } }))}>
          ← {language === 'en' ? 'All options' : 'Все варианты'}
        </button>
        <h2>{selected.label}</h2>
        {loading && !saved?.result ? <p>{language === 'en' ? 'Preparing help…' : 'Готовлю помощь…'}</p>
          : <p className="step-support__result">{saved?.result}</p>}
      </> : <>
        <h2>{saved?.message || (language === 'en' ? 'What would make this step easier?' : 'Что поможет с этим шагом?')}</h2>
        {loading && !saved ? <p>{language === 'en' ? 'Finding useful options…' : 'Подбираю полезные варианты…'}</p> : null}
        {saved?.options.length ? <div className="step-support__options">
          {saved.options.map((option) => <button type="button" key={option.id}
            onClick={() => void selectOption(option)}>{option.label}<span aria-hidden="true">→</span></button>)}
        </div> : null}
      </>}
      {error && <p className="ai-error" role="alert">{error}</p>}
      {error && <button className="step-support__back" type="button"
        onClick={() => { setStore((current) => { const next = { ...current }; delete next[cacheKey]; return next; }); setError(''); }}>
        {language === 'en' ? 'Try again' : 'Попробовать ещё раз'}
      </button>}
    </aside>
  );
}
