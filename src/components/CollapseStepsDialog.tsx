type Props = {
  completed: number;
  total: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CollapseStepsDialog({ completed, total, onCancel, onConfirm }: Props) {
  return (
    <div className="task-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="task-dialog" role="dialog" aria-modal="true"
        aria-labelledby="collapse-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="collapse-dialog-title">Свернуть шаги в одну задачу?</h2>
        <p>
          Список из {total} шагов будет убран, а задача снова станет одним действием.
          {' '}Выполнено {completed} из {total} шагов.
        </p>
        <p>Выполненные шаги сохранятся в истории задачи, поэтому прогресс не потеряется безвозвратно.</p>
        <div className="task-dialog__actions">
          <button type="button" onClick={onCancel}>Отмена</button>
          <button className="task-dialog__confirm" type="button" onClick={onConfirm}>Свернуть в задачу</button>
        </div>
      </section>
    </div>
  );
}
