import { useEffect, useState } from 'react';

const QUERY = '(min-width: 768px)';

/** True on tablets / wide screens — used to scale characters up. */
export function useIsWide(): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches;
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return;
    const onChange = () => setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
}
