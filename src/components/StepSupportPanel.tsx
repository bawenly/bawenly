import { useEffect, useMemo, useRef, useState } from 'react';
import { createStepSupport, resolveStepSupport } from '../lib/stepSupport';
import { useLanguage } from './LanguageProvider';
import type { StepSupport } from '../lib/tasks';

const STORAGE_KEY = 'baw-step-support-v2';
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
  const [showDetail, setShowDetail] = useState(Boolean(saved?.selectedId));
  const [isExiting, setIsExiting] = useState(false);
  const transitionTimer = useRef<number | null>(null);
  const selectionAttempt = useRef(0);

  useEffect(() => {
    setShowDetail(Boolean(store[cacheKey]?.selectedId));
    setIsExiting(false);
    return () => {
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    };
  }, [cacheKey]);

  useEffect(() => {
    if (saved) return;
    if (prepared) {
      setStore((current) => ({ ...current, [cacheKey]: { message: prepared.message,
        options: prepared.options.map((option, index) => ({
          ...option, id: `${option.id || 'option'}-${index}`, intent: '',
        })) } }));
      return;
    }
    let active = true;
    setLoading(true); setError('');
    void createStepSupport(context).then((suggestion) => {
      if (!active) return;
      setStore((current) => ({ ...current, [cacheKey]: {
        ...suggestion,
        options: suggestion.options.map((option, index) => ({
          ...option, id: `${option.id || 'option'}-${index}`,
        })),
      } }));
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : '');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cacheKey, contextKey, prepared, saved]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }, [store]);

  async function selectOption(option: SavedOption) {
    if (loading || isExiting || saved?.selectedId === option.id) return;
    const attempt = ++selectionAttempt.current;
    setIsExiting(true);
    transitionTimer.current = window.setTimeout(() => {
      setShowDetail(true);
      setIsExiting(false);
    }, 200);
    if (option.result !== undefined) {
      setStore((current) => ({ ...current, [cacheKey]: {
        ...current[cacheKey], selectedId: option.id, result: option.result,
      } }));
      return;
    }
    setStore((current) => ({ ...current, [cacheKey]: { ...current[cacheKey], selectedId: option.id } }));
    if (saved?.selectedId === option.id && saved.result) return;
    setLoading(true); setError('');
    try {
      const result = await resolveStepSupport(context, option);
      if (selectionAttempt.current !== attempt) return;
      setStore((current) => ({ ...current, [cacheKey]: { ...current[cacheKey], selectedId: option.id, result } }));
    } catch (caught) {
      if (selectionAttempt.current === attempt) setError(caught instanceof Error ? caught.message : '');
    } finally { if (selectionAttempt.current === attempt) setLoading(false); }
  }

  function showAllOptions() {
    if (isExiting) return;
    selectionAttempt.current += 1;
    setLoading(false);
    setIsExiting(true);
    transitionTimer.current = window.setTimeout(() => {
      setStore((current) => ({ ...current, [cacheKey]: {
        ...current[cacheKey], selectedId: undefined, result: undefined,
      } }));
      setShowDetail(false);
      setIsExiting(false);
    }, 200);
  }

  const loadingIndicator = <span className="step-support__loading" role="status"
    aria-label={language === 'en' ? 'Loading' : 'Загрузка'}><i /><i /><i /></span>;

  const selected = saved?.options.find((option) => option.id === saved.selectedId);
  return (
    <aside className="support-card support-card--done step-support" aria-live="polite">
      <p className="eyebrow">{language === 'en' ? 'Help for this step' : 'Помощь для этого шага'}</p>
      <div className={`step-support__content${isExiting ? ' step-support__content--exit' : ''}`}>
      {showDetail && selected ? <>
        <button className="step-support__back" type="button"
          disabled={isExiting} onClick={showAllOptions}>
          ← {language === 'en' ? 'All options' : 'Все варианты'}
        </button>
        <h2>{selected.label}</h2>
        {loading && !saved?.result ? <div className="step-support__loading-row">{loadingIndicator}
          <span>{language === 'en' ? 'Preparing help…' : 'Готовлю помощь…'}</span></div>
          : <p className="step-support__result">{saved?.result}</p>}
      </> : <>
        <h2>{saved?.message || (language === 'en' ? 'What would make this step easier?' : 'Что поможет с этим шагом?')}</h2>
        {loading && !saved ? <div className="step-support__loading-row">{loadingIndicator}
          <span>{language === 'en' ? 'Finding useful options…' : 'Подбираю полезные варианты…'}</span></div> : null}
        {saved?.options.length ? <div className="step-support__options">
          {saved.options.map((option) => <button type="button" key={option.id}
            className={saved.selectedId === option.id ? 'step-support__option--selected' : undefined}
            disabled={loading || isExiting} onClick={() => void selectOption(option)}>
            {option.label}<span aria-hidden="true">→</span></button>)}
        </div> : null}
      </>}
      {error && <p className="ai-error" role="alert">{error}</p>}
      {error && <button className="step-support__back" type="button"
        onClick={() => { setStore((current) => { const next = { ...current }; delete next[cacheKey]; return next; }); setError(''); }}>
        {language === 'en' ? 'Try again' : 'Попробовать ещё раз'}
      </button>}
      </div>
    </aside>
  );
}
