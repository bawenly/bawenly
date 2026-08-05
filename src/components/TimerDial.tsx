import { useEffect, useRef } from 'react';
import { BREAK_SECONDS, FOCUS_SECONDS, LONG_BREAK_SECONDS, formatTimer, type TimerState } from '../lib/timer';

type Props = { state: TimerState; displaySeconds: number };
const RADIUS = 44;
const FREE_PERIOD_SECONDS = 30 * 60;

function getPeriodDuration(state: TimerState) {
  if (state.mode === 'free') return FREE_PERIOD_SECONDS;
  if (state.phase === 'work') return state.targetSeconds ?? FOCUS_SECONDS;
  return state.focusRound % 4 === 0 ? LONG_BREAK_SECONDS : BREAK_SECONDS;
}

export function TimerDial({ state, displaySeconds }: Props) {
  const progressRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const durationMs = getPeriodDuration(state) * 1000;
    let animationFrame: number | null = null;

    const draw = () => {
      const runningMs = state.isRunning && state.startedAt ? Math.max(0, Date.now() - state.startedAt) : 0;
      const totalElapsedMs = state.accumulatedSeconds * 1000 + runningMs;
      const elapsedMs = state.mode === 'free' ? totalElapsedMs % durationMs : totalElapsedMs;
      const progress = Math.min(1, elapsedMs / durationMs);
      progressRef.current?.style.setProperty('stroke-dashoffset', String(100 * (1 - progress)));
      if (state.isRunning && (state.mode === 'free' || progress < 1)) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [state.accumulatedSeconds, state.focusRound, state.isRunning, state.mode, state.phase, state.startedAt, state.targetSeconds]);

  return (
    <div className="focus-timer-dial" role="timer" aria-label="Время таймера">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="focus-timer-dial__track" cx="50" cy="50" r={RADIUS} pathLength="100" />
        <circle className="focus-timer-dial__progress" cx="50" cy="50" r={RADIUS} ref={progressRef}
          pathLength="100" style={{ strokeDasharray: 100, strokeDashoffset: 100 }} />
      </svg>
      <strong aria-live="polite">{formatTimer(displaySeconds)}</strong>
    </div>
  );
}
