import { useEffect, useState } from 'react';
import { useProfile } from './ProfileProvider';
import { SupportPanel } from './SupportPanel';
import { TaskFlow } from './TaskFlow';
import type { ActiveStepSupport } from './StepSupportPanel';
import type { TodayPlan } from '../lib/taskFlowStorage';
import type { FlowStage } from '../pages/HomePage';

type Props = {
  plan: TodayPlan;
  isLoading: boolean;
  stage: Exclude<FlowStage, 'task'>;
  error?: string;
  onReasonSelect: (reason: string) => void;
  onRetry: () => void;
  onBack: () => void;
  onClose: () => void;
};

export function TaskWorkspace({ plan, stage, isLoading, error, onReasonSelect, onRetry, onBack, onClose }: Props) {
  const [reason, setReason] = useState(plan.reason);
  const [stepSupport, setStepSupport] = useState<ActiveStepSupport | null>(null);
  const { profile, loading } = useProfile();

  useEffect(() => setReason(plan.reason), [plan.reason]);

  return (
    <main className="dashboard-shell">
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <TaskFlow stage={stage} task={plan.taskTitle} taskDraft="" reason={reason || plan.reason}
            workspace="tasks" onCloseWorkspace={onClose}
            onBackWorkspace={onBack}
            externalPlan={plan} externalPlanLoading={isLoading}
            externalError={error} onRetryPlan={onRetry}
            onTaskDraftChange={() => undefined} onTaskSubmit={() => Promise.resolve()}
            onStageChange={() => undefined} onResetFlow={() => undefined}
            onStepSupportChange={setStepSupport} />
        </div>
        <SupportPanel stage={stage} displayName={profile?.displayName} profileReady={!loading}
          selectedReason={reason || plan.reason} stepSupport={stepSupport}
          onReasonChange={setReason} onReasonSelect={(value) => { setReason(value); onReasonSelect(value); }} />
      </div>
    </main>
  );
}
