import { useState } from 'react';
import { useLocation } from 'wouter';
import { statusLabels, withRecalculatedStatus, type Task } from '../lib/tasks';
import { AiTaskTools } from './AiTaskTools';
import { CollapseStepsDialog } from './CollapseStepsDialog';
import { TaskActionsMenu } from './TaskActionsMenu';
import { TaskDeadline } from './TaskDeadline';
import { TaskSteps } from './TaskSteps';
import { useTimer } from './TimerProvider';

type Props = { task: Task; onChange: (task: Task) => void; onDelete: () => void };

function formatEstimate(minutes: number) {
  if (minutes < 60) return `≈ ${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `≈ ${hours} ч${rest ? ` ${rest} мин` : ''}`;
}

export function TaskCard({ task, onChange, onDelete }: Props) {
  const timer = useTimer();
  const [, setLocation] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapseDialogOpen, setIsCollapseDialogOpen] = useState(false);
  const completed = task.steps?.filter((step) => step.done).length ?? 0;
  const total = task.steps?.length ?? 0;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const nextStep = task.steps?.find((step) => !step.done);
  const remaining = task.steps?.filter((step) => !step.done)
    .reduce((sum, step) => sum + step.minutes, 0) ?? 0;
  const totalMinutes = task.steps?.reduce((sum, step) => sum + step.minutes, 0)
    ?? task.estimatedMinutes;
  const isComposite = total > 0;

  function changeStatus() {
    if (isComposite) return;
    onChange({ ...task, status: task.status === 'done' ? 'not_started' : 'done' });
  }

  function handlePrimaryAction() {
    if (task.status === 'paused') return;
    if (isComposite) {
      onChange({ ...task, status: 'in_progress' });
      const step = task.steps?.find((item) => !item.done);
      if (step) timer.startStep(task.id, task.title, step);
      setLocation('/timer');
      return;
    }
    onChange({ ...task, status: task.status === 'not_started' ? 'in_progress' : 'done' });
  }

  function collapseSteps() {
    const historyEntry = {
      id: crypto.randomUUID(),
      type: 'steps_collapsed' as const,
      createdAt: new Date().toISOString(),
      completedSteps: task.steps?.filter((step) => step.done) ?? [],
      totalSteps: total,
    };
    onChange({ ...task, steps: undefined, history: [...(task.history ?? []), historyEntry] });
    setIsExpanded(false);
    setIsCollapseDialogOpen(false);
  }

  function togglePause() {
    const nextTask = task.status === 'paused'
      ? { ...task, status: task.statusBeforePause ?? 'not_started', statusBeforePause: undefined }
      : { ...task, statusBeforePause: task.status, status: 'paused' as const };
    onChange(nextTask);
    setIsMenuOpen(false);
  }

  return (
    <article className={`task-list-card task-list-card--${task.status}`}>
      <div className="task-list-card__main">
        <button className="task-complete" type="button" onClick={changeStatus}
          disabled={isComposite && task.status !== 'done'}
          aria-label={task.status === 'done' ? 'Вернуть задачу' : 'Выполнить задачу'}>
          {task.status === 'done' ? '✓' : ''}
        </button>
        <div className="task-list-card__content">
          <div className="task-list-card__title">
            <h2>{task.title}</h2>
            <span className={`status-badge status-badge--${task.status}`}>{statusLabels[task.status]}</span>
          </div>
          <TaskDeadline dueDate={task.dueDate} onChange={(dueDate) => onChange({ ...task, dueDate })} />
          {isComposite ? (
            <>
              <div className="task-progress-meta"><span>{completed} из {total} шагов</span><strong>{progress}%</strong></div>
              <div className="task-progress" aria-label={`Выполнено ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
              <div className="task-next task-next--timing">
                <span><small>Ближайший шаг</small>{nextStep?.title ?? 'Все шаги готовы'}</span>
                <span><small>На всю задачу</small>{totalMinutes ? formatEstimate(totalMinutes) : 'Нет оценки'}</span>
                <span><small>Осталось</small>{remaining ? formatEstimate(remaining) : 'Готово'}</span>
              </div>
            </>
          ) : (
            <div className="simple-task-meta">
              {totalMinutes ? <span><small>Примерное время</small>{formatEstimate(totalMinutes)}</span> : null}
            </div>
          )}
        </div>
        <div className="task-list-card__buttons">
          {task.status !== 'done' && task.status !== 'paused' && (
            <button className="continue-button" type="button" onClick={handlePrimaryAction}>
              {isComposite ? 'Продолжить' : task.status === 'not_started' ? 'Начать' : 'Выполнить'}
            </button>
          )}
          {isComposite && (
            <button className="expand-button" type="button"
              onClick={() => setIsExpanded((value) => !value)} aria-expanded={isExpanded}>
              {isExpanded ? 'Скрыть шаги' : 'Все шаги'} <span>{isExpanded ? '⌃' : '⌄'}</span>
            </button>
          )}
          <TaskActionsMenu isComposite={isComposite} isOpen={isMenuOpen}
            isPaused={task.status === 'paused'}
            onCollapse={() => { setIsMenuOpen(false); setIsCollapseDialogOpen(true); }}
            onDelete={onDelete} onPauseToggle={togglePause}
            onToggle={() => setIsMenuOpen((value) => !value)} />
        </div>
      </div>
      {task.status !== 'done' && (
        <AiTaskTools task={task} onChange={onChange} onExpanded={() => setIsExpanded(true)} />
      )}
      {isExpanded && task.steps && (
        <TaskSteps steps={task.steps}
          onChange={(steps) => onChange(withRecalculatedStatus({
            ...task,
            steps,
            estimatedMinutes: steps.reduce((sum, step) => sum + step.minutes, 0),
          }))} />
      )}
      {isCollapseDialogOpen && (
        <CollapseStepsDialog completed={completed} total={total}
          onCancel={() => setIsCollapseDialogOpen(false)} onConfirm={collapseSteps} />
      )}
    </article>
  );
}
