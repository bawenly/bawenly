import {
  ACTIVE_TASK_FLOW_KEY, ACTIVE_TASK_ORIGIN_KEY, FLOW_STORAGE_KEY, PENDING_STEPS_KEY,
  PENDING_TASK_KEY, TODAY_PLAN_KEY,
} from './taskFlowStorage';
import {
  initialTimerState, SESSIONS_STORAGE_KEY, TASK_TIMERS_STORAGE_KEY, TIMER_STORAGE_KEY,
  type TimerSession, type TimerState,
} from './timer';

const TASK_PLANS_KEY = 'baw-task-plans-v1';
const TASK_FLOW_STATES_KEY = 'baw-task-flow-states-v1';
const STEP_SUPPORT_KEY = 'baw-step-support-v2';
const CLARIFICATION_PREFIX = 'baw-task-clarification-v1:';

function removeRecordEntry(key: string, taskId: string) {
  try {
    const record = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>;
    delete record[taskId];
    localStorage.setItem(key, JSON.stringify(record));
  } catch {
    localStorage.removeItem(key);
  }
}

function removeMatchingValue(key: string, taskId: string) {
  if (localStorage.getItem(key) === taskId) localStorage.removeItem(key);
}

export function clearDeletedTaskData(taskId: string) {
  const isActiveTask = localStorage.getItem(ACTIVE_TASK_FLOW_KEY) === taskId;
  removeRecordEntry(TASK_PLANS_KEY, taskId);
  removeRecordEntry(TASK_FLOW_STATES_KEY, taskId);
  removeRecordEntry(TASK_TIMERS_STORAGE_KEY, taskId);

  try {
    const support = JSON.parse(localStorage.getItem(STEP_SUPPORT_KEY) ?? '{}') as Record<string, unknown>;
    const remaining = Object.fromEntries(Object.entries(support)
      .filter(([key]) => !key.startsWith(`${taskId}:`)));
    localStorage.setItem(STEP_SUPPORT_KEY, JSON.stringify(remaining));
  } catch {
    localStorage.removeItem(STEP_SUPPORT_KEY);
  }

  try {
    const sessions = JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) ?? '[]') as TimerSession[];
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.filter((item) => item.taskId !== taskId)));
  } catch {
    localStorage.removeItem(SESSIONS_STORAGE_KEY);
  }

  try {
    const timer = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) ?? 'null') as TimerState | null;
    if (timer?.taskId === taskId) localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(initialTimerState));
  } catch {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  }

  for (const key of [TODAY_PLAN_KEY, FLOW_STORAGE_KEY, PENDING_STEPS_KEY]) {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? 'null') as { taskId?: string } | null;
      if (value?.taskId === taskId) localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  }
  removeMatchingValue(PENDING_TASK_KEY, taskId);
  removeMatchingValue(ACTIVE_TASK_FLOW_KEY, taskId);
  if (isActiveTask) {
    localStorage.removeItem(FLOW_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_TASK_ORIGIN_KEY);
  }
  localStorage.removeItem(`${CLARIFICATION_PREFIX}${taskId}`);
  window.dispatchEvent(new CustomEvent('baw-task-deleted', { detail: { taskId } }));
}
