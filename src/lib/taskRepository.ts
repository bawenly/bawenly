import { supabase } from './supabase';
import { loadStoredTasks, saveStoredTask, TASKS_STORAGE_KEY, type Task, type TaskStep } from './tasks';
import { clearDeletedTaskData } from './taskDeletion';

type TaskRow = {
  id: string;
  title: string;
  status: Task['status'];
  status_before_pause: Task['statusBeforePause'] | null;
  due_date: string | null;
  procrastination_reason: string | null;
  estimated_minutes: number | null;
  generation_state: Task['stepsGeneration'] | null;
  generation_error: string | null;
  final_state: string | null;
};

type StepRow = {
  id: string;
  task_id: string;
  title: string;
  position: number;
  estimated_minutes: number;
  actual_seconds: number;
  is_done: boolean;
  support: TaskStep['support'] | null;
};

function taskPayload(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    status: task.status,
    status_before_pause: task.statusBeforePause ?? null,
    due_date: task.dueDate ?? null,
    procrastination_reason: task.procrastinationReason ?? null,
    estimated_minutes: task.estimatedMinutes ?? null,
    generation_state: task.stepsGeneration ?? null,
    generation_error: task.generationError ?? null,
    final_state: task.finalState ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function createTask(task: Task) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Сначала войди в аккаунт.');
  const { error } = await supabase.from('tasks').upsert(
    taskPayload(task, data.user.id),
    { onConflict: 'id' },
  );
  if (error) throw error;
  saveStoredTask(task);
  return task;
}

export async function persistTask(task: Task) {
  saveStoredTask(task);
  const { data } = await supabase.auth.getUser();
  if (!data.user) return task;
  const { error } = await supabase.from('tasks').upsert(taskPayload(task, data.user.id));
  if (error) throw error;

  if (task.steps) {
    const { error: deleteError } = await supabase.from('task_steps')
      .delete().eq('task_id', task.id);
    if (deleteError) throw deleteError;
    if (task.steps.length) {
      const { error: stepsError } = await supabase.from('task_steps').insert(
        task.steps.map((step, position) => ({
          id: step.id,
          task_id: task.id,
          user_id: data.user.id,
          title: step.title,
          position,
          estimated_minutes: step.minutes,
          actual_seconds: step.actualSeconds ?? 0,
          is_done: step.done,
          support: step.support ?? null,
        })),
      );
      if (stepsError) throw stepsError;
    }
  }
  return task;
}

export async function persistTaskStatus(task: Task) {
  saveStoredTask(task);
  const { data } = await supabase.auth.getUser();
  if (!data.user) return task;
  const { error } = await supabase.from('tasks').upsert(taskPayload(task, data.user.id));
  if (error) throw error;
  return task;
}

export async function loadUserTasks() {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return loadStoredTasks();
  const [{ data: taskRows, error }, { data: stepRows, error: stepsError }] = await Promise.all([
    supabase.from('tasks').select('id,title,status,status_before_pause,due_date,procrastination_reason,estimated_minutes,generation_state,generation_error,final_state')
      .order('created_at', { ascending: false }),
    supabase.from('task_steps').select('id,task_id,title,position,estimated_minutes,actual_seconds,is_done,support')
      .order('position'),
  ]);
  if (error) throw error;
  if (stepsError) throw stepsError;
  const stepsByTask = new Map<string, TaskStep[]>();
  for (const row of (stepRows ?? []) as StepRow[]) {
    const steps = stepsByTask.get(row.task_id) ?? [];
    steps.push({
      id: row.id, title: row.title, done: row.is_done,
      minutes: row.estimated_minutes, actualSeconds: row.actual_seconds,
      support: row.support ?? undefined,
    });
    stepsByTask.set(row.task_id, steps);
  }
  const remoteTasks = ((taskRows ?? []) as TaskRow[]).map((row): Task => ({
    id: row.id,
    title: row.title,
    status: row.status,
    statusBeforePause: row.status_before_pause ?? undefined,
    dueDate: row.due_date ?? undefined,
    procrastinationReason: row.procrastination_reason ?? undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    stepsGeneration: row.generation_state ?? undefined,
    generationError: row.generation_error ?? undefined,
    finalState: row.final_state ?? undefined,
    steps: stepsByTask.get(row.id),
  }));
  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(remoteTasks));
  window.dispatchEvent(new CustomEvent('baw-tasks-changed'));
  return remoteTasks;
}

export async function removeTask(taskId: string) {
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  }
  const tasks = loadStoredTasks().filter((task) => task.id !== taskId);
  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  clearDeletedTaskData(taskId);
  window.dispatchEvent(new CustomEvent('baw-tasks-changed'));
}
