import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardHeader } from '../components/DashboardHeader';
import { SupportPanel } from '../components/SupportPanel';
import { TaskFlow } from '../components/TaskFlow';
import { useProfile } from '../components/ProfileProvider';
import { useCurrentDateLabel } from '../lib/currentDate';
import type { ActiveStepSupport } from '../components/StepSupportPanel';

export type FlowStage = 'task' | 'reason' | 'step';

type StoredPlan = { taskTitle: string; reason: string };
type StoredFlow = { stage: FlowStage; taskDraft: string; task: string; reason: string };
const FLOW_STORAGE_KEY = 'baw-today-flow-v2';

function loadStoredPlan(): StoredPlan | null {
  try {
    const stored = window.localStorage.getItem('baw-today-plan-v1');
    return stored ? JSON.parse(stored) as StoredPlan : null;
  } catch {
    return null;
  }
}

function loadStoredFlow(): StoredFlow | null {
  try {
    const stored = window.localStorage.getItem(FLOW_STORAGE_KEY);
    return stored ? JSON.parse(stored) as StoredFlow : null;
  } catch {
    return null;
  }
}

export function HomePage() {
  const [, setLocation] = useLocation();
  const restored = useRef(loadStoredFlow()).current;
  const legacyPlan = useRef(loadStoredPlan()).current;
  const [stage, setStage] = useState<FlowStage>(() => restored?.stage ?? (legacyPlan ? 'step' : 'task'));
  const [taskDraft, setTaskDraft] = useState(() => restored?.taskDraft ?? '');
  const [task, setTask] = useState(() => restored?.task ?? legacyPlan?.taskTitle ?? '');
  const [reason, setReason] = useState(() => restored?.reason ?? legacyPlan?.reason ?? '');
  const [stepSupport, setStepSupport] = useState<ActiveStepSupport | null>(null);
  const { profile, loading: profileLoading } = useProfile();
  const currentDateLabel = useCurrentDateLabel();
  const greeting = profile?.displayName ? `Доброе утро, ${profile.displayName}` : 'Доброе утро';
  const visibleStage = stage;

  useEffect(() => {
    window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify({ stage, taskDraft, task, reason }));
  }, [reason, stage, task, taskDraft]);

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
            <TaskFlow stage={visibleStage} task={task} taskDraft={taskDraft} reason={reason}
              onStageChange={(nextStage) => {
                setStage(nextStage);
                if (nextStage !== 'task') setLocation('/step');
              }}
              onTaskDraftChange={setTaskDraft}
              onStepSupportChange={setStepSupport}
              onTaskSubmit={(nextTask) => {
                setTask(nextTask);
                setTaskDraft('');
              }}
              onResetFlow={() => {
                window.localStorage.removeItem(FLOW_STORAGE_KEY);
                setStage('task');
                setTaskDraft('');
                setTask('');
                setReason('');
              }} />
          </div>
          <SupportPanel stage={visibleStage} displayName={profile?.displayName} profileReady={!profileLoading}
            selectedReason={reason}
            stepSupport={stepSupport}
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
