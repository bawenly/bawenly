import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import type { TaskStep } from '../lib/tasks';
import { StepTextModal } from './StepTextModal';

type Props = { steps: TaskStep[]; onChange: (steps: TaskStep[]) => void };
type DragState = { stepId: string; sourceIndex: number; insertAt: number; deltaY: number; height: number };
type TextModal = { mode: 'edit' | 'add'; step: TaskStep };

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
  const [textModal, setTextModal] = useState<TextModal | null>(null);

  function saveText(title: string) {
    if (!textModal) return;
    if (textModal.mode === 'edit') {
      onChange(steps.map((item) => item.id === textModal.step.id ? { ...item, title } : item));
    } else {
      const substep = { id: crypto.randomUUID(), title, done: false, minutes: 5 };
      onChange(steps.map((item) => item.id === textModal.step.id
        ? { ...item, substeps: [...(item.substeps ?? []), substep] } : item));
    }
    setTextModal(null);
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, stepId: string) {
    if (drag) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const sourceIndex = steps.findIndex((step) => step.id === stepId);
    const item = event.currentTarget.closest<HTMLElement>('[data-step-index]');
    setDrag({ stepId, sourceIndex, insertAt: sourceIndex, deltaY: 0, height: item?.offsetHeight ?? 0 });
    event.currentTarget.dataset.dragStartY = String(event.clientY);
  }

  function updateDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const startY = Number(event.currentTarget.dataset.dragStartY ?? event.clientY);
    const target = document.elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest<HTMLElement>('[data-step-index]'))
      .find((element) => element && Number(element.dataset.stepIndex) !== drag.sourceIndex);
    if (!target) {
      setDrag((current) => current ? { ...current, deltaY: event.clientY - startY } : null);
      return;
    }
    const index = Number(target.dataset.stepIndex);
    const insertAt = event.clientY > target.getBoundingClientRect().top
      + target.getBoundingClientRect().height / 2 ? index + 1 : index;
    setDrag((current) => current ? { ...current, insertAt, deltaY: event.clientY - startY } : null);
  }

  function finishDrag() {
    if (!drag) return;
    const sourceIndex = drag.sourceIndex;
    const next = [...steps];
    const [moved] = next.splice(sourceIndex, 1);
    const targetIndex = drag.insertAt > sourceIndex ? drag.insertAt - 1 : drag.insertAt;
    next.splice(targetIndex, 0, moved);
    setDrag(null);
    if (targetIndex !== sourceIndex) onChange(next);
  }

  function dragStyle(index: number): CSSProperties | undefined {
    if (!drag) return undefined;
    if (index === drag.sourceIndex) {
      return { '--task-step-drag-y': `${drag.deltaY}px` } as CSSProperties;
    }
    const movesUp = drag.insertAt > drag.sourceIndex
      && index > drag.sourceIndex && index < drag.insertAt;
    const movesDown = drag.insertAt <= drag.sourceIndex
      && index >= drag.insertAt && index < drag.sourceIndex;
    if (!movesUp && !movesDown) return undefined;
    return { '--task-step-shift-y': `${movesUp ? -drag.height : drag.height}px` } as CSSProperties;
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
        ].filter(Boolean).join(' ')} key={step.id} data-step-index={index} style={dragStyle(index)}>
          <div className="task-step__row">
            <label><input type="checkbox" checked={step.done} onChange={() => onChange(steps.map((item) => item.id === step.id ? { ...item, done: !item.done } : item))} /><span data-user-text>{step.title}</span><small>≈ {step.minutes} мин</small></label>
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
            <IconButton label="Изменить" onClick={() => setTextModal({ mode: 'edit', step })}>
              <svg viewBox="0 0 18 18" aria-hidden="true"><path d="m4 12.8-.7 2.4 2.4-.7 7.8-7.8-1.7-1.7L4 12.8Z"/><path d="m10.9 5.9 1.7 1.7"/></svg>
            </IconButton>
            <IconButton label="Добавить подпункт" onClick={() => setTextModal({ mode: 'add', step })}>
              <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 3v12M3 9h12"/></svg>
            </IconButton>
            <button type="button" onClick={() => onChange(steps.filter((item) => item.id !== step.id))} aria-label="Удалить шаг">×</button>
          </div>
          {step.substeps?.map((substep) => <div className="task-substep" data-user-text key={substep.id}>↳ {substep.title}</div>)}
        </div>
      ))}
      {drag?.insertAt === steps.length && <div className="task-steps__end-drop" aria-hidden="true" />}
      <button className="add-step-button" type="button" onClick={() => onChange([...steps, { id: crypto.randomUUID(), title: 'Новый шаг', done: false, minutes: 10 }])}>＋ Добавить шаг</button>
      {textModal && <StepTextModal mode={textModal.mode}
        initialValue={textModal.mode === 'edit' ? textModal.step.title : ''}
        onCancel={() => setTextModal(null)} onSubmit={saveText} />}
    </div>
  );
}
