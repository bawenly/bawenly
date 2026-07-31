import { useMemo } from 'react';
import { DashboardHeader } from '../components/DashboardHeader';
import { TimerHistory } from '../components/TimerHistory';
import { TimerAiAdvice } from '../components/TimerAiAdvice';
import { useTimer } from '../components/TimerProvider';
import { loadStoredTasks } from '../lib/tasks';
import { formatTimer, type TimerMode } from '../lib/timer';

export function TimerPage() {
  const timer = useTimer();
  const tasks = useMemo(() => loadStoredTasks().filter((task) => task.status !== 'done'), []);

  function handleTaskChange(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    timer.selectTask(task?.id ?? '', task?.title ?? '');
  }

  return (
    <div className="dashboard-page">
      <DashboardHeader />
      <main className="timer-shell">
        <header className="timer-page-heading">
          <span className="tasks-eyebrow">Таймер</span>
          <h1>Сосредоточься на одном шаге</h1>
          <p>Выбери свободный отсчёт или спокойный ритм 25/5.</p>
        </header>

        <section className="timer-card" aria-label="Настройки и управление таймером">
          <div className="timer-mode-switch" role="group" aria-label="Режим таймера">
            {([['free', 'Свободный'], ['focus', 'Фокус 25/5']] as [TimerMode, string][]).map(([mode, label]) => (
              <button className={timer.state.mode === mode ? 'is-active' : ''} type="button" key={mode}
                onClick={() => timer.setMode(mode)}>{label}</button>
            ))}
          </div>
          <label className="timer-task-select">
            <span>Задача</span>
            <select value={timer.state.taskId} onChange={(event) => handleTaskChange(event.target.value)}>
              <option value="">Выбрать задачу</option>
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          </label>
          <div className="timer-stage">
            {timer.state.stepTitle && <h2>{timer.state.stepTitle}</h2>}
            {timer.state.targetSeconds && (
              <p>Рассчитанное время: ≈ {Math.round(timer.state.targetSeconds / 60)} мин</p>
            )}
            <span>{timer.state.mode === 'focus'
              ? `${timer.state.phase === 'work' ? 'Фокус' : 'Отдых'} · цикл ${((timer.state.focusRound - 1) % 4) + 1} из 4`
              : 'Свободный отсчёт'}</span>
            <strong aria-live="polite">{formatTimer(timer.displaySeconds)}</strong>
            <p>{timer.state.mode === 'focus'
              ? timer.state.phase === 'work'
                ? `После этого — ${timer.state.focusRound % 4 === 0 ? '15' : '5'} минут отдыха`
                : 'Восстановись перед следующим шагом'
              : 'Время будет считаться, пока ты работаешь над задачей'}</p>
          </div>
          <div className="timer-actions">
            <button className="timer-actions__primary" type="button" disabled={!timer.state.taskTitle} onClick={timer.toggle}>
              {timer.state.isRunning ? 'Пауза' : timer.elapsedSeconds > 0 ? 'Продолжить' : 'Начать'}
            </button>
            {timer.elapsedSeconds > 0 && <button type="button" onClick={timer.reset}>Сбросить</button>}
          </div>
        </section>
        <TimerAiAdvice sessions={timer.sessions} />
        <TimerHistory sessions={timer.sessions} />
      </main>
    </div>
  );
}
