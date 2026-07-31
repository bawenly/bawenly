import { useState } from 'react';
import { formatDeadline, getLocalDateKey } from '../lib/tasks';

type Props = {
  dueDate?: string;
  onChange: (dueDate?: string) => void;
};

export function TaskDeadline({ dueDate, onChange }: Props) {
  const [isEditing, setIsEditing] = useState(false);

  if (!isEditing) {
    return (
      <button className={dueDate ? 'task-deadline' : 'task-deadline task-deadline--empty'} type="button" onClick={() => setIsEditing(true)}>
        ◷ {dueDate ? formatDeadline(dueDate) : 'Добавить срок'}
      </button>
    );
  }

  return (
    <div className="task-deadline-editor">
      <button type="button" onClick={() => { onChange(getLocalDateKey()); setIsEditing(false); }}>Сегодня</button>
      <input aria-label="Дата дедлайна" type="date" value={dueDate ?? ''} onChange={(event) => { onChange(event.target.value || undefined); setIsEditing(false); }} />
      {dueDate && <button type="button" onClick={() => { onChange(undefined); setIsEditing(false); }}>Удалить</button>}
      <button type="button" onClick={() => setIsEditing(false)} aria-label="Закрыть">×</button>
    </div>
  );
}
