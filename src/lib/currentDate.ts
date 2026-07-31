import { useEffect, useState } from 'react';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function formatCurrentDate() {
  const label = dateFormatter.format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function useCurrentDateLabel() {
  const [label, setLabel] = useState(formatCurrentDate);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setLabel(formatCurrentDate());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  return label;
}
