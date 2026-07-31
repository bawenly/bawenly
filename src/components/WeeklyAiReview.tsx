import { useMemo, useState } from 'react';
import { createWeeklyReview } from '../lib/ai';
import type { TimerSession } from '../lib/timer';

export function WeeklyAiReview({ sessions }: { sessions: TimerSession[] }) {
  const [review, setReview] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const recentSessions = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return sessions.filter((session) => new Date(session.completedAt).getTime() >= weekAgo);
  }, [sessions]);

  async function loadReview() {
    setIsLoading(true);
    setError('');
    try {
      setReview(await createWeeklyReview(recentSessions));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не получилось подготовить разбор.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="ai-insight ai-insight--weekly">
      <span className="tasks-eyebrow">✦ Разбор с ИИ</span>
      <h2>Твоя неделя фокуса</h2>
      {recentSessions.length === 0
        ? <p>Сначала заверши хотя бы одну сессию — тогда ИИ сможет заметить твой ритм.</p>
        : review
          ? <p>{review}</p>
          : <p>ИИ посмотрит только длительность и названия твоих сессий за последние 7 дней.</p>}
      {error && <p className="ai-error" role="alert">{error}</p>}
      {recentSessions.length > 0 && (
        <button type="button" disabled={isLoading} onClick={() => void loadReview()}>
          {isLoading ? 'Анализирую…' : review ? 'Обновить разбор' : 'Получить разбор'}
        </button>
      )}
    </section>
  );
}
