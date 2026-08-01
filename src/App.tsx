import { Redirect, Route, Switch } from 'wouter';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProgressPage } from './pages/ProgressPage';
import { TasksPage } from './pages/TasksPage';
import { WelcomePage } from './pages/WelcomePage';
import { AuthModalProvider } from './components/AuthModal';
import { TimerProvider } from './components/TimerProvider';
import { TimerPage } from './pages/TimerPage';
import { ProfileProvider } from './components/ProfileProvider';
import { SupportPage } from './pages/SupportPage';

export default function App() {
  return (
    <AuthModalProvider>
      <ProfileProvider>
        <TimerProvider>
          <Switch>
          <Route path="/">
            <Redirect to="/welcome" />
          </Route>
          <Route path="/step" component={HomePage} />
          <Route path="/welcome" component={WelcomePage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/tasks" component={TasksPage} />
          <Route path="/progress" component={ProgressPage} />
          <Route path="/timer" component={TimerPage} />
          <Route path="/support" component={SupportPage} />
          <Route component={NotFoundPage} />
          </Switch>
        </TimerProvider>
      </ProfileProvider>
    </AuthModalProvider>
  );
}
