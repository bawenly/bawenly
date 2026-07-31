import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { createTaskPlan, simplifyStep } from '../lib/ai';
import { formatTimer } from '../lib/timer';
import { getLocalDateKey, type Task, type TaskStep } from '../lib/tasks';
import { persistTask } from '../lib/taskRepository';
import type { FlowStage } from '../pages/HomePage';
import { useAuthModal } from './AuthModal';
import { useTimer } from './TimerProvider';

const TODAY_PLAN_KEY = 'baw-today-plan-v1';
type TodayPlan = { taskId: string; taskTitle: string; reason: string; steps: TaskStep[] };

type Props = {
  stage: FlowStage;
  task: string;
  reason: string;
  onTaskChange: (task: string) => void;
  onStageChange: (stage: FlowStage) => void;
  onResetFlow: () => void;
};

export function TaskFlow({ stage, task, reason, onTaskChange, onStageChange, onResetFlow }: Props) {
  const [, setLocation] = useLocation();
  const { openAuth } = useAuthModal();
  const timer = useTimer();
  const returnLock = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generationAttempt, setGenerationAttempt] = useState(0);
  const [plan, setPlan] = useState<TodayPlan | null>(() => {
    const stored = window.localStorage.getItem(TODAY_PLAN_KEY);
    if (!stored) return null;
    try {
      const saved = JSON.parse(stored) as Omit<TodayPlan, 'taskId'> & { taskId?: string };
      return { ...saved, taskId: saved.taskId ?? crypto.randomUUID() };
    } catch {
      return null;
    }
  });
  const currentPlan = plan?.taskTitle === task && plan.reason === reason ? plan : null;
  const currentStep = currentPlan?.steps.find((step) => !step.done) ?? null;
  const completedSteps = currentPlan?.steps.filter((step) => step.done).length ?? 0;
  const isComplete = Boolean(currentPlan?.steps.length) && !currentStep;
  const isCurrentStep = timer.state.taskId === currentPlan?.taskId
    && timer.state.stepId === currentStep?.id;
  const isStepActive = isCurrentStep && timer.state.targetSeconds !== null;

  useEffect(() => {
    if (plan) window.localStorage.setItem(TODAY_PLAN_KEY, JSON.stringify(plan));
  }, [plan]);

  function taskFromPlan(nextPlan: TodayPlan, status?: Task['status']): Task {
    const hasProgress = nextPlan.steps.some((step) => step.done);
    return {
      id: nextPlan.taskId,
      title: nextPlan.taskTitle,
      status: status ?? (hasProgress ? 'in_progress' : 'not_started'),
      dueDate: getLocalDateKey(),
      estimatedMinutes: nextPlan.steps.reduce((total, step) => total + step.minutes, 0),
      steps: nextPlan.steps,
      procrastinationReason: nextPlan.reason,
    };
  }

  useEffect(() => {
    const completeStep = (event: Event) => {
      const detail = (event as CustomEvent<{ stepId: string; actualSeconds: number }>).detail;
      setPlan((current) => {
        if (!current) return current;
        const next = {
          ...current,
          steps: current.steps.map((step) => step.id === detail.stepId
            ? { ...step, done: true, actualSeconds: (step.actualSeconds ?? 0) + detail.actualSeconds }
            : step),
        };
        void persistTask(taskFromPlan(
          next,
          next.steps.every((step) => step.done) ? 'done' : 'in_progress',
        ));
        return next;
      });
    };
    window.addEventListener('baw-today-step-completed', completeStep);
    return () => window.removeEventListener('baw-today-step-completed', completeStep);
  }, []);

  useEffect(() => {
    if (stage !== 'step' || (currentPlan?.steps.length && generationAttempt === 0)) return;
    setIsLoading(true);
    setError('');
    const basePlan = currentPlan ?? {
      taskId: crypto.randomUUID(), steps: [], taskTitle: task, reason,
    };
    setPlan(basePlan);
    void persistTask(taskFromPlan(basePlan))
      .then(() => createTaskPlan(task, reason))
      .then((steps) => {
        const next = { ...basePlan, steps };
        setPlan(next);
        return persistTask(taskFromPlan(next));
      }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Не получилось составить шаги.');
    }).finally(() => setIsLoading(false));
  }, [generationAttempt, reason, stage, task]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!task.trim()) {
      setError('Напиши задачу — можно всего пару слов.');
      return;
    }
    setError('');
    openAuth(() => onStageChange('reason'));
  }

  async function makeSimpler() {
    if (!currentStep) return;
    setIsLoading(true);
    setError('');
    try {
      const step = await simplifyStep(task, currentStep.title, reason);
      setPlan((current) => {
        if (!current) return current;
        const next = {
          ...current,
          steps: current.steps.map((item) => item.id === currentStep.id
          ? { ...item, title: step.title, minutes: step.minutes }
          : item),
        };
        void persistTask(taskFromPlan(next));
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не получилось упростить шаг.');
    } finally {
      setIsLoading(false);
    }
  }

  function startCurrentStep() {
    if (!currentStep) return;
    timer.setMode('focus');
    timer.startStep(currentPlan?.taskId ?? '', task, currentStep);
  }

  function goToNextStep() {
    if (!currentStep || timer.isFinishingStep) return;
    timer.finish();
  }

  function returnToToday() {
    if (!currentPlan || !isComplete || returnLock.current) return;
    returnLock.current = true;
    void persistTask(taskFromPlan(currentPlan, 'done'));
    window.localStorage.removeItem(TODAY_PLAN_KEY);
    window.dispatchEvent(new CustomEvent('baw-tasks-changed'));
    onResetFlow();
    setLocation('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (stage === 'step') {
    if (isComplete) {
      return (
        <section className="task-card task-card--result" aria-live="polite">
          <span className="task-card__kicker">Задача завершена</span>
          <h2>Готово — все шаги выполнены</h2>
          <p>Ты последовательно завершил задачу «{task}».</p>
          <div className="task-card__result-actions">
            <button className="result-back-button" type="button" onClick={returnToToday}
              aria-label="Вернуться на главную страницу «Сегодня»">
              <span aria-hidden="true">←</span>
              <span>Сегодня</span>
            </button>
          </div>
        </section>
      );
    }
    return (
      <section className="task-card task-card--result" aria-live="polite">
        <span className="task-card__kicker">Твоя задача: {task}</span>
        <h2>Текущий шаг</h2>
        <div className="first-step">
          <span className="first-step__number">{String(completedSteps + 1).padStart(2, '0')}</span>
          <p>{isLoading && !currentStep ? 'ИИ подбирает маленький шаг…' : currentStep?.title || 'Попробуй обновить ответ.'}</p>
        </div>
        <div className="step-meta"><span>≈ {currentStep?.minutes ?? '—'} мин</span>
          <span>{completedSteps + 1} из {currentPlan?.steps.length ?? '—'}</span></div>
        {isCurrentStep && <div className="timer" role="timer">{formatTimer(timer.displaySeconds)}</div>}
        {error && <p className="ai-error" role="alert">{error}</p>}
        <div className="task-card__actions">
          {isStepActive ? (
            <div className="task-card__step-controls">
              <button className="primary-action" type="button" disabled={timer.isFinishingStep}
                onClick={goToNextStep}>
                {timer.isFinishingStep ? 'Перехожу…' : 'Дальше'} <span aria-hidden="true">→</span>
              </button>
              <button className="primary-action task-card__pause-action" type="button"
                disabled={timer.isFinishingStep} onClick={timer.toggle}>
                {timer.state.isRunning ? 'Пауза' : 'Продолжить'}
              </button>
            </div>
          ) : (
            <button className="primary-action" type="button" disabled={!currentStep}
              onClick={startCurrentStep}>Начать <span aria-hidden="true">→</span></button>
          )}
          <button className="text-action" type="button" disabled={!currentStep || isLoading}
            onClick={() => void makeSimpler()}>
            {isLoading ? 'Упрощаю…' : 'Сделать шаг ещё проще'}
          </button>
          {error && !currentStep && (
            <button className="text-action" type="button" disabled={isLoading}
              onClick={() => setGenerationAttempt((value) => value + 1)}>
              Повторить генерацию
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <form className="task-card" onSubmit={submit}>
      {stage === 'reason' && <span className="task-card__kicker">Задача сохранена</span>}
      <h2>{stage === 'reason' ? task : 'Что ты откладываешь?'}</h2>
      <p>{stage === 'reason' ? 'Остался один короткий вопрос справа.' : 'Опиши задачу — мы найдём самый простой способ к ней подступиться.'}</p>
      {stage === 'task' && <>
        <label className="sr-only" htmlFor="task-input">Задача, которую ты откладываешь</label>
        <textarea id="task-input" className={error ? 'task-input task-input--error' : 'task-input'}
          value={task} placeholder="Например: подготовить презентацию"
          onChange={(event) => { onTaskChange(event.target.value); setError(''); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }} />
        <div className="task-card__footer">
          <span className={error ? 'input-message input-message--error' : 'input-message'}>
            {error || 'Enter — продолжить, Shift + Enter — новая строка'}
          </span>
          <div className="task-card__start-actions">
            <button className="support-action" type="button" onClick={() => setLocation('/support')}>
              Мне нужна поддержка
            </button>
            <button className="primary-action" type="submit">Помоги мне начать <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </>}
    </form>
  );
}
