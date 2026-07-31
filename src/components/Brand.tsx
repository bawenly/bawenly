import { Link } from 'wouter';

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="FlowStep — на главную">
      <img
        className="brand__logo"
        src="/assets/rost-dynamic-transparent.png"
        alt="Логотип приложения FlowStep"
      />
      <span className="brand__name">FlowStep</span>
    </Link>
  );
}
