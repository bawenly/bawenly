export type TimerMode = 'free' | 'focus';
export type FocusPhase = 'work' | 'break';

export type TimerSession = {
  id: string;
  taskId: string;
  taskTitle: string;
  mode: TimerMode;
  seconds: number;
  completedAt: string;
};

export type TimerState = {
  mode: TimerMode;
  phase: FocusPhase;
  taskId: string;
  taskTitle: string;
  stepId: string;
  stepTitle: string;
  targetSeconds: number | null;
  isRunning: boolean;
  startedAt: number | null;
  accumulatedSeconds: number;
  focusRound: number;
};

export const TIMER_STORAGE_KEY = 'baw-timer-v1';
export const SESSIONS_STORAGE_KEY = 'baw-timer-sessions-v1';
export const FOCUS_SECONDS = 25 * 60;
export const BREAK_SECONDS = 5 * 60;
export const LONG_BREAK_SECONDS = 15 * 60;

export const initialTimerState: TimerState = {
  mode: 'focus',
  phase: 'work',
  taskId: '',
  taskTitle: '',
  stepId: '',
  stepTitle: '',
  targetSeconds: null,
  isRunning: false,
  startedAt: null,
  accumulatedSeconds: 0,
  focusRound: 1,
};

export function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function loadTimerState() {
  try {
    const saved = window.localStorage.getItem(TIMER_STORAGE_KEY);
    return saved ? { ...initialTimerState, ...JSON.parse(saved) as TimerState } : initialTimerState;
  } catch {
    return initialTimerState;
  }
}

export function loadTimerSessions() {
  try {
    const saved = window.localStorage.getItem(SESSIONS_STORAGE_KEY);
    return saved ? JSON.parse(saved) as TimerSession[] : [];
  } catch {
    return [];
  }
}
