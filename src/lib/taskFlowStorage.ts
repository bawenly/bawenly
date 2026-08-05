import type { Task, TaskStep } from './tasks';

export const TODAY_PLAN_KEY = 'baw-today-plan-v1';
export const FLOW_STORAGE_KEY = 'baw-today-flow-v2';
export const PENDING_TASK_KEY = 'baw-pending-task-v1';
export const ACTIVE_TASK_FLOW_KEY = 'baw-active-task-flow-v1';
export const ACTIVE_TASK_ORIGIN_KEY = 'baw-active-task-origin-v1';
export const PENDING_STEPS_KEY = 'baw-pending-steps-v1';
const TASK_PLANS_KEY = 'baw-task-plans-v1';
const TASK_FLOW_STATES_KEY = 'baw-task-flow-states-v1';

export type PendingSteps = { taskId: string; taskTitle: string; reason: string };

export function savePendingSteps(pending: PendingSteps) {
  window.localStorage.setItem(PENDING_STEPS_KEY, JSON.stringify(pending));
}

export function loadPendingSteps(): PendingSteps | null {
  try {
    const stored = window.localStorage.getItem(PENDING_STEPS_KEY);
    return stored ? JSON.parse(stored) as PendingSteps : null;
  } catch {
    return null;
  }
}

export function clearPendingSteps(taskId: string) {
  const pending = loadPendingSteps();
  if (pending?.taskId === taskId) window.localStorage.removeItem(PENDING_STEPS_KEY);
}

export type TodayPlan = {
  taskId: string;
  taskTitle: string;
  reason: string;
  steps: TaskStep[];
  finalState?: string;
};

export type TaskFlowState = {
  stage: 'reason' | 'clarify' | 'step';
  viewedStepIndex: number;
  showCompletion: boolean;
};

export function prepareExistingTaskFlow(task: Task) {
  if (!task.steps?.length && task.stepsGeneration !== 'loading') return false;
  const reason = task.procrastinationReason ?? '';
  const plan: TodayPlan = {
    taskId: task.id,
    taskTitle: task.title,
    reason,
    steps: task.steps ?? [],
  };
  window.localStorage.setItem(TODAY_PLAN_KEY, JSON.stringify(plan));
  window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify({
    stage: 'step', taskDraft: '', task: task.title, reason,
  }));
  window.localStorage.setItem(ACTIVE_TASK_FLOW_KEY, task.id);
  return true;
}

export function loadTodayPlan() {
  try {
    const stored = window.localStorage.getItem(TODAY_PLAN_KEY);
    return stored ? JSON.parse(stored) as TodayPlan : null;
  } catch {
    return null;
  }
}

type TaskPlanStore = Record<string, TodayPlan>;

function loadTaskPlans(): TaskPlanStore {
  try {
    return JSON.parse(window.localStorage.getItem(TASK_PLANS_KEY) ?? '{}') as TaskPlanStore;
  } catch {
    return {};
  }
}

export function saveTaskPlan(plan: TodayPlan) {
  window.localStorage.setItem(TASK_PLANS_KEY, JSON.stringify({
    ...loadTaskPlans(), [plan.taskId]: plan,
  }));
  window.localStorage.setItem(TODAY_PLAN_KEY, JSON.stringify(plan));
}

export function loadTaskPlan(taskId: string) {
  return loadTaskPlans()[taskId] ?? null;
}

export function clearTaskPlan(taskId: string) {
  const plans = loadTaskPlans();
  delete plans[taskId];
  window.localStorage.setItem(TASK_PLANS_KEY, JSON.stringify(plans));
  if (loadTodayPlan()?.taskId === taskId) window.localStorage.removeItem(TODAY_PLAN_KEY);
  clearTaskFlowState(taskId);
}

function loadTaskFlowStates() {
  try {
    return JSON.parse(window.localStorage.getItem(TASK_FLOW_STATES_KEY) ?? '{}') as Record<string, TaskFlowState>;
  } catch {
    return {};
  }
}

export function loadTaskFlowState(taskId: string) {
  return loadTaskFlowStates()[taskId] ?? null;
}

export function saveTaskFlowState(taskId: string, state: TaskFlowState) {
  window.localStorage.setItem(TASK_FLOW_STATES_KEY, JSON.stringify({
    ...loadTaskFlowStates(), [taskId]: state,
  }));
}

export function clearTaskFlowState(taskId: string) {
  const states = loadTaskFlowStates();
  delete states[taskId];
  window.localStorage.setItem(TASK_FLOW_STATES_KEY, JSON.stringify(states));
}
