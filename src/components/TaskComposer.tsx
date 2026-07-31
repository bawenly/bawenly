import { useState } from 'react';
import { clarifyTask, createTaskPlan, estimateTaskMinutes } from '../lib/ai';
import { getLocalDateKey, type Task } from '../lib/tasks';

type Props = { onAdd: (task: Task) => void; onClose: () => void };

export function TaskComposer({ onAdd, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [useAiPlan, setUseAiPlan] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const looksLarge = title.trim().length > 34
    || /подготов|организ|создат|разработ|проект/i.test(title);

  async function improveTitle() {
    if (!title.trim()) return;
    setIsAiLoading(true);
    setAiError('');
    try {
      setTitle(await clarifyTask(title.trim()));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Не получилось обратиться к ИИ.');
    } finally {
      setIsAiLoading(false);
    }
  }

  async function addTask(withPlan = useAiPlan) {
    if (!title.trim()) return;
    setIsAiLoading(true);
    setAiError('');
    try {
      const steps = withPlan ? await createTaskPlan(title.trim()) : undefined;
      const estimatedMinutes = steps
        ? steps.reduce((total, step) => total + step.minutes, 0)
        : await estimateTaskMinutes(title.trim());
      onAdd({
        id: crypto.randomUUID(),
        title: title.trim(),
        status: 'not_started',
        estimatedMinutes,
        steps,
        dueDate: dueDate || undefined,
      });
      onClose();
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Не получилось составить план.');
    } finally {
      setIsAiLoading(false);
    }
  }

  return (
    <section className="task-composer" aria-label="Новая задача">
      <div className="task-composer__heading">
        <h2>Что хочется сделать?</h2>
        <button type="button" onClick={onClose} aria-label="Закрыть">×</button>
      </div>
      <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && void addTask(false)}
        placeholder="Например, записаться к врачу" />
      <div className="ai-title-tools">
        <button type="button" disabled={!title.trim() || isAiLoading} onClick={() => void improveTitle()}>
          ✦ Сделать задачу конкретнее
        </button>
      </div>
      <div className="deadline-field">
        <span>Дедлайн</span>
        <button className={dueDate === getLocalDateKey() ? 'deadline-today deadline-today--active' : 'deadline-today'}
          type="button" onClick={() => setDueDate(getLocalDateKey())}>Сегодня</button>
        <label><span className="sr-only">Конкретная дата</span>
          <input type="date" min={getLocalDateKey()} value={dueDate}
            onChange={(event) => setDueDate(event.target.value)} /></label>
        {dueDate && <button className="deadline-clear" type="button" onClick={() => setDueDate('')}>Без срока</button>}
      </div>
      {(looksLarge || useAiPlan) && (
        <div className="decomposition-hint">
          <p>Похоже, здесь несколько этапов. ИИ может составить небольшой понятный план.</p>
          <div>
            <button type="button" aria-pressed={useAiPlan} onClick={() => setUseAiPlan(true)}>✦ Разбить с ИИ</button>
            <button type="button" onClick={() => setUseAiPlan(false)}>Оставить как есть</button>
          </div>
        </div>
      )}
      {aiError && <p className="ai-error" role="alert">{aiError}</p>}
      <div className="task-composer__actions">
        <button type="button" onClick={onClose}>Отмена</button>
        <button className="new-task-button" type="button" disabled={isAiLoading} onClick={() => void addTask()}>
          {isAiLoading ? 'ИИ думает…' : useAiPlan ? 'Создать план' : 'Добавить'}
        </button>
      </div>
    </section>
  );
}
