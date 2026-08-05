import { FormEvent } from 'react';
import { useLanguage } from './LanguageProvider';
import { FlowNavigation } from './FlowNavigation';
import { ClarificationChoice } from './ClarificationChoice';
import type { ClarificationQuestion } from '../lib/taskClarification';

type Props = {
  task: string;
  questions: ClarificationQuestion[];
  answers: Record<string, string>;
  isLoading: boolean;
  error?: string;
  onAnswerChange: (id: string, answer: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onClose: () => void;
};

export function TaskClarification({ task, questions, answers, isLoading, error,
  onAnswerChange, onContinue, onBack, onClose }: Props) {
  const { language } = useLanguage();
  const missingRequired = questions.some((question) => question.required && !answers[question.id]?.trim());

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!missingRequired && !isLoading) onContinue();
  }

  return (
    <main className="task-scenario-state">
      <form className="task-card task-clarification" onSubmit={submit}>
        <FlowNavigation onBack={onBack} onClose={onClose} />
        <span className="task-card__kicker" data-user-text>{task}</span>
        <h2>{language === 'en' ? 'A few details before we begin' : 'Пара уточнений перед началом'}</h2>
        {isLoading ? <div className="task-clarification__loading" aria-live="polite">
          <div className="task-scenario-dots" aria-hidden="true"><span /><span /><span /></div>
          <p>{language === 'en' ? 'Checking whether any details are missing…' : 'Проверяем, нужны ли уточнения…'}</p>
        </div> : <>
          <p>{language === 'en'
            ? 'Only details that can meaningfully change the plan.'
            : 'Только то, что заметно повлияет на план.'}</p>
          <div className="task-clarification__questions">
            {questions.map((question) => question.type === 'choice'
              ? <ClarificationChoice key={question.id} question={question}
                answer={answers[question.id] ?? ''} language={language}
                onChange={(answer) => onAnswerChange(question.id, answer)} />
              : <label key={question.id} className="task-clarification__field">
              <span>{question.label}{question.required ? ' *' : ''}</span>
              <input type={question.type === 'number' ? 'number' : 'text'}
                value={answers[question.id] ?? ''} required={question.required}
                placeholder={question.placeholder ?? (question.required ? '' : language === 'en' ? 'Optional' : 'Можно пропустить')}
                onChange={(event) => onAnswerChange(question.id, event.target.value)} />
            </label>)}
          </div>
          {error && <p className="ai-error" role="alert">{error}</p>}
          <button className="primary-action" type="submit" disabled={missingRequired}>
            {language === 'en' ? 'Continue' : 'Продолжить'} <span aria-hidden="true">→</span>
          </button>
        </>}
      </form>
    </main>
  );
}
