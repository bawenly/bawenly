import { useMemo } from 'react';
import { getLocalDateKey } from '../lib/tasks';
import { useTimer } from './TimerProvider';

export function StatsCards() {
  const { sessions } = useTimer();
  const todaySessions = useMemo(() => sessions.filter((session) => (
    getLocalDateKey(new Date(session.completedAt)) === getLocalDateKey()
  )), [sessions]);
  const focusMinutes = Math.round(todaySessions.reduce((total, session) => total + session.seconds, 0) / 60);

  return (
    <section className="stats-grid" id="stats" aria-label="Статистика за сегодня">
      <article className="stat-card stat-card--green"><span className="stat-card__icon" aria-hidden="true">♧</span><div><strong>{todaySessions.length}</strong><p>сессий сегодня</p></div></article>
      <article className="stat-card stat-card--blue"><span className="stat-card__icon" aria-hidden="true">◷</span><div><strong>{focusMinutes}</strong><p>минут в фокусе</p></div></article>
    </section>
  );
}
