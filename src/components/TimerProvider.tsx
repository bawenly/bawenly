import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BREAK_SECONDS, FOCUS_SECONDS, initialTimerState, loadTimerSessions, loadTimerState, LONG_BREAK_SECONDS,
  SESSIONS_STORAGE_KEY, TIMER_STORAGE_KEY, type TimerMode, type TimerSession, type TimerState,
} from '../lib/timer';
import { loadStoredTasks, TASKS_STORAGE_KEY, type TaskStep } from '../lib/tasks';
import { persistTask } from '../lib/taskRepository';

type TimerContextValue = {
  state: TimerState;
  sessions: TimerSession[];
  elapsedSeconds: number;
  displaySeconds: number;
  isFinishingStep: boolean;
  selectTask: (id: string, title: string) => void;
  startStep: (taskId: string, taskTitle: string, step: TaskStep) => void;
  setMode: (mode: TimerMode) => void;
  toggle: () => void;
  reset: () => void;
  finish: () => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);
const TODAY_PLAN_KEY = 'baw-today-plan-v1';

function loadTodayPlan() {
  const storedPlan = window.localStorage.getItem(TODAY_PLAN_KEY);
  if (!storedPlan) return null;
  try {
    return JSON.parse(storedPlan) as { taskId?: string; taskTitle: string; steps: TaskStep[] };
  } catch {
    return null;
  }
}

