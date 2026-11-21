import { useEffect, useState } from 'react';

/** Minimal hash router: keeps the device back button inside the app. */
export type Route =
  | { name: 'home' }
  | { name: 'world'; worldId: string }
  | { name: 'stage'; stageId: string }
  | { name: 'review' }
  | { name: 'badges' }
  | { name: 'parent' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'world': return parts[1] ? { name: 'world', worldId: parts[1] } : { name: 'home' };
    case 'stage': return parts[1] ? { name: 'stage', stageId: parts[1] } : { name: 'home' };
    case 'review': return { name: 'review' };
    case 'badges': return { name: 'badges' };
    case 'parent': return { name: 'parent' };
    default: return { name: 'home' };
  }
}

export function toHash(r: Route): string {
  switch (r.name) {
    case 'home': return '#/';
    case 'world': return `#/world/${r.worldId}`;
    case 'stage': return `#/stage/${r.stageId}`;
    default: return `#/${r.name}`;
  }
}

export function navigate(r: Route, replace = false) {
  const h = toHash(r);
  if (replace) history.replaceState(null, '', h);
  else location.hash = h;
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
