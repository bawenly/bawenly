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
            <p className="eyebrow">Маленькие шаги. Большие перемены.</p>
            <h1 id="welcome-title">Сделай первый шаг.</h1>
            <p className="welcome-copy__lead">
              Начни с небольшой цели и преврати её в устойчивую привычку.
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
