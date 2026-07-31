import { Link } from 'wouter';
import { DashboardHeader } from '../components/DashboardHeader';
import { SupportChat } from '../components/SupportChat';

const FLOW_KEY = 'baw-today-flow-v1';

function loadTaskContext() {
  try {
    const saved = window.localStorage.getItem(FLOW_KEY);
    if (!saved) return { task: '', reason: '' };
    const value = JSON.parse(saved) as { task?: unknown; reason?: unknown };
    return {
      task: typeof value.task === 'string' ? value.task : '',
      reason: typeof value.reason === 'string' ? value.reason : '',
    };
  } catch {
    return { task: '', reason: '' };
  }
}

export function SupportPage() {
  const context = loadTaskContext();

  return (
    <div className="dashboard-page">
      <DashboardHeader />
      <main className="support-agent-shell">
        <header className="support-agent-heading">
          <span className="tasks-eyebrow">ИИ-напарник</span>
          <h1>Необязательно справляться в одиночку</h1>
          <p>Здесь можно выговориться, получить спокойную поддержку и выбрать один посильный старт.</p>
          {context.task && <div className="support-agent-context">
            <span>Сейчас в фокусе</span>
            <strong>{context.task}</strong>
          </div>}
        </header>
        <SupportChat task={context.task} reason={context.reason} />
        <p className="support-agent-note">
          ИИ может ошибаться и не заменяет помощь близкого человека или специалиста.
        </p>
        <Link className="support-agent-back" href="/">← Вернуться к задаче</Link>
      </main>
    </div>
  );
}
