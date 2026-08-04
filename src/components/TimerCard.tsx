import { Link } from 'wouter';
import { formatTimer } from '../lib/timer';
import { useTimer } from './TimerProvider';

export function TimerCard() {
  const { displaySeconds, state, toggle } = useTimer();
  const hasTimer = state.isRunning || state.accumulatedSeconds > 0;

  return (
    <section className="progress-timer-card" aria-labelledby="progress-timer-title">
      <div>
        <span className="tasks-eyebrow">Время для себя</span>
        <h2 className={hasTimer ? undefined : 'cormorant-heading cormorant-heading--medium'} id="progress-timer-title">
          {hasTimer ? state.taskTitle || 'Текущая сессия' : 'Готов продолжить?'}
        </h2>
        <p>{hasTimer
          ? `${state.mode === 'focus' ? 'Фокус' : 'Свободный режим'} · ${formatTimer(displaySeconds)}`
          : 'Выбери задачу и начни с одного спокойного шага.'}</p>
      </div>
      <div className="progress-timer-card__actions">
        {hasTimer && <button type="button" onClick={toggle}>{state.isRunning ? 'Пауза' : 'Продолжить'}</button>}
        <Link href="/timer">{hasTimer ? 'Открыть таймер' : 'Начать фокус'}</Link>
      </div>
    </section>
  );
}
