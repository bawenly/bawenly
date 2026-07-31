import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import type { TaskStep } from '../lib/tasks';

type Props = { steps: TaskStep[]; onChange: (steps: TaskStep[]) => void };
type DragState = { stepId: string; insertAt: number };

function IconButton({ label, onClick, children }: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button className="task-step__icon-button" type="button" onClick={onClick}
      aria-label={label} title={label}>
      {children}
    </button>
  );
}

export function TaskSteps({ steps, onChange }: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);

  function editStep(step: TaskStep) {
    const title = window.prompt('Название шага', step.title)?.trim();
    if (title) onChange(steps.map((item) => item.id === step.id ? { ...item, title } : item));
  }

  function addSubstep(step: TaskStep) {
    const title = window.prompt('Название подпункта')?.trim();
    if (!title) return;
    const substep = { id: crypto.randomUUID(), title, done: false, minutes: 5 };
    onChange(steps.map((item) => item.id === step.id ? { ...item, substeps: [...(item.substeps ?? []), substep] } : item));
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, stepId: string) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ stepId, insertAt: steps.findIndex((step) => step.id === stepId) });
  }

  function updateDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-step-index]');
    if (!target) return;
    const index = Number(target.dataset.stepIndex);
    const insertAt = event.clientY > target.getBoundingClientRect().top
      + target.getBoundingClientRect().height / 2 ? index + 1 : index;
    setDrag((current) => current ? { ...current, insertAt } : null);
  }

  function finishDrag() {
    if (!drag) return;
    const sourceIndex = steps.findIndex((step) => step.id === drag.stepId);
    const next = [...steps];
    const [moved] = next.splice(sourceIndex, 1);
    const targetIndex = drag.insertAt > sourceIndex ? drag.insertAt - 1 : drag.insertAt;
    next.splice(targetIndex, 0, moved);
    setDrag(null);
    if (targetIndex !== sourceIndex) onChange(next);
  }

  function moveWithKeyboard(event: KeyboardEvent, index: number) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const target = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="task-steps">
      {steps.map((step, index) => (
        <div className={[
          'task-step',
          drag?.stepId === step.id ? 'task-step--dragging' : '',
          drag?.insertAt === index && drag.stepId !== step.id ? 'task-step--drop-before' : '',
        ].filter(Boolean).join(' ')} key={step.id} data-step-index={index}>
          <div className="task-step__row">
            <label><input type="checkbox" checked={step.done} onChange={() => onChange(steps.map((item) => item.id === step.id ? { ...item, done: !item.done } : item))} /><span>{step.title}</span><small>≈ {step.minutes} мин</small></label>
            <button className="task-step__drag-handle" type="button"
              aria-label="Изменить порядок шага" title="Изменить порядок шага"
              onPointerDown={(event) => startDrag(event, step.id)}
              onPointerMove={updateDrag} onPointerUp={finishDrag}
              onPointerCancel={() => setDrag(null)}
              onKeyDown={(event) => moveWithKeyboard(event, index)}>
              <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 5h12M3 9h12M3 13h12" /></svg>
            </button>
          </div>
          <div className="task-step__actions">
            <IconButton label="Изменить" onClick={() => editStep(step)}>
              <svg viewBox="0 0 18 18" aria-hidden="true"><path d="m4 12.8-.7 2.4 2.4-.7 7.8-7.8-1.7-1.7L4 12.8Z"/><path d="m10.9 5.9 1.7 1.7"/></svg>
            </IconButton>
            <IconButton label="Добавить подпункт" onClick={() => addSubstep(step)}>
              <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 3v12M3 9h12"/></svg>
            </IconButton>
            <button type="button" onClick={() => onChange(steps.filter((item) => item.id !== step.id))} aria-label="Удалить шаг">×</button>
          </div>
          {step.substeps?.map((substep) => <div className="task-substep" key={substep.id}>↳ {substep.title}</div>)}
        </div>
      ))}
      {drag?.insertAt === steps.length && <div className="task-steps__end-drop" aria-hidden="true" />}
      <button className="add-step-button" type="button" onClick={() => onChange([...steps, { id: crypto.randomUUID(), title: 'Новый шаг', done: false, minutes: 10 }])}>＋ Добавить шаг</button>
    </div>
  );
}
