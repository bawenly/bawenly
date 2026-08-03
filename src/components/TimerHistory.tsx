import { useState } from 'react';
import { formatTimer, type TimerSession } from '../lib/timer';
import { AppModal } from './AppModal';

type Props = { sessions: TimerSession[]; onClear: () => void; onDelete: (id: string) => void };

export function TimerHistory({ sessions, onClear, onDelete }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  return (
    <section className="timer-history" aria-labelledby="timer-history-title">
      <div className="timer-section-heading timer-history__heading">
        <div><span className="tasks-eyebrow">История</span><h2 id="timer-history-title">Последние сессии</h2></div>
        {sessions.length > 0 && <button className="timer-history__clear" type="button"
          onClick={() => setIsClearConfirmOpen(true)}>Очистить</button>}
      </div>
      {sessions.length === 0 ? <p className="timer-history__empty">Завершённые сессии появятся здесь.</p> : (
        <div className="timer-history__list">
          {sessions.slice(0, 6).map((session) => {
            const isSelected = selectedId === session.id;
            return <div className={`timer-history__item${isSelected ? ' timer-history__item--selected' : ''}`} key={session.id}>
              <button className="timer-history__session" type="button" aria-expanded={isSelected}
                onClick={() => setSelectedId(isSelected ? null : session.id)}>
                <span><strong data-user-text>{session.taskTitle}</strong><small>{session.mode === 'focus' ? 'Фокус' : 'Свободный режим'}</small></span>
                <time dateTime={session.completedAt}>{formatTimer(session.seconds)}</time>
              </button>
              <button className="timer-history__delete" type="button" aria-label="Удалить сессию"
                onClick={() => { setSelectedId(null); onDelete(session.id); }}>
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6h11M8 3.5h4M6.5 6l.6 10h5.8l.6-10M8.5 8.5v5M11.5 8.5v5" /></svg>
              </button>
            </div>;
          })}
        </div>
      )}
      {isClearConfirmOpen && (
        <AppModal title="Удаление истории" onClose={() => setIsClearConfirmOpen(false)}
          actions={(requestClose) => <>
            <button type="button" onClick={() => requestClose()}>Нет</button>
            <button className="app-modal__primary" type="button"
              onClick={() => requestClose(() => { onClear(); setIsClearConfirmOpen(false); })}>Да</button>
          </>}>
          <p className="timer-history__confirm-text">Вы хотите удалить историю сессий?</p>
        </AppModal>
      )}
    </section>
  );
}
