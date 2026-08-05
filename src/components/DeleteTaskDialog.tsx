import { useState } from 'react';
import { AppModal } from './AppModal';
import type { Task } from '../lib/tasks';

type Props = {
  task: Task;
  onCancel: () => void;
  onConfirm: (taskId: string) => Promise<void>;
};

export function DeleteTaskDialog({ task, onCancel, onConfirm }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  async function confirmDelete(requestClose: (afterClose?: () => void) => void) {
    if (isDeleting) return;
    setIsDeleting(true);
    setError('');
    try {
      await onConfirm(task.id);
      requestClose(onCancel);
    } catch {
      setError('Не удалось удалить задачу. Проверь соединение и попробуй ещё раз.');
      setIsDeleting(false);
    }
  }

  return (
    <AppModal title="Удалить задачу?" onClose={onCancel} className="delete-task-modal"
      closeDisabled={isDeleting} actions={(requestClose) => <>
        <button type="button" disabled={isDeleting} onClick={() => requestClose()}>Отмена</button>
        <button className="app-modal__danger" type="button" disabled={isDeleting}
          onClick={() => void confirmDelete(requestClose)}>
          {isDeleting ? 'Удаляем…' : 'Удалить'}
        </button>
      </>}>
      <p>Задача и все связанные с ней шаги будут удалены. Это действие нельзя отменить.</p>
      {error && <p className="delete-task-modal__error" role="alert">{error}</p>}
    </AppModal>
  );
}
