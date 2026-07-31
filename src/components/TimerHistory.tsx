import { formatTimer, type TimerSession } from '../lib/timer';

export function TimerHistory({ sessions }: { sessions: TimerSession[] }) {
  return (
    <section className="timer-history" aria-labelledby="timer-history-title">
      <div className="timer-section-heading">
        <div>
          <span className="tasks-eyebrow">История</span>
          <h2 id="timer-history-title">Последние сессии</h2>
        </div>
      </div>
      {sessions.length === 0 ? (
        <p className="timer-history__empty">Завершённые сессии появятся здесь.</p>
      ) : (
        <div className="timer-history__list">
          {sessions.slice(0, 6).map((session) => (
            <article key={session.id}>
              <div><strong>{session.taskTitle}</strong><span>{session.mode === 'focus' ? 'Фокус' : 'Свободный режим'}</span></div>
              <time dateTime={session.completedAt}>{formatTimer(session.seconds)}</time>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
