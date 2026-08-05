import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BREAK_SECONDS, FOCUS_SECONDS, initialTimerState, loadTaskTimerStates, loadTimerSessions, loadTimerState,
  LONG_BREAK_SECONDS, SESSIONS_STORAGE_KEY, TASK_TIMERS_STORAGE_KEY, TIMER_STORAGE_KEY,
  type TimerMode, type TimerSession, type TimerState,
} from '../lib/timer';
import { loadStoredTasks, TASKS_STORAGE_KEY, type TaskStep } from '../lib/tasks';
import { persistTask, persistTaskStatus } from '../lib/taskRepository';

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
  clearTask: (taskId: string) => void;
  clearSessions: () => void;
  deleteSession: (id: string) => void;
  finish: () => void;
  activateTask: (taskId: string, taskTitle: string) => void;
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

  const runningSeconds = state.isRunning && state.startedAt
    ? Math.max(0, Math.floor((now - state.startedAt) / 1000))
    : 0;
  const elapsedSeconds = state.accumulatedSeconds + runningSeconds;
  const duration = state.phase === 'work'
    ? state.targetSeconds ?? FOCUS_SECONDS
    : state.focusRound % 4 === 0 ? LONG_BREAK_SECONDS : BREAK_SECONDS;
  const displaySeconds = state.mode === 'free' ? elapsedSeconds : Math.max(0, duration - elapsedSeconds);

  useEffect(() => {
    window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    if (state.taskId) window.localStorage.setItem(TASK_TIMERS_STORAGE_KEY, JSON.stringify({
      ...loadTaskTimerStates(), [state.taskId]: state,
    }));
  }, [state]);

  useEffect(() => {
    window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    const clearDeletedTask = (event: Event) => {
      const taskId = (event as CustomEvent<{ taskId: string }>).detail.taskId;
      setState((current) => current.taskId === taskId ? initialTimerState : current);
      setSessions((current) => current.filter((session) => session.taskId !== taskId));
    };
    window.addEventListener('baw-task-deleted', clearDeletedTask);
    return () => window.removeEventListener('baw-task-deleted', clearDeletedTask);
  }, []);

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
      const hasNextStep = Boolean(completeCurrentStep());
      setState((current) => hasNextStep ? ({
        ...initialTimerState,
        mode: 'focus',
        taskId: current.taskId,
        taskTitle: current.taskTitle,
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
    if (todayPlan?.taskId === state.taskId) saveCompletedTodayStep(state.stepId, elapsedSeconds);
    const tasks = loadStoredTasks();
    const task = tasks.find((item) => item.id === state.taskId);
    if (!task?.steps) return null;
    const steps = task.steps.map((step) => step.id === state.stepId
      ? { ...step, done: true, actualSeconds: (step.actualSeconds ?? 0) + elapsedSeconds }
      : step);
    const nextStep = steps.find((step) => !step.done);
    const updatedTasks = tasks.map((item) => item.id === task.id
      ? { ...item, steps, status: nextStep ? 'in_progress' as const : 'done' as const }
      : item);
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
    window.dispatchEvent(new CustomEvent('baw-tasks-changed'));
    const updatedTask = updatedTasks.find((item) => item.id === task.id);
    if (updatedTask) void persistTask(updatedTask);
    window.dispatchEvent(new CustomEvent('baw-today-step-completed', {
      detail: { stepId: state.stepId, actualSeconds: elapsedSeconds },
    }));
    return nextStep ?? null;
  }

  const value = useMemo<TimerContextValue>(() => ({
    state,
    sessions,
    elapsedSeconds,
    displaySeconds,
    isFinishingStep,
    activateTask: (taskId, taskTitle) => setState((current) => {
      if (current.taskId === taskId || (current.isRunning && current.taskId)) return current;
      return loadTaskTimerStates()[taskId] ?? {
        ...initialTimerState, mode: current.mode, taskId, taskTitle,
      };
    }),
    selectTask: (taskId, taskTitle) => setState((current) => ({
      ...current, taskId, taskTitle, stepId: '', stepTitle: '', targetSeconds: null,
    })),
    startStep: (taskId, taskTitle, step) => {
      if (state.isRunning && state.taskId && state.taskId !== taskId) return;
      if (state.taskId === taskId && state.stepId === step.id && state.targetSeconds !== null) return;
      const task = loadStoredTasks().find((item) => item.id === taskId);
      if (task) void persistTaskStatus({ ...task, status: 'in_progress', statusBeforePause: undefined });
      setNow(Date.now());
      setState({
        ...initialTimerState, mode: 'focus', taskId, taskTitle,
        stepId: step.id, stepTitle: step.title, targetSeconds: step.minutes * 60,
        isRunning: true, startedAt: Date.now(),
      });
    },
    setMode: (mode) => setState((current) => ({
      ...initialTimerState, mode, taskId: current.taskId, taskTitle: current.taskTitle,
    })),
    toggle: () => {
      const actionTime = Date.now();
      setNow(actionTime);
      const task = loadStoredTasks().find((item) => item.id === state.taskId);
      if (!state.isRunning) {
        if (task) void persistTaskStatus({ ...task, status: 'in_progress' });
        setState({ ...state, isRunning: true, startedAt: actionTime });
        return;
      }
      const currentInterval = state.startedAt
        ? Math.max(0, Math.floor((actionTime - state.startedAt) / 1000))
        : 0;
      if (task) void persistTaskStatus({ ...task, status: 'paused', statusBeforePause: 'in_progress' });
      setState({
        ...state,
        isRunning: false,
        startedAt: null,
        accumulatedSeconds: state.accumulatedSeconds + currentInterval,
      });
    },
    reset: () => setState((current) => ({
      ...initialTimerState, mode: current.mode, taskId: current.taskId, taskTitle: current.taskTitle,
    })),
    clearTask: (taskId) => {
      const timers = loadTaskTimerStates();
      delete timers[taskId];
      window.localStorage.setItem(TASK_TIMERS_STORAGE_KEY, JSON.stringify(timers));
      setState((current) => current.taskId === taskId
        ? { ...initialTimerState, mode: current.mode }
        : current);
    },
    clearSessions: () => setSessions([]),
    deleteSession: (id) => setSessions((current) => current.filter((session) => session.id !== id)),
    finish: () => {
      if (finishLock.current || !state.stepId) return;
      finishLock.current = true;
      setIsFinishingStep(true);
      if (state.phase === 'work') saveSession(elapsedSeconds);
      const hasNextStep = Boolean(completeCurrentStep());
      setState((current) => hasNextStep ? ({
        ...initialTimerState,
        mode: 'focus',
        taskId: current.taskId,
        taskTitle: current.taskTitle,
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
