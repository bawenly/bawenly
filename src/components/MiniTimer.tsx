import { Link, useLocation } from 'wouter';
import { formatTimer } from '../lib/timer';
import { useTimer } from './TimerProvider';

export function MiniTimer() {
  const [location] = useLocation();
  const { displaySeconds, reset, state, toggle } = useTimer();
  const isActive = Boolean(state.stepTitle || state.taskTitle)
    && (state.isRunning || state.accumulatedSeconds > 0 || state.targetSeconds);

  if (!isActive || location === '/timer') return null;

  return (
    <aside className="mini-timer" aria-label="Активный таймер">
      <Link
        className="mini-timer__main"
        href={state.taskId === 'today-flow' ? '/step' : '/timer'}
        aria-label="Открыть активный шаг"
      >
        <span>{state.stepTitle || state.taskTitle}</span>
        <small>{state.taskTitle}</small>
        <strong>{formatTimer(displaySeconds)}</strong>
      </Link>
      <button className="mini-timer__toggle" type="button" onClick={toggle}>
        {state.isRunning ? 'Пауза' : 'Продолжить'}
      </button>
      <button className="mini-timer__close" type="button" onClick={reset} aria-label="Удалить таймер">
        ×
      </button>
    </aside>
  );
}
