import { FormEvent, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation } from 'wouter';
import { createTaskPlan, simplifyStep } from '../lib/ai';
import { formatTimer } from '../lib/timer';
import { getLocalDateKey, type Task } from '../lib/tasks';
import { persistTask, removeTask } from '../lib/taskRepository';
import type { FlowStage } from '../pages/HomePage';
import { useAuthModal } from './AuthModal';
import { useTimer } from './TimerProvider';
import { FlowNavigation } from './FlowNavigation';
import { clearStepSupport, type ActiveStepSupport } from './StepSupportPanel';
import { ACTIVE_TASK_FLOW_KEY, clearTaskPlan, loadTaskFlowState, loadTaskPlan,
  saveTaskFlowState, saveTaskPlan, type TodayPlan } from '../lib/taskFlowStorage';

type Props = {
  stage: FlowStage;
  task: string;
  taskDraft: string;
  reason: string;
  onTaskDraftChange: (task: string) => void;
  onTaskSubmit: (task: string) => Promise<void>;
  onStageChange: (stage: FlowStage) => void;
  onResetFlow: () => void;
  onStepSupportChange: (context: ActiveStepSupport | null) => void;
  workspace?: 'today' | 'tasks';
  onPlanReady?: (plan: TodayPlan) => void;
  onCloseWorkspace?: () => void;
  onBackWorkspace?: () => void;
  externalPlan?: TodayPlan;
  externalPlanLoading?: boolean;
  externalError?: string;
  onRetryPlan?: () => void;
};

