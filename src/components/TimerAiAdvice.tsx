import { useEffect, useRef, useState } from 'react';
import { createSessionAdvice } from '../lib/ai';
import type { TimerSession } from '../lib/timer';

export function TimerAiAdvice({ sessions }: { sessions: TimerSession[] }) {
  const previousLatestId = useRef(sessions[0]?.id);
  const [advice, setAdvice] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const latest = sessions[0];
    if (!latest || latest.id === previousLatestId.current) return;
    previousLatestId.current = latest.id;
    setIsLoading(true);
    setError('');
    createSessionAdvice(latest).then(setAdvice).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Не получилось подготовить совет.');
    }).finally(() => setIsLoading(false));
  }, [sessions]);

  if (!isLoading && !advice && !error) return null;

  return (
    <section className="ai-insight" aria-live="polite">
      <span className="tasks-eyebrow">✦ Совет после фокуса</span>
      {isLoading ? <p>ИИ подбирает следующий шаг…</p> : <p>{advice}</p>}
      {error && <p className="ai-error" role="alert">{error}</p>}
    </section>
  );
}
