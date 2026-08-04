import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { DashboardHeader } from '../components/DashboardHeader';
import { TaskWorkspace } from '../components/TaskWorkspace';
import { TaskScenarioLoading } from '../components/TaskScenarioLoading';
import { ACTIVE_TASK_FLOW_KEY, ACTIVE_TASK_ORIGIN_KEY, loadTaskFlowState,
  saveTaskFlowState, saveTaskPlan, type TodayPlan } from '../lib/taskFlowStorage';
import { generateAndSaveTaskPlan } from '../lib/taskPlan';
import { loadUserTasks, persistTask } from '../lib/taskRepository';
import { loadStoredTasks, type Task } from '../lib/tasks';
import { currentLanguage } from '../lib/locale';

type Props = { params: { id: string } };

function planFromTask(task: Task): TodayPlan {
  return {
    taskId: task.id,
    taskTitle: task.title,
    reason: task.procrastinationReason ?? '',
    steps: task.steps ?? [],
    finalState: task.finalState,
  };
}

export function TaskWorkPage({ params }: Props) {
  const [, setLocation] = useLocation();
  const taskId = decodeURIComponent(params.id);
  const [task, setTask] = useState<Task | null>(() =>
    loadStoredTasks().find((item) => item.id === taskId) ?? null);
  const [isChecking, setIsChecking] = useState(!task);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const savedFlow = loadTaskFlowState(taskId);
  const [showReason, setShowReason] = useState(savedFlow
    ? savedFlow.stage === 'reason'
    : !task?.steps?.length && !task?.procrastinationReason);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_TASK_FLOW_KEY, taskId);
    void loadUserTasks().then((tasks) => {
      const loadedTask = tasks.find((item) => item.id === taskId) ?? null;
      setTask((current) => current?.stepsGeneration === 'loading' ? current : loadedTask);
      if (loadedTask && !loadTaskFlowState(taskId)) {
        setShowReason(!loadedTask.steps?.length && !loadedTask.procrastinationReason);
      }
    }).catch(() => undefined).finally(() => setIsChecking(false));
  }, [taskId]);

  const generate = useCallback((sourceTask: Task, reason: string) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationError('');
    setShowReason(false);
    saveTaskFlowState(sourceTask.id, {
      stage: 'step', viewedStepIndex: 0, showCompletion: false,
    });
    setTask({ ...sourceTask, procrastinationReason: reason, stepsGeneration: 'loading' });
    void generateAndSaveTaskPlan(sourceTask, reason).then((completedTask) => {
      setTask(completedTask);
      setGenerationError('');
      saveTaskPlan(planFromTask(completedTask));
    }).catch((caught: unknown) => {
      const message = caught instanceof Error ? caught.message : 'Не получилось составить шаги.';
      const failedTask: Task = { ...sourceTask, procrastinationReason: reason,
        stepsGeneration: 'error', generationError: message };
      setTask(failedTask);
      void persistTask(failedTask);
      setGenerationError(message);
    }).finally(() => setIsGenerating(false));
  }, [isGenerating]);

  useEffect(() => {
    if (!task || task.steps?.length || !task.procrastinationReason || isGenerating
      || task.stepsGeneration === 'error') return;
    generate(task, task.procrastinationReason);
  }, [generate, isGenerating, task]);

  function closeWorkspace() {
    window.localStorage.removeItem(ACTIVE_TASK_FLOW_KEY);
    setLocation('/tasks');
  }

  function goBack() {
    if (!showReason && task && !task.steps?.some((step) => step.done)) {
      setShowReason(true);
      return;
    }
    const origin = window.localStorage.getItem(ACTIVE_TASK_ORIGIN_KEY);
    setLocation(origin === 'today' ? '/' : '/tasks');
  }

  if (isChecking && !task) {
    return <div className="dashboard-page"><DashboardHeader />
      <main className="tasks-shell"><div className="tasks-empty" role="status">Загружаем задачу…</div></main>
    </div>;
  }

  if (!task) {
    return <div className="dashboard-page"><DashboardHeader />
      <main className="tasks-shell"><div className="tasks-empty">
        <h1>Задача не найдена</h1>
        <p>Возможно, она была удалена.</p>
        <Link className="primary-action" href="/tasks">Вернуться в раздел «Задачи»</Link>
      </div></main>
    </div>;
  }

  const needsReason = showReason || (!task.steps?.length && !task.procrastinationReason);
  const scenarioError = generationError || task.generationError;
  if (!needsReason && (isGenerating || task.stepsGeneration === 'loading' || task.stepsGeneration === 'error')) {
    return <div className="dashboard-page"><DashboardHeader />
      <TaskScenarioLoading error={task.stepsGeneration === 'error' ? scenarioError : undefined}
        onRetry={() => generate(task, task.procrastinationReason ?? '')} onBack={goBack} />
    </div>;
  }
  return (
    <div className="dashboard-page">
      <DashboardHeader />
      <TaskWorkspace plan={planFromTask(task)} stage={needsReason ? 'reason' : 'step'}
        isLoading={isGenerating || task.stepsGeneration === 'loading'} error={generationError}
        onReasonSelect={(reason) => {
          const isRegeneration = Boolean(task.steps?.length && reason !== task.procrastinationReason);
          if (isRegeneration && !window.confirm(currentLanguage() === 'en'
            ? 'Replace the prepared scenario with a new one? Your current steps and help will be updated.'
            : 'Заменить подготовленный сценарий новым? Текущие шаги и помощь будут обновлены.')) return;
          generate(task, reason);
        }} onRetry={() => generate(task, task.procrastinationReason ?? '')}
        onBack={goBack} onClose={closeWorkspace} />
    </div>
  );
}
