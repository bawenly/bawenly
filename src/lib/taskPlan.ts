import { createTaskScenario } from './ai';
import { persistTask } from './taskRepository';
import type { Task } from './tasks';

const requests = new Map<string, Promise<Task>>();

export function generateAndSaveTaskPlan(task: Task, reason: string) {
  const running = requests.get(task.id);
  if (running) return running;

  const loadingTask: Task = {
    ...task,
    procrastinationReason: reason,
    stepsGeneration: 'loading',
  };
  const request = persistTask(loadingTask).catch(() => loadingTask)
    .then(() => createTaskScenario(task.title, reason))
    .then(async ({ steps, finalState }) => {
      const completedTask: Task = {
        ...loadingTask,
        steps,
        estimatedMinutes: steps.reduce((total, step) => total + step.minutes, 0),
        stepsGeneration: undefined,
        generationError: undefined,
        finalState,
      };
      await persistTask(completedTask).catch(() => completedTask);
      return completedTask;
    });

  requests.set(task.id, request);
  void request.finally(() => {
    if (requests.get(task.id) === request) requests.delete(task.id);
  }).catch(() => undefined);
  return request;
}
