import { useState } from 'react';
import { createTaskPlan, estimateTaskMinutes, simplifyStep } from '../lib/ai';
import type { Task } from '../lib/tasks';

type Props = {
  task: Task;
  onChange: (task: Task) => void;
  onExpanded: () => void;
};

export function AiTaskTools({ task, onChange, onExpanded }: Props) {
  const [action, setAction] = useState<'plan' | 'simplify' | 'estimate' | null>(null);
  const [error, setError] = useState('');
  const nextStep = task.steps?.find((step) => !step.done);

  async function makePlan() {
    setAction('plan');
    setError('');
    try {
      const steps = await createTaskPlan(task.title, task.procrastinationReason);
      onChange({
        ...task,
        steps,
        estimatedMinutes: steps.reduce((total, step) => total + step.minutes, 0),
      });
      onExpanded();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не получилось составить план.');
    } finally {
      setAction(null);
    }
  }

  async function estimateTime() {
    setAction('estimate');
    setError('');
    try {
      onChange({ ...task, estimatedMinutes: await estimateTaskMinutes(task.title) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не получилось оценить время.');
    } finally {
      setAction(null);
    }
  }

  async function makeStepSimpler() {
    if (!nextStep || !task.steps) return;
    setAction('simplify');
    setError('');
    try {
      const suggestion = await simplifyStep(
        task.title,
        nextStep.title,
        task.procrastinationReason,
      );
      const steps = task.steps.map((step) => step.id === nextStep.id
        ? { ...step, title: suggestion.title, minutes: suggestion.minutes }
        : step);
      onChange({
        ...task,
        steps,
        estimatedMinutes: steps.reduce((total, step) => total + step.minutes, 0),
      });
      onExpanded();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не получилось упростить шаг.');
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="ai-task-tools">
      {!task.steps?.length && (
        <>
          <button type="button" disabled={action !== null} onClick={() => void makePlan()}>
            ✦ {action === 'plan' ? 'Составляю план…' : 'Разбить с ИИ'}
          </button>
          {!task.estimatedMinutes && (
            <button type="button" disabled={action !== null} onClick={() => void estimateTime()}>
              ✦ {action === 'estimate' ? 'Оцениваю…' : 'Оценить время'}
            </button>
          )}
        </>
      )}
      {nextStep && (
        <button type="button" disabled={action !== null} onClick={() => void makeStepSimpler()}>
          ✦ {action === 'simplify' ? 'Упрощаю…' : 'Сделать следующий шаг проще'}
        </button>
      )}
      {error && <span className="ai-error" role="alert">{error}</span>}
    </div>
  );
}
