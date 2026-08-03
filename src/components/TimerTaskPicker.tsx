import { useState } from 'react';
import type { Task } from '../lib/tasks';
import { AppModal } from './AppModal';

type Props = { tasks: Task[]; currentTaskId: string; onCancel: () => void; onConfirm: (id: string) => void; onCreateTask: () => void };

export function TimerTaskPicker({ tasks, currentTaskId, onCancel, onConfirm, onCreateTask }: Props) {
  const [selectedId, setSelectedId] = useState(currentTaskId);
  return (
    <AppModal title="Выбрать задачу" onClose={onCancel} className="timer-task-modal" actions={(requestClose) => tasks.length ? <>
      <button type="button" onClick={() => requestClose()}>Отмена</button>
      <button className="app-modal__primary" type="button" disabled={!selectedId}
        onClick={() => requestClose(() => onConfirm(selectedId))}>Выбрать</button>
    </> : null}>
      {(requestClose) => tasks.length ? <div className="timer-task-options" role="radiogroup" aria-label="Существующие незавершенные задачи">
        {tasks.map((task) => {
          const nextStep = task.steps?.find((step) => !step.done);
          const selected = selectedId === task.id;
          return <button className={`timer-task-option${selected ? ' timer-task-option--selected' : ''}`}
            type="button" role="radio" aria-checked={selected} key={task.id} onClick={() => setSelectedId(task.id)}>
            <strong data-user-text>{task.title}</strong>
            {nextStep && <span><small>Текущий шаг</small><span data-user-text>{nextStep.title}</span></span>}
          </button>;
        })}
      </div> : <div className="timer-task-empty">
        <p>Пока нет незавершённых задач. Создай новую задачу, чтобы начать фокус.</p>
        <button className="app-modal__primary" type="button" onClick={() => requestClose(onCreateTask)}>Создать задачу</button>
      </div>}
    </AppModal>
  );
}
