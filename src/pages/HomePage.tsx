import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardHeader } from '../components/DashboardHeader';
import { SupportPanel } from '../components/SupportPanel';
import { TaskFlow } from '../components/TaskFlow';
import { useProfile } from '../components/ProfileProvider';
import { useCurrentDateLabel } from '../lib/currentDate';

export type FlowStage = 'task' | 'reason' | 'step';
const TODAY_FLOW_KEY = 'baw-today-flow-v1';

function loadTodayFlow() {
  try {
    const saved = window.localStorage.getItem(TODAY_FLOW_KEY);
    return saved ? JSON.parse(saved) as { stage: FlowStage; task: string; reason: string }
      : { stage: 'task' as const, task: '', reason: '' };
  } catch {
    return { stage: 'task' as const, task: '', reason: '' };
  }
}

export function HomePage() {
  const [location, setLocation] = useLocation();
  const [savedFlow] = useState(loadTodayFlow);
  const [stage, setStage] = useState<FlowStage>(savedFlow.stage);
  const [task, setTask] = useState(savedFlow.task);
  const [reason, setReason] = useState(savedFlow.reason);
  const { profile, loading: profileLoading } = useProfile();
  const currentDateLabel = useCurrentDateLabel();
  const greeting = profile?.displayName ? `Доброе утро, ${profile.displayName}` : 'Доброе утро';
  const visibleStage = location === '/step' ? stage : 'task';

  useEffect(() => {
    window.localStorage.setItem(TODAY_FLOW_KEY, JSON.stringify({ stage, task, reason }));
  }, [reason, stage, task]);

  return (
    <div className="dashboard-page dashboard-page--today">
      <DashboardHeader />
      <main className="dashboard-shell">
        <section className="dashboard-intro" aria-labelledby="dashboard-title">
          <p className="dashboard-intro__date">{currentDateLabel}</p>
          <h1 id="dashboard-title">{greeting}</h1>
          <p>Не нужно делать всё. Достаточно начать.</p>
        </section>

        <div className="dashboard-grid">
          <div className="dashboard-main">
            <TaskFlow stage={visibleStage} task={task} reason={reason}
              onStageChange={(nextStage) => {
                setStage(nextStage);
                if (nextStage !== 'task') setLocation('/step');
              }}
              onTaskChange={setTask}
              onResetFlow={() => {
                setStage('task');
                setTask('');
                setReason('');
              }} />
          </div>
          <SupportPanel stage={visibleStage} displayName={profile?.displayName} profileReady={!profileLoading}
            selectedReason={reason}
            onReasonChange={setReason}
            onReasonSelect={(value) => {
            setReason(value.trim());
            setStage('step');
            setLocation('/step');
          }} />
        </div>
      </main>
    </div>
  );
}
