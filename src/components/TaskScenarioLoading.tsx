import { useLanguage } from './LanguageProvider';

type Props = { error?: string; onRetry: () => void; onBack: () => void };

export function TaskScenarioLoading({ error, onRetry, onBack }: Props) {
  const { language } = useLanguage();
  return (
    <main className="task-scenario-state">
      <section className="task-card task-scenario-state__card" aria-live="polite" aria-busy={!error}>
        {error ? <>
          <h2>{language === 'en' ? 'We could not prepare the steps' : 'Не получилось подготовить шаги'}</h2>
          <p>{language === 'en'
            ? 'Your task is saved. You can try again or return to the previous screen.'
            : 'Задача сохранена. Можно повторить попытку или вернуться назад.'}</p>
          <div className="task-scenario-state__actions">
            <button className="primary-action" type="button" onClick={onRetry}>
              {language === 'en' ? 'Try again' : 'Повторить'}
            </button>
            <button className="text-action" type="button" onClick={onBack}>
              {language === 'en' ? 'Go back' : 'Вернуться назад'}
            </button>
          </div>
        </> : <>
          <div className="task-scenario-dots" aria-hidden="true">
            <span /><span /><span />
          </div>
          <p>{language === 'en'
            ? 'Preparing the steps for your task…'
            : 'Подбираем шаги для вашей задачи…'}</p>
        </>}
      </section>
    </main>
  );
}