function saveCompletedTodayStep(stepId: string, actualSeconds: number) {
  const plan = loadTodayPlan();
  if (!plan) return;
  try {
    window.localStorage.setItem(TODAY_PLAN_KEY, JSON.stringify({
      ...plan,
      steps: plan.steps.map((step) => step.id === stepId
        ? { ...step, done: true, actualSeconds: (step.actualSeconds ?? 0) + actualSeconds }
        : step),
    }));
  } catch {
    // Повреждённые локальные данные не должны останавливать таймер.
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>(loadTimerState);
  const [sessions, setSessions] = useState<TimerSession[]>(loadTimerSessions);
  const [now, setNow] = useState(Date.now());
  const [isFinishingStep, setIsFinishingStep] = useState(false);
  const finishLock = useRef(false);

  const elapsedSeconds = state.accumulatedSeconds + (
    state.isRunning && state.startedAt ? Math.floor((now - state.startedAt) / 1000) : 0
  );
  const duration = state.phase === 'work'
    ? state.targetSeconds ?? FOCUS_SECONDS
    : state.focusRound % 4 === 0 ? LONG_BREAK_SECONDS : BREAK_SECONDS;
  const displaySeconds = state.mode === 'free' ? elapsedSeconds : Math.max(0, duration - elapsedSeconds);

  useEffect(() => {
    window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (!state.isRunning) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [state.isRunning]);

  useEffect(() => {
    if (state.mode !== 'focus' || !state.isRunning || elapsedSeconds < duration) return;
    if (state.phase === 'work' && state.targetSeconds) {
      saveSession(duration);
      const nextStep = completeCurrentStep();
      setState((current) => nextStep ? ({
        ...initialTimerState,
        mode: current.mode,
        taskId: current.taskId,
        taskTitle: current.taskTitle,
        stepId: nextStep.id,
        stepTitle: nextStep.title,
        targetSeconds: nextStep.minutes * 60,
      }) : ({ ...initialTimerState, mode: current.mode }));
      return;
    }
    if (state.phase === 'work') {
      saveSession(duration);
    }
    setState((current) => ({
      ...current,
      phase: current.phase === 'work' ? 'break' : 'work',
      focusRound: current.phase === 'break' ? current.focusRound + 1 : current.focusRound,
      isRunning: false,
      startedAt: null,
      accumulatedSeconds: 0,
    }));
    document.title = state.phase === 'work' ? 'Фокус завершён — пора отдохнуть' : 'Отдых завершён — можно продолжать';
  }, [duration, elapsedSeconds, state.isRunning, state.mode, state.phase]);

  function saveSession(seconds: number) {
    if (!state.taskTitle) return;
    const session: TimerSession = {
      id: crypto.randomUUID(),
      taskId: state.taskId,
      taskTitle: state.taskTitle,
      mode: state.mode,
      seconds,
      completedAt: new Date().toISOString(),
    };
    setSessions((current) => [session, ...current].slice(0, 50));
  }

  function completeCurrentStep() {
    if (!state.taskId || !state.stepId) return null;
    const todayPlan = loadTodayPlan();
    if (todayPlan?.taskId === state.taskId) {
      saveCompletedTodayStep(state.stepId, elapsedSeconds);
      window.dispatchEvent(new CustomEvent('baw-today-step-completed', {
        detail: { stepId: state.stepId, actualSeconds: elapsedSeconds },
      }));
      return null;
    }
    const tasks = loadStoredTasks();
    const task = tasks.find((item) => item.id === state.taskId);
    if (!task?.steps) return null;
    const steps = task.steps.map((step) => step.id === state.stepId ? { ...step, done: true } : step);
    const nextStep = steps.find((step) => !step.done);
    const updatedTasks = tasks.map((item) => item.id === task.id
      ? { ...item, steps, status: nextStep ? 'in_progress' as const : 'done' as const }
      : item);
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
    window.dispatchEvent(new CustomEvent('baw-tasks-changed'));
    const updatedTask = updatedTasks.find((item) => item.id === task.id);
    if (updatedTask) void persistTask(updatedTask);
    return nextStep ?? null;
  }

  const value = useMemo<TimerContextValue>(() => ({
    state,
    sessions,
    elapsedSeconds,
    displaySeconds,
    isFinishingStep,
    selectTask: (taskId, taskTitle) => setState((current) => ({
      ...current, taskId, taskTitle, stepId: '', stepTitle: '', targetSeconds: null,
    })),
    startStep: (taskId, taskTitle, step) => setState((current) => ({
      ...initialTimerState,
      mode: current.mode,
      taskId,
      taskTitle,
      stepId: step.id,
      stepTitle: step.title,
      targetSeconds: step.minutes * 60,
      isRunning: true,
      startedAt: Date.now(),
    })),
    setMode: (mode) => setState((current) => ({
      ...initialTimerState, mode, taskId: current.taskId, taskTitle: current.taskTitle,
    })),
    toggle: () => setState((current) => {
      const actionTime = Date.now();
      if (!current.isRunning) {
        const task = loadStoredTasks().find((item) => item.id === current.taskId);
        if (task) void persistTask({ ...task, status: 'in_progress' });
        return { ...current, isRunning: true, startedAt: actionTime };
      }
      const currentInterval = current.startedAt
        ? Math.floor((actionTime - current.startedAt) / 1000)
        : 0;
      const accumulatedSeconds = current.accumulatedSeconds + currentInterval;
      const task = loadStoredTasks().find((item) => item.id === current.taskId);
      if (task) {
        const steps = task.steps?.map((step) => step.id === current.stepId
          ? { ...step, actualSeconds: (step.actualSeconds ?? 0) + currentInterval }
          : step);
        void persistTask({ ...task, status: 'paused', statusBeforePause: 'in_progress', steps });
      }
      return {
        ...current,
        isRunning: false,
        startedAt: null,
        accumulatedSeconds,
      };
    }),
    reset: () => setState((current) => ({
      ...initialTimerState, mode: current.mode, taskId: current.taskId, taskTitle: current.taskTitle,
    })),
    finish: () => {
      if (finishLock.current || !state.stepId) return;
      finishLock.current = true;
      setIsFinishingStep(true);
      if (state.phase === 'work') saveSession(elapsedSeconds);
      const nextStep = completeCurrentStep();
      setState((current) => nextStep ? ({
        ...initialTimerState,
        mode: current.mode,
        taskId: current.taskId,
        taskTitle: current.taskTitle,
        stepId: nextStep.id,
        stepTitle: nextStep.title,
        targetSeconds: nextStep.minutes * 60,
      }) : ({ ...initialTimerState, mode: current.mode }));
      window.setTimeout(() => {
        finishLock.current = false;
        setIsFinishingStep(false);
      }, 300);
    },
  }), [displaySeconds, elapsedSeconds, isFinishingStep, sessions, state]);

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) throw new Error('useTimer must be used inside TimerProvider');
  return context;
}
