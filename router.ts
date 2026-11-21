import { useEffect, useState } from 'react';

export interface Route {
  path: string;
  segments: string[];
  query: URLSearchParams;
}

function readRoute(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, search = ''] = raw.split('?');
  const segments = path.split('/').filter(Boolean);
  return { path: segments.length ? `/${segments.join('/')}` : '/', segments, query: new URLSearchParams(search) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function navigate(to: string): void {
  window.location.hash = to;
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}
