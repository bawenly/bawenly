import { useEffect, useState } from 'react';
import { loadSupportPhrase } from '../lib/supportPhrase';

const placeholder = 'Даже две минуты — уже движение вперёд.';

type Props = { displayName?: string; profileReady: boolean };

export function DynamicSupportPhrase({ displayName, profileReady }: Props) {
  const [phrase, setPhrase] = useState(placeholder);

  useEffect(() => {
    if (!profileReady) return;
    let active = true;
    const request = window.setTimeout(() => {
      void loadSupportPhrase(displayName).then((nextPhrase) => {
        if (active) setPhrase(nextPhrase);
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(request);
    };
  }, [displayName, profileReady]);

  return <p>{phrase}</p>;
}
