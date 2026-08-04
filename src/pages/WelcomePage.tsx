import { Link } from 'wouter';
import { Brand } from '../components/Brand';
import { SproutArt } from '../components/SproutArt';
import { completeWelcome } from '../lib/welcome';

export function WelcomePage() {
  return (
    <main className="welcome-page">
      <div className="shell welcome-page__shell">
        <Brand />
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <h1 id="welcome-title">Сделай первый шаг.</h1>
            <p className="welcome-copy__lead">
              Разбивай сложные задачи на понятные шаги и начинай без лишнего стресса.
            </p>
            <Link className="primary-button" href="/" onClick={completeWelcome}>
              Начать <span aria-hidden="true">→</span>
            </Link>
          </div>
          <SproutArt />
        </section>
      </div>
    </main>
  );
}