export function TaskFlow({
  stage, task, taskDraft, reason, onTaskDraftChange, onTaskSubmit, onStageChange, onResetFlow,
  onStepSupportChange,
  workspace = 'today', onPlanReady, onCloseWorkspace, onBackWorkspace, externalPlan, externalPlanLoading = false,
  externalError = '', onRetryPlan,
}: Props) {
  const [, setLocation] = useLocation();
  const { openAuth } = useAuthModal();
  const timer = useTimer();
  const returnLock = useRef(false);
  const restoreViewedStep = useRef(Boolean(externalPlan && loadTaskFlowState(externalPlan.taskId)));
  const generationPromise = useRef<Promise<void> | null>(null);
  const onPlanReadyRef = useRef(onPlanReady);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generationAttempt, setGenerationAttempt] = useState(0);
  const savedFlowState = externalPlan ? loadTaskFlowState(externalPlan.taskId) : null;
  const [viewedStepIndex, setViewedStepIndex] = useState(savedFlowState?.viewedStepIndex ?? 0);
  const [isClosing, setIsClosing] = useState(false);
  const [showCompletion, setShowCompletion] = useState(savedFlowState?.showCompletion ?? false);
  const [plan, setPlan] = useState<TodayPlan | null>(() => {
    return externalPlan ? loadTaskPlan(externalPlan.taskId) ?? externalPlan : null;
  });
  const currentPlan = plan?.taskTitle === task && plan.reason === reason ? plan : null;
  const currentStep = currentPlan?.steps.find((step) => !step.done) ?? null;
  const activeStepIndex = currentPlan?.steps.findIndex((step) => !step.done) ?? -1;
  const viewedStep = currentPlan?.steps[viewedStepIndex] ?? currentStep;
  const isViewingCurrentStep = viewedStep?.id === currentStep?.id;
  const isComplete = Boolean(currentPlan?.steps.length) && !currentStep;
  const isCurrentStep = timer.state.taskId === currentPlan?.taskId
    && timer.state.stepId === currentStep?.id;
  const isStepActive = isCurrentStep && timer.state.targetSeconds !== null;

  useEffect(() => {
    onPlanReadyRef.current = onPlanReady;
  }, [onPlanReady]);

  useEffect(() => {
    if (plan) saveTaskPlan(plan);
  }, [plan]);

  useEffect(() => {
    if (externalPlan) setPlan(externalPlan);
  }, [externalPlan]);

  useEffect(() => {
    if (currentPlan) timer.activateTask(currentPlan.taskId, currentPlan.taskTitle);
  }, [currentPlan?.taskId]);

  useEffect(() => {
    if (!currentPlan || workspace !== 'tasks') return;
    saveTaskFlowState(currentPlan.taskId, {
      stage: stage === 'reason' ? 'reason' : 'step',
      viewedStepIndex,
      showCompletion,
    });
  }, [currentPlan?.taskId, showCompletion, stage, viewedStepIndex, workspace]);

  useEffect(() => {
    if (restoreViewedStep.current) {
      restoreViewedStep.current = false;
      return;
    }
    if (activeStepIndex >= 0) setViewedStepIndex(activeStepIndex);
  }, [activeStepIndex]);

  useEffect(() => {
    if (isComplete) setShowCompletion(true);
  }, [isComplete]);

  useEffect(() => {
    if (stage === 'task') setError('');
  }, [stage]);

  useEffect(() => {
    if (stage !== 'step' || !currentPlan || !viewedStep) {
      onStepSupportChange(null);
      return;
    }
    onStepSupportChange({ taskId: currentPlan.taskId, task, reason, stepId: viewedStep.id,
      step: viewedStep.title, completedSteps: currentPlan.steps.filter((step) => step.done).map((step) => step.title),
      preparedSupport: viewedStep.support });
  }, [currentPlan, onStepSupportChange, reason, stage, task, viewedStep]);

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
      finalState: nextPlan.finalState,
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
    if (workspace === 'tasks' || stage !== 'step' || (currentPlan?.steps.length && generationAttempt === 0)) return;
    let cancelled = false;
    setIsLoading(true);
    setError('');
    const basePlan = currentPlan ?? {
      taskId: crypto.randomUUID(), steps: [], taskTitle: task, reason,
    };
    setPlan(basePlan);
    generationPromise.current = persistTask(taskFromPlan(basePlan))
      .then(() => cancelled ? [] : createTaskPlan(task, reason))
      .then((steps) => {
        if (cancelled) return;
        const next = { ...basePlan, steps };
        setPlan(next);
        return persistTask(taskFromPlan(next)).then(() => {
          onPlanReadyRef.current?.(next);
        });
      }).catch((caught: unknown) => {
      if (cancelled) return;
      setError(caught instanceof Error ? caught.message : 'Не получилось составить шаги.');
    }).finally(() => {
      generationPromise.current = null;
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [generationAttempt, reason, stage, task]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const submittedTask = taskDraft.trim();
    if (!submittedTask) {
      setError('Напиши задачу — можно всего пару слов.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    openAuth(() => {
      void onTaskSubmit(submittedTask).catch((caught: unknown) => {
        setError(caught instanceof Error
          ? caught.message
          : 'Не получилось создать задачу. Попробуй ещё раз.');
      }).finally(() => setIsSubmitting(false));
    }, () => setIsSubmitting(false));
  }

  function submitTaskWithEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.repeat
      || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
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
    if (!viewedStep || !isViewingCurrentStep) return;
    timer.setMode('focus');
    timer.startStep(currentPlan?.taskId ?? '', task, viewedStep);
  }

  function goToNextStep() {
    if (!isViewingCurrentStep) {
      const lastIndex = Math.max(0, (currentPlan?.steps.length ?? 1) - 1);
      if (isComplete && viewedStepIndex >= lastIndex) setShowCompletion(true);
      else setViewedStepIndex((index) => Math.min(index + 1, activeStepIndex >= 0 ? activeStepIndex : lastIndex));
      return;
    }
    if (!currentStep || timer.isFinishingStep) return;
    timer.finish();
  }

  function goBack() {
    if (isComplete) {
      setShowCompletion(false);
      setViewedStepIndex(Math.max(0, (currentPlan?.steps.length ?? 1) - 1));
      return;
    }
    if (viewedStepIndex > 0) {
      setViewedStepIndex((index) => index - 1);
      return;
    }
    if (workspace === 'tasks') {
      window.localStorage.removeItem(ACTIVE_TASK_FLOW_KEY);
      onBackWorkspace?.();
      return;
    }
    onStageChange('reason');
  }

  async function closeAndDelete() {
    if (isClosing) return;
    if (workspace === 'tasks') {
      window.localStorage.removeItem(ACTIVE_TASK_FLOW_KEY);
      if (currentPlan) {
        timer.clearTask(currentPlan.taskId);
        clearTaskPlan(currentPlan.taskId);
        clearStepSupport(currentPlan.taskId);
      }
      onCloseWorkspace?.();
      return;
    }
    const ownsStoredPlan = plan?.taskTitle === task;
    const taskId = currentPlan?.taskId ?? (ownsStoredPlan ? plan.taskId : null);
    setIsClosing(true);
    if (taskId) timer.clearTask(taskId);
    if (ownsStoredPlan && taskId) clearTaskPlan(taskId);
    clearStepSupport(taskId ?? undefined);
    setPlan(null);
    onResetFlow();
    setLocation('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      await generationPromise.current;
      if (taskId) {
        await removeTask(taskId);
        window.dispatchEvent(new CustomEvent('baw-tasks-changed'));
      }
    } catch {
      // Локальные данные уже удалены; задача не должна восстановиться в этой сессии.
    } finally {
      setIsClosing(false);
    }
  }

  function returnToToday() {
    if (!currentPlan || !isComplete || returnLock.current) return;
    returnLock.current = true;
    void persistTask(taskFromPlan(currentPlan, 'done'));
    timer.clearTask(currentPlan.taskId);
    clearTaskPlan(currentPlan.taskId);
    clearStepSupport(currentPlan.taskId);
    window.dispatchEvent(new CustomEvent('baw-tasks-changed'));
    onResetFlow();
    setLocation('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function finishTasksWorkspace() {
    window.localStorage.removeItem(ACTIVE_TASK_FLOW_KEY);
    if (currentPlan) timer.clearTask(currentPlan.taskId);
    if (currentPlan) {
      clearTaskPlan(currentPlan.taskId);
      clearStepSupport(currentPlan.taskId);
    }
    window.dispatchEvent(new CustomEvent('baw-tasks-changed'));
    onCloseWorkspace?.();
  }

  if (stage === 'step') {
    if (isComplete && showCompletion) {
      return (
        <section className="task-card task-card--result" aria-live="polite">
          <FlowNavigation onBack={goBack} onClose={() => void closeAndDelete()} isClosing={isClosing} />
          <span className="task-card__kicker">Задача завершена</span>
          <h2>Готово — все шаги выполнены</h2>
          <p>{currentPlan?.finalState || `Ты последовательно завершил задачу «${task}».`}</p>
          <div className="task-card__result-actions">
            <button className="result-back-button" type="button"
              onClick={workspace === 'tasks' ? finishTasksWorkspace : returnToToday}
              aria-label={workspace === 'tasks' ? 'Вернуться к списку задач' : 'Вернуться на главную страницу «Сегодня»'}>
              <span aria-hidden="true">←</span>
              <span>{workspace === 'tasks' ? 'Задачи' : 'Сегодня'}</span>
            </button>
          </div>
        </section>
      );
    }
    return (
      <section className="task-card task-card--result" aria-live="polite">
        <FlowNavigation onBack={goBack} onClose={() => void closeAndDelete()} isClosing={isClosing} />
        <span className="task-card__kicker">Твоя задача: {task}</span>
        <div className="current-step-heading">
          <h2>Текущий шаг</h2>
          <span className="current-step-heading__progress" key={viewedStep?.id ?? 'loading'}>
            {viewedStepIndex + 1}/{currentPlan?.steps.length ?? '—'}
          </span>
        </div>
        <div className="step-transition" key={viewedStep?.id ?? 'loading'}>
          <div className="first-step">
            <span className="first-step__number">{String(viewedStepIndex + 1).padStart(2, '0')}</span>
            <p>{(isLoading || externalPlanLoading) && !viewedStep ? 'ИИ подбирает маленький шаг…' : viewedStep?.title || 'Попробуй обновить ответ.'}</p>
          </div>
          <div className="step-meta"><span>≈ {viewedStep?.minutes ?? '—'} мин</span></div>
          {isViewingCurrentStep && isCurrentStep && <div className="timer" role="timer">{formatTimer(timer.displaySeconds)}</div>}
        </div>
        {(error || externalError) && <p className="ai-error" role="alert">{error || externalError}</p>}
        <div className="task-card__actions">
          {isViewingCurrentStep && isStepActive ? (
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
            <button className="primary-action" type="button" disabled={!viewedStep || externalPlanLoading
              || (timer.state.isRunning && timer.state.taskId !== currentPlan?.taskId)}
              onClick={isViewingCurrentStep ? startCurrentStep : goToNextStep}>
              {isViewingCurrentStep ? 'Начать' : 'Дальше'} <span aria-hidden="true">→</span>
            </button>
          )}
          <button className="text-action" type="button" disabled={!currentStep || isLoading || externalPlanLoading}
            hidden={!isViewingCurrentStep} onClick={() => void makeSimpler()}>
            {isLoading ? 'Упрощаю…' : 'Сделать шаг ещё проще'}
          </button>
          {(error || externalError) && !currentStep && (
            <button className="text-action" type="button" disabled={isLoading}
              onClick={() => onRetryPlan ? onRetryPlan() : setGenerationAttempt((value) => value + 1)}>
              Повторить генерацию
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <form className="task-card" onSubmit={submit}>
      {stage === 'reason' && (
        <FlowNavigation onBack={onBackWorkspace} onClose={() => void closeAndDelete()} isClosing={isClosing} />
      )}
      {stage === 'reason' && <span className="task-card__kicker">Задача сохранена</span>}
      <h2 className={stage === 'task' ? 'cormorant-heading cormorant-heading--semibold' : undefined}>
        {stage === 'reason' ? task : 'Что ты откладываешь?'}
      </h2>
      <p>{stage === 'reason' ? 'Остался один короткий вопрос справа.' : 'Опиши задачу — мы найдём самый простой способ к ней подступиться.'}</p>
      {stage === 'task' && <>
        <label className="sr-only" htmlFor="task-input">Задача, которую ты откладываешь</label>
        <textarea id="task-input" className={error ? 'task-input task-input--error' : 'task-input'}
          value={taskDraft} placeholder="Например: подготовить презентацию"
          onChange={(event) => { onTaskDraftChange(event.target.value); setError(''); }}
          onKeyDown={submitTaskWithEnter} />
        <div className="task-card__footer">
          <span className={error ? 'input-message input-message--error' : 'input-message'}>
            {error || 'Enter — продолжить, Shift + Enter — новая строка'}
          </span>
          <div className="task-card__start-actions">
            <button className="support-action" type="button" onClick={() => setLocation('/support')}>
              Мне нужна поддержка
            </button>
            <button className="primary-action" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Создаю задачу…' : 'Помоги мне начать'} <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </>}
    </form>
  );
}
