import { DashboardHeader } from '../components/DashboardHeader';
import { StatsCards } from '../components/StatsCards';
import { TimerCard } from '../components/TimerCard';
import { WeeklyAiReview } from '../components/WeeklyAiReview';
import { useTimer } from '../components/TimerProvider';

export function ProgressPage() {
  const { sessions } = useTimer();
  return (
    <div className="dashboard-page">
      <DashboardHeader />
      <main className="dashboard-shell">
        <div className="dashboard-main">
          <StatsCards />
          <TimerCard />
          <WeeklyAiReview sessions={sessions} />
        </div>
      </main>
    </div>
  );
}
