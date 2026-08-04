import { useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardHeader } from '../components/DashboardHeader';
import { SupportPanel } from '../components/SupportPanel';
import { TaskFlow } from '../components/TaskFlow';
import { useProfile } from '../components/ProfileProvider';
import { useCurrentDateLabel } from '../lib/currentDate';
import type { ActiveStepSupport } from '../components/StepSupportPanel';
import { ACTIVE_TASK_FLOW_KEY, ACTIVE_TASK_ORIGIN_KEY, FLOW_STORAGE_KEY } from '../lib/taskFlowStorage';
import { createTask } from '../lib/taskRepository';
import { getLocalDateKey, type Task } from '../lib/tasks';

export type FlowStage = 'task' | 'reason' | 'step';

export function HomePage() {
  const [, setLocation] = useLocation();
  const [taskDraft, setTaskDraft] = useState('');
  const [reason, setReason] = useState('');
  const [stepSupport, setStepSupport] = useState<ActiveStepSupport | null>(null);
  const { profile, loading: profileLoading } = useProfile();
  const currentDateLabel = useCurrentDateLabel();
  const greeting = profile?.displayName ? `Доброе утро, ${profile.displayName}` : 'Доброе утро';
  const visibleStage: FlowStage = 'task';

  return (
    <div className="dashboard-page dashboard-page--today">
      <DashboardHeader />
      <main className="dashboard-shell">
        <section className="dashboard-intro" aria-labelledby="dashboard-title">
          <p className="dashboard-intro__date">{currentDateLabel}</p>
          <h1 className="cormorant-heading cormorant-heading--prominent" id="dashboard-title">{greeting}</h1>
          <p>Не нужно делать всё. Достаточно начать.</p>
        </section>

        <div className="dashboard-grid">
          <div className="dashboard-main">
            <TaskFlow stage={visibleStage} task="" taskDraft={taskDraft} reason={reason}
              onStageChange={() => undefined}
              onTaskDraftChange={setTaskDraft}
              onStepSupportChange={setStepSupport}
              onTaskSubmit={async (title) => {
                const nextTask: Task = {
                  id: crypto.randomUUID(), title, status: 'not_started',
                  dueDate: getLocalDateKey(), procrastinationReason: reason.trim(),
                };
                await createTask(nextTask);
                window.localStorage.setItem(ACTIVE_TASK_FLOW_KEY, nextTask.id);
                window.localStorage.setItem(ACTIVE_TASK_ORIGIN_KEY, 'today');
                window.localStorage.removeItem(FLOW_STORAGE_KEY);
                setTaskDraft('');
                setReason('');
                setLocation(`/tasks/${nextTask.id}`);
              }}
              onResetFlow={() => {
                window.localStorage.removeItem(FLOW_STORAGE_KEY);
                setTaskDraft('');
                setReason('');
              }} />
          </div>
          <SupportPanel stage={visibleStage} displayName={profile?.displayName} profileReady={!profileLoading}
            selectedReason={reason}
            stepSupport={stepSupport}
            onReasonChange={setReason}
            onReasonSelect={setReason} />
        </div>
      </main>
    </div>
  );
}
