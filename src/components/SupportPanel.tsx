import { FormEvent } from 'react';
import type { FlowStage } from '../pages/HomePage';
import { SproutArt } from './SproutArt';
import { DynamicSupportPhrase } from './DynamicSupportPhrase';

const reasons = [
  ['?', 'Не знаю, с чего начать'],
  ['▦', 'Задача слишком большая'],
  ['⌁', 'Боюсь сделать плохо'],
  ['▤', 'Нет сил'],
] as const;

type Props = {
  stage: FlowStage;
  displayName?: string;
  profileReady: boolean;
  selectedReason: string;
  onReasonChange: (reason: string) => void;
  onReasonSelect: (reason: string) => void;
};

export function SupportPanel({
  stage, displayName, profileReady, selectedReason, onReasonChange, onReasonSelect,
}: Props) {
  const isPresetReason = reasons.some(([, label]) => label === selectedReason);
  const customReason = isPresetReason ? '' : selectedReason;

  function submitCustomReason(event: FormEvent) {
    event.preventDefault();
    const reason = customReason.trim();
    if (reason) onReasonSelect(reason);
  }

  if (stage === 'task') {
    return (
      <aside className="support-card support-card--welcome">
        <SproutArt compact />
        <div className="support-note"><span aria-hidden="true">✦</span><DynamicSupportPhrase
          displayName={displayName} profileReady={profileReady} /></div>
      </aside>
    );
  }

  if (stage === 'step') {
    return (
      <aside className="support-card support-card--done" aria-live="polite">
        <div className="done-mark" aria-hidden="true">✓</div>
        <p className="eyebrow">Можно не спешить</p>
        <h2>Ты уже сделал самое трудное — начал.</h2>
        <p>Один понятный шаг лучше идеального плана, который ждёт своего часа.</p>
      </aside>
    );
  }

  return (
    <aside className="support-card support-card--reasons" aria-labelledby="reason-title">
      <h2 id="reason-title">Что мешает начать?</h2>
      <p>Выбери то, что ближе сейчас.</p>
      <div className="reason-list">
        {reasons.map(([icon, label]) => (
          <button
            className={selectedReason === label ? 'reason-option reason-option--selected' : 'reason-option'}
            type="button"
            key={label}
            onClick={() => {
              onReasonChange(label);
              window.setTimeout(() => onReasonSelect(label), 220);
            }}
            aria-pressed={selectedReason === label}
          >
            <span className="reason-option__icon" aria-hidden="true">{icon}</span>
            <span>{label}</span><span aria-hidden="true">→</span>
          </button>
        ))}
        <form className={customReason.trim() ? 'reason-option reason-option--custom reason-option--selected' : 'reason-option reason-option--custom'}
          onSubmit={submitCustomReason}>
          <span className="reason-option__icon" aria-hidden="true">✎</span>
          <label className="sr-only" htmlFor="custom-reason">Своя причина прокрастинации</label>
          <input id="custom-reason" value={customReason} placeholder="Определить самому"
            onChange={(event) => onReasonChange(event.target.value)} />
          <button type="submit" aria-label="Выбрать свою причину" disabled={!customReason.trim()}>→</button>
        </form>
      </div>
    </aside>
  );
}
