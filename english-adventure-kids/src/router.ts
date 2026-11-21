import { useEffect, useState } from 'react';

/** Minimal hash router: keeps the device back button inside the app. */
export type Route =
  | { name: 'home' }
  | { name: 'world'; worldId: string }
  | { name: 'stage'; stageId: string }
  | { name: 'review' }
  | { name: 'badges' }
  | { name: 'parent' };

/**
 * Hash format is a single plain name (`#world-w1`, `#stage-w1-s1`, `#review`),
 * which works both on normal hosting and inside embedded viewers that only
 * pass simple `#name` hashes. Older `#/stage/w1-s1` links are still accepted.
 */
export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '').replace(/\//g, '-');
  let m: RegExpMatchArray | null;
  if ((m = h.match(/^world-(w\d+)$/))) return { name: 'world', worldId: m[1] };
  if ((m = h.match(/^stage-(w\d+-s\d+)$/))) return { name: 'stage', stageId: m[1] };
  if (h === 'review' || h === 'badges' || h === 'parent') return { name: h };
  return { name: 'home' };
}

export function toHash(r: Route): string {
  switch (r.name) {
    case 'home': return '#home';
    case 'world': return `#world-${r.worldId}`;
    case 'stage': return `#stage-${r.stageId}`;
    default: return `#${r.name}`;
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
